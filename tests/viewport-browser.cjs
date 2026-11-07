'use strict';
// Real-browser responsive smoke test using Node 22 WebSocket + Chrome DevTools Protocol.
// No npm packages or external URLs are needed.
const assert=require('node:assert/strict');
const {spawn,spawnSync}=require('node:child_process');
const fs=require('node:fs'),path=require('node:path'),os=require('node:os');
const http=require('node:http'),net=require('node:net');
const root=path.resolve(__dirname,'..'),sleep=ms=>new Promise(r=>setTimeout(r,ms));
const getPort=()=>new Promise((ok,fail)=>{const s=net.createServer();s.once('error',fail);s.listen(0,'127.0.0.1',()=>{const p=s.address().port;s.close(()=>ok(p))})});
function chromeBinary(){
 for(const bin of [process.env.CHROME_BIN,'google-chrome','google-chrome-stable','chromium','chromium-browser'].filter(Boolean)){
  if(path.isAbsolute(bin)&&fs.existsSync(bin))return bin;
  const r=spawnSync('which',[bin],{encoding:'utf8'});if(r.status===0)return r.stdout.trim();
 }
 throw Error('Chrome not found on this runner');
}
function webServer(){
 const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.svg':'image/svg+xml','.png':'image/png','.gif':'image/gif','.webmanifest':'application/manifest+json'};
 return http.createServer((req,res)=>{
  let name;try{name=decodeURIComponent(new URL(req.url,'http://localhost').pathname)}catch{res.writeHead(400).end();return}
  const file=path.resolve(root,'.'+(name==='/'?'/index.html':name));
  if(!file.startsWith(root+path.sep)){res.writeHead(403).end();return}
  fs.stat(file,(e,stat)=>{
   if(e||!stat.isFile()){res.writeHead(404).end();return}
   res.setHeader('Content-Type',mime[path.extname(file)]||'application/octet-stream');
   fs.createReadStream(file).pipe(res);
  });
 });
}
async function cdpConnect(tab){
 const ws=new WebSocket(tab.webSocketDebuggerUrl),pending=new Map();let seq=0;
 await new Promise((ok,fail)=>{ws.onopen=ok;ws.onerror=fail});
 ws.onmessage=e=>{const msg=JSON.parse(e.data);const fn=pending.get(msg.id);if(fn){pending.delete(msg.id);fn(msg)}};
 return {
  async send(method,params={}){
   const id=++seq;
   return new Promise((ok,fail)=>{
    const timer=setTimeout(()=>{pending.delete(id);fail(Error('CDP timeout '+method))},15000);
    pending.set(id,msg=>{clearTimeout(timer);if(msg.error)fail(Error(method+': '+JSON.stringify(msg.error)));else ok(msg.result)});
    ws.send(JSON.stringify({id,method,params}));
   });
  },
  close(){ws.close()}
 };
}
async function run(){
 const server=webServer();await new Promise(ok=>server.listen(0,'127.0.0.1',ok));
 const port=server.address().port,debugPort=await getPort(),profile=fs.mkdtempSync(path.join(os.tmpdir(),'fr-browser-'));
 const chrome=spawn(chromeBinary(),['--headless=new','--no-sandbox','--disable-dev-shm-usage','--no-first-run','--disable-background-networking',
  '--remote-debugging-port='+debugPort,'--remote-allow-origins=*','--user-data-dir='+profile,'about:blank'],{stdio:'ignore',detached:true});
 let cdp;
 try{
  let tab;
  for(let i=0;i<100;i++){
   try{const res=await fetch('http://127.0.0.1:'+debugPort+'/json/list');tab=(await res.json()).find(t=>t.type==='page');if(tab)break}catch{}
   await sleep(150);
  }
  assert.ok(tab,'Chrome debugging did not start');
  cdp=await cdpConnect(tab);
  await cdp.send('Page.enable');
  await cdp.send('Runtime.enable');
  await cdp.send('Network.setBypassServiceWorker',{bypass:true});
  await cdp.send('Network.setCacheDisabled',{cacheDisabled:true});
  async function evaluate(expr){
   const r=await cdp.send('Runtime.evaluate',{expression:expr,returnByValue:true,awaitPromise:true});
   if(r.exceptionDetails)throw Error('JS '+r.exceptionDetails.text);
   return r.result.value;
  }
  const cases=[
   ['phone portrait',390,844,true],['phone landscape',852,393,true],
   ['tablet portrait',820,1180,true],['tablet landscape',1024,768,true],
   ['desktop laptop',1366,768,false],['desktop short',1366,600,false],
   ['desktop wide',1920,1080,false]
  ];
  for(const [label,width,height,mobile] of cases){
   await cdp.send('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile});
   await cdp.send('Emulation.setTouchEmulationEnabled',{enabled:mobile});
   await cdp.send('Page.navigate',{url:'http://127.0.0.1:'+port+'/#/anasayfa'});
   let ready=false;
   for(let i=0;i<100;i++){
    try{ready=await evaluate('document.readyState==="complete"&&!!window.FormaRotaRouteMap&&!!document.getElementById("homePanel")');if(ready)break}catch{}
    await sleep(120);
   }
   assert.ok(ready,label+' failed to initialize app');
   const splash=await evaluate('(()=>{const q=document.getElementById("frLaunchQuote"),r=q.getBoundingClientRect(),icon=document.querySelector(".fr-launch-icon");return {text:q.textContent,x:r.x,right:r.right,icon:icon.getBoundingClientRect().width,skip:!!document.getElementById("frLaunchSkip")}})()');
   assert.ok(splash.text.length>12&&splash.icon>50,label+' splash is incomplete');
   assert.equal(splash.skip,false,label+' skip button returned');
   assert.ok(splash.x>=-2&&splash.right<=width+2,label+' splash quote clipped '+JSON.stringify(splash));
   const home=await evaluate('(()=>{const a=document.getElementById("homePanel").getBoundingClientRect(),b=document.getElementById("frRouteHome").getBoundingClientRect();return {doc:document.documentElement.scrollWidth,body:document.body.scrollWidth,panel:[a.x,a.right],teaser:[b.x,b.right]}})()');
   assert.ok(home.doc<=width+5&&home.body<=width+5,label+' home overflow '+JSON.stringify(home));
   if(!label.startsWith('phone')){
    assert.ok(Math.abs(home.panel[0]-home.teaser[0])<=5&&Math.abs(home.panel[1]-home.teaser[1])<=5,
     label+' route teaser should span both home columns '+JSON.stringify(home));
   }
   await evaluate('document.getElementById("fr-launch").classList.add("fr-launch-done");showView("progress",false,false);window.FormaRotaRouteMap.render();true');
   // Allow the existing 340 ms route-entry animation to settle before measuring scrollWidth.
   await sleep(500);
   const map=await evaluate("(()=>{\n const box=document.getElementById('frRouteMap'),svg=box.querySelector('svg'),ctm=svg.getScreenCTM();\n const distances=window.FormaRotaRouteMap.STAGES.map((stage,i)=>{\n  const point=svg.createSVGPoint();point.x=stage.x*4;point.y=stage.y*4.2;\n  const projected=point.matrixTransform(ctm);\n  const pin=box.querySelector('.fr-route-pin[data-route-index=\"'+i+'\"]');\n  const r=pin.getBoundingClientRect();\n  return Math.hypot(projected.x-r.x-r.width/2,projected.y-r.y-r.height/2);\n });\n const r=box.getBoundingClientRect(),layout=box.closest('.fr-route-layout');\n const overflowElements=[...document.querySelectorAll('main *')].filter(n=>{\n  const style=getComputedStyle(n),rect=n.getBoundingClientRect();\n  return style.display!=='none'&&rect.width>0&&(rect.right>innerWidth+5||rect.left< -5);\n }).slice(0,20).map(n=>{\n  const rect=n.getBoundingClientRect();\n  return {tag:n.tagName,id:n.id,cls:String(n.className).slice(0,70),\n    left:Math.round(rect.left),right:Math.round(rect.right),width:Math.round(rect.width)};\n });\n return {width:r.width,height:r.height,ratio:box.clientWidth/box.clientHeight,\n  distances,cols:getComputedStyle(layout).gridTemplateColumns,\n  doc:document.documentElement.scrollWidth,overflowElements};\n})()");
   assert.ok(map.width>200&&map.height>240,label+' map too small '+JSON.stringify(map));
   assert.ok(Math.abs(map.ratio-400/420)<.025,label+' SVG aspect ratio distorted '+JSON.stringify(map));
   assert.ok(Math.max(...map.distances)<6,label+' pins drift from road '+JSON.stringify(map));
   assert.ok(map.doc<=width+5,label+' progress overflow '+JSON.stringify(map));
   if(label==='tablet portrait')assert.equal(map.cols.trim().split(/\s+/).length,1,'tablet portrait should stack the route map');
   const homeView=await evaluate("(()=>{showView('fitness',false,false);window.FormaRotaABS.choose('home');const p=document.getElementById('homeCalPanel');return {program:document.documentElement.dataset.workoutProgram,visible:getComputedStyle(p).display!=='none',moves:p.querySelectorAll('.home-cal-move').length,soloHidden:getComputedStyle(document.getElementById('absWorkoutPanel')).display==='none',gymHidden:getComputedStyle(document.getElementById('fitExercisePanel')).display==='none',overflow:document.documentElement.scrollWidth}})()");
   // Reproduce the actual user journey: Settings -> Fitness -> click the Home tab.
   // Programmatic choose('home') alone can miss stale click handlers.
   const clicks=await evaluate("(()=>{showView('settings',false,false);const nav=document.querySelector('[data-tab=fitness]')||document.querySelector('[data-go=fitness]');if(!nav)return {error:'missing fitness nav'};nav.click();const btn=document.querySelector('[data-workout-choice=home]');btn.click();const panel=document.getElementById('homeCalPanel');const first={mode:document.documentElement.dataset.workoutProgram,pressed:btn.getAttribute('aria-pressed'),rootVisible:getComputedStyle(document.getElementById('fitnessRoot')).display!=='none',panelVisible:getComputedStyle(panel).display!=='none',count:panel.querySelectorAll('.home-cal-move').length};showView('settings',false,false);nav.click();return {...first,returned:getComputedStyle(panel).display!=='none',persisted:localStorage.getItem('formarota-workout-choice-v1')}})()");
   assert.equal(clicks.mode,'home',label+' Home click must activate mode '+JSON.stringify(clicks));
   assert.equal(clicks.pressed,'true',label+' Home pill should be selected');
   assert.equal(clicks.rootVisible,true,label+' Fitness page should be visible');
   assert.equal(clicks.panelVisible,true,label+' Home panel must be visible on click');
   assert.equal(clicks.returned,true,label+' Home panel must survive Settings roundtrip');
   assert.equal(clicks.persisted,'home',label+' Home selection must persist');
   assert.equal(clicks.count,13,label+' Home cards must render on click');
   const colorBurst=await evaluate("(()=>{const sel=document.getElementById('themeSelect');const cases=['oled-cyberpop','oled-aurora','oled-ultraviolet'].map(id=>{sel.value=id;sel.dispatchEvent(new Event('change',{bubbles:true}));const v=getComputedStyle(document.documentElement);return{id,selected:document.documentElement.dataset.theme,accent:v.getPropertyValue('--accent').trim(),ink:v.getPropertyValue('--text').trim(),themeMeta:document.querySelector('meta[name=theme-color]').content}});sel.value='oled-black';sel.dispatchEvent(new Event('change',{bubbles:true}));return cases})()");
   for(const item of colorBurst){assert.equal(item.selected,item.id,label+' selected theme '+item.id);
    assert.match(item.accent,/^#[0-9a-f]{6}$/i);assert.match(item.ink,/^#[0-9a-f]{6}$/i);
    assert.equal(item.themeMeta,'#000000',label+' OLED browser chrome');}
   assert.equal(homeView.program,'home',label+' home workout selector');
   assert.equal(homeView.visible,true,label+' home workout panel visible');
   assert.equal(homeView.moves,13,label+' ten strength + three core');
   assert.equal(homeView.soloHidden,true,label+' Solo ABS should remain separate');
   assert.equal(homeView.gymHidden,true,label+' gym workout should remain separate');
   assert.ok(homeView.overflow<=width+5,label+' home tracker overflow '+JSON.stringify(homeView));
   if(label==='desktop wide'){
    const form=await evaluate("(()=>{\n showView('fitness',false,false);\n window.FormaRotaABS.choose('abs');\n const toggle=document.getElementById('absManualToggle');\n toggle.click();\n const panel=document.getElementById('absManualPanel');\n const visible=!panel.hidden&&getComputedStyle(panel).display!=='none';\n const values={\n  'floor-crunch':[12,12,12],\n  'reverse-crunch':[12,11,10],\n  'heel-touch':[20,20,20],\n  'plank':[42,40,35]\n };\n document.getElementById('absManual-floor-crunch-0').value='12';\n panel.querySelector('.abs-manual-copy').click();\n for(const [move,sets] of Object.entries(values)){\n  sets.forEach((n,i)=>{\n   if(move==='floor-crunch'&&i>0)return;\n   document.getElementById('absManual-'+move+'-'+i).value=String(n);\n  });\n }\n const count=panel.querySelectorAll('input[type=\"number\"]').length;\n window.confirm=()=>true;\n document.getElementById('absManualForm').requestSubmit();\n const history=JSON.parse(localStorage.getItem('formarota-abs-history-v1')||'[]');\n const saved=history[0];\n const archive=document.getElementById('absHistory').textContent;\n const completed=window.FormaRotaABSEngine.finished(saved);\n const beforeDup=history.length;\n document.getElementById('absManualForm').dispatchEvent(new Event('submit',{bubbles:true,cancelable:true}));\n const afterDup=JSON.parse(localStorage.getItem('formarota-abs-history-v1')||'[]').length;\n return {visible,count,completed,backfilled:saved?.recordedAfterWorkout,\n  archived:archive.includes('Sonradan kaydedildi'),\n  beforeDup,afterDup,plank:saved?.items?.plank?.map(x=>x.seconds),\n  mapDays:window.FormaRotaRouteMap.currentSnapshot().days,\n  active:localStorage.getItem('formarota-abs-current-v1')};\n})()");
    assert.equal(form.visible,true,'manual form must be visible in ABS mode');
    assert.equal(form.count,12,'all 12 set inputs must exist');
    assert.equal(form.completed,true,'saved post-workout record must pass ABS engine');
    assert.equal(form.backfilled,true,'must tag post-workout provenance');
    assert.equal(form.archived,true,'history must identify backfilled sessions');
    assert.equal(form.beforeDup,1,'manual saving should create one record');
    assert.equal(form.afterDup,1,'repeat submit must not create duplicates');
    assert.ok(form.mapDays>=1,'completed manual workout should count toward route');
    assert.equal(form.active,null,'manual record must not create a live workout');
    console.log('PASS desktop wide, ABS manual save, history, deduplication and route progress');
    const workout=await evaluate("(()=>{window.FormaRotaABS.choose('home');document.getElementById('homeCalStart').click();const eng=window.FormaRotaHomeEngine;const before=JSON.parse(localStorage.getItem('formarota-home-current-v1')||'null');for(const m of eng.MOVES){for(let i=0;i<2;i++){const input=document.getElementById('homeCal-'+m.id+'-'+i);input.value=String(m.low);input.closest('.home-cal-set').querySelector('button').click();}}const active=JSON.parse(localStorage.getItem('formarota-home-current-v1')||'null');const done=eng.complete(active);document.getElementById('homeCalFinish').click();const hist=JSON.parse(localStorage.getItem('formarota-home-history-v1')||'[]');return {started:before?.program,count:eng.count(active),done,history:hist.length,finished:eng.finished(hist[0]),solo:JSON.parse(localStorage.getItem('formarota-abs-history-v1')||'[]').length,active:localStorage.getItem('formarota-home-current-v1'),full:localStorage.getItem('kocluk-fitness-history-v1')}})()");
    assert.equal(workout.started,'home-calisthenics-v1','home independent tracker starts');
    assert.equal(workout.count,26,'all 13 home moves get two real sets');
    assert.equal(workout.done,true,'home completion needs 26 valid sets');
    assert.equal(workout.history,1,'home session saved separately');
    assert.equal(workout.finished,true,'saved home session validated');
    assert.equal(workout.solo,1,'Solo ABS records preserved');
    assert.equal(workout.active,null,'home current session cleared');
    console.log('PASS desktop wide, home full-body plus calisthenics core records and Solo ABS isolation');
   }
   if(label==='desktop wide'){
    const order=await evaluate("(()=>{showView('nutrition',false,false);const foods=localSearch('Doyuyo');const menu=foods.find(f=>f.id==='restaurant-doyuyo-paprika-parmesan-3lu-menu');if(!menu)return{error:'missing menu',hits:foods.length};const results=document.getElementById('results');renderResults([menu],results);const card=results.querySelector('.result'),qty=card?.querySelector('.food-quantity-label input'),optionNodes=card?.querySelectorAll('.restaurant-menu-option select'),button=card?.querySelector('.food-result-controls button');if(!qty||optionNodes.length!==2||!button)return{error:'missing controls'};const initial={qty:qty.value,button:button.textContent,unit:qty.getAttribute('aria-label')};optionNodes[0].value='ranch';optionNodes[0].dispatchEvent(new Event('change'));optionNodes[1].value='cola';optionNodes[1].dispatchEvent(new Event('change'));document.getElementById('meal').value='Akşam yemeği';button.click();const rows=JSON.parse(localStorage.getItem('kocluk-food-log-v2')||'[]'),last=rows.at(-1),expected=window.FormaRotaRestaurantMenuOptions.withExtras(menu,'ranch','cola');return {initial,menuFirst:foods[0]?.portionUnit==='menü',portion:last?.portionUnit,count:last?.pieceCount,amount:last?.amount,kcal:last?.kcal,expected:expected.kcal*menu.pieceGrams/100,hasExtras:last?.name?.includes('Ranch')&&last.name.includes('Şekerli kola'),logText:document.getElementById('entries')?.textContent?.includes('1 menü')} })()");
    assert.equal(order.error,undefined,'Doyuyo menu should be available '+JSON.stringify(order));
    assert.equal(order.menuFirst,true,'whole restaurant menus listed before individual components');
    assert.equal(order.initial.qty,'1','menu selection defaults to one');
    assert.equal(order.initial.button,'Menüyü ekle','one-click whole menu');
    assert.ok(order.initial.unit.includes('menü sayısı'),'menu count rather than grams input');
    assert.equal(order.portion,'menü','log stores menu unit');
    assert.equal(order.count,1,'one whole menu logged');
    assert.equal(order.hasExtras,true,'sauce and drink recorded in same order');
    assert.equal(order.logText,true,'nutrition history displays one menu');
    assert.ok(Math.abs(order.kcal-order.expected)<0.05,'menu calories must include extras once');
    console.log('PASS desktop wide, restaurant full menu 1-tap logging with sauce and drink');
   }
   console.log('PASS '+label+' '+width+'x'+height+', longest pin drift '+Math.max(...map.distances).toFixed(1)+'px');
  }
 }finally{
  if(cdp)cdp.close();
  // Terminate Chrome and all child renderer processes, not only the browser parent.
  try{process.kill(-chrome.pid,'SIGKILL')}catch{chrome.kill('SIGKILL')}
  await Promise.race([
   new Promise(ok=>chrome.exitCode!==null?ok():chrome.once('exit',ok)),
   sleep(500)
  ]);
  await new Promise(ok=>server.close(ok));
  // Temporary profile cleanup is best-effort; never mask actual UI assertions.
  try{fs.rmSync(profile,{force:true,recursive:true,maxRetries:2,retryDelay:50})}catch{}
 }
}
run().catch(e=>{console.error(e);process.exitCode=1});

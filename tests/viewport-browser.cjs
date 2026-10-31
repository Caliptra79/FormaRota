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
  '--remote-debugging-port='+debugPort,'--remote-allow-origins=*','--user-data-dir='+profile,'about:blank'],{stdio:'ignore'});
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
   await sleep(90);
   const map=await evaluate('(()=>{const box=document.getElementById("frRouteMap"),svg=box.querySelector("svg"),ctm=svg.getScreenCTM();const distances=window.FormaRotaRouteMap.STAGES.map((stage,i)=>{const point=svg.createSVGPoint();point.x=stage.x*4;point.y=stage.y*4.2;const projected=point.matrixTransform(ctm),r=box.querySelector(".fr-route-pin[data-route-index=\\""+i+"\\"]").getBoundingClientRect();return Math.hypot(projected.x-r.x-r.width/2,projected.y-r.y-r.height/2)});const r=box.getBoundingClientRect(),layout=box.closest(".fr-route-layout");return {width:r.width,height:r.height,ratio:box.clientWidth/box.clientHeight,distances,cols:getComputedStyle(layout).gridTemplateColumns,doc:document.documentElement.scrollWidth,
    overflowElements:[...document.querySelectorAll("main *")].filter(n=>{
      const st=getComputedStyle(n),b=n.getBoundingClientRect();
      return st.display!=="none"&&b.width>0&&(b.right>innerWidth+5||b.left< -5)
    }).slice(0,20).map(n=>{const b=n.getBoundingClientRect();return {
      tag:n.tagName,id:n.id,cls:String(n.className).slice(0,70),left:Math.round(b.left),right:Math.round(b.right),width:Math.round(b.width)
    }})}})()');
   assert.ok(map.width>200&&map.height>240,label+' map too small '+JSON.stringify(map));
   assert.ok(Math.abs(map.ratio-400/420)<.025,label+' SVG aspect ratio distorted '+JSON.stringify(map));
   assert.ok(Math.max(...map.distances)<6,label+' pins drift from road '+JSON.stringify(map));
   assert.ok(map.doc<=width+5,label+' progress overflow '+JSON.stringify(map));
   if(label==='tablet portrait')assert.equal(map.cols.trim().split(/\s+/).length,1,'tablet portrait should stack the route map');
   console.log('PASS '+label+' '+width+'x'+height+', longest pin drift '+Math.max(...map.distances).toFixed(1)+'px');
  }
 }finally{
  if(cdp)cdp.close();
  chrome.kill('SIGTERM');
  await Promise.race([
   new Promise(ok=>chrome.exitCode!==null?ok():chrome.once('exit',ok)),
   sleep(3000)
  ]);
  await new Promise(ok=>server.close(ok));
  // Chrome can briefly retain cache files after SIGTERM on hosted runners.
  // Cleanup must never hide a viewport assertion failure.
  try{fs.rmSync(profile,{force:true,recursive:true,maxRetries:8,retryDelay:250})}
  catch(error){console.warn('Non-fatal Chrome profile cleanup:',error.code)}
 }
}
run().catch(e=>{console.error(e);process.exitCode=1});

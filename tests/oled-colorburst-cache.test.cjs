'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const read=p=>fs.readFileSync(path.join(__dirname,'..',p),'utf8');
const html=read('index.html'),sw=read('sw.js'),css=read('assets/oled-colorburst.css'),luxe=read('assets/luxe-ui.js');
const ids=['oled-cyberpop','oled-aurora','oled-ultraviolet'];
const bust=['abs-workouts.js','home-calisthenics-engine.js','home-calisthenics-media.js','home-calisthenics.js','luxe-ui.js','abs-workouts.css','home-calisthenics.css'];
test('three additional OLED themes are selectable at bootstrap, settings, dialog and CSS',()=>{
 assert.match(html,/13 paleti canlı önizle/);
 for(const id of ids){
  assert.ok(html.includes("'"+id+"'"),id+' bootstrap whitelist');
  assert.ok(html.includes('<option value="'+id+'">'),id+' settings choice');
  assert.ok(html.includes("'"+id+"':'#000000'"),id+' theme-color');
  assert.ok(luxe.includes("id:'"+id+"'"),id+' visual theme chooser');
  const tokens=css.split('html[data-theme="'+id+'"]{')[1]?.split('}')[0]||'';
  assert.ok(tokens.includes('--bg:#000000'),id+' true black');
  assert.match(tokens,/--text:#[0-9a-f]{6}/i);
  assert.match(tokens,/--accent:#[0-9a-f]{6}/i);
  assert.match(tokens,/--onaccent:#[0-9a-f]{6}/i);
 }
 assert.ok(html.includes('./assets/oled-colorburst.css'));
 assert.ok(sw.includes("'./assets/oled-colorburst.css'"));
 assert.ok(css.includes('--burst-c:'));
 assert.ok(css.includes('prefers-reduced-motion'));
});
test('versioned linked files bypass older cache-first service workers and are precached offline',()=>{
 assert.match(sw,/formarota-solo-v109-shell/);
 assert.match(sw,/formarota-solo-v109-gifs/);
 for(const file of bust){
  const url='./assets/'+file+'?fr=108';
  assert.ok(html.includes(url),file+' must have a fresh URL in HTML');
  assert.ok(sw.includes("'"+url+"'"),file+' must be available offline after install');
 }
 assert.ok(sw.includes("cache:'no-store'"));
});
function serviceWorkerNetwork(fetchImpl){
 const events={},writes=[];
 const cache={put:async (key,value)=>writes.push([key,value])};
 const old={tag:'old-cache'};
 const caches={open:async()=>cache,match:async()=>old};
 const self={location:{origin:'https://test.local'},addEventListener:(event,fn)=>{events[event]=fn}};
 vm.runInNewContext(sw,{self,caches,fetch:fetchImpl,URL,Response:{error:()=>({error:true})}},{filename:'sw.js'});
 let promise;
 const request={url:'https://test.local/assets/home-calisthenics.js?fr=108',method:'GET',mode:'cors'};
 events.fetch({request,respondWith:p=>promise=p});
 return {result:promise,writes,old};
}
test('local JS and CSS are network-first with offline fallback',async()=>{
 const calls=[];
 const online=serviceWorkerNetwork(async(req,options)=>{calls.push(options?.cache);return {ok:true,tag:'fresh',clone(){return {ok:true,tag:'fresh'}}}});
 assert.equal((await online.result).tag,'fresh','online scripts must not be served from stale cache');
 assert.equal(calls[0],'no-store');
 assert.equal(online.writes.length,1,'fresh response must update the shell cache');
 const offline=serviceWorkerNetwork(async()=>{throw Error('offline')});
 assert.equal((await offline.result).tag,'old-cache','offline scripts must use cached copy');
});

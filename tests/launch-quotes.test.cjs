'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const read=p=>fs.readFileSync(path.join(__dirname,'..',p),'utf8');
const html=read('index.html'),sw=read('sw.js'),src=read('assets/launch-quotes.js');
function factory(store=new Map(),random=()=>0){
 const window={localStorage:{
  getItem:key=>store.has(key)?store.get(key):null,
  setItem:(key,val)=>store.set(key,String(val))
 }};
 vm.runInNewContext(src,{window,Math});
 return {api:window.FormaRotaLaunchQuotes,store,random};
}
test('short, attributed quotations all reference identifiable primary texts',()=>{
 const {api}=factory();
 assert.equal(api.QUOTES.length,10);
 assert.equal(new Set(api.QUOTES.map(q=>q.text)).size,api.QUOTES.length);
 for(const q of api.QUOTES){
  assert.ok(q.text.length>=20&&q.text.length<=88,q.text);
  assert.ok(q.author.length>=4);
  assert.ok(q.work.length>=4);
  assert.match(q.source,/^https:\/\//);
  assert.ok(Object.isFrozen(q));
 }
 assert.ok(Object.isFrozen(api.QUOTES));
});
test('quotes rotate without immediately repeating, even across a new session',()=>{
 const store=new Map();
 const {api}=factory(store);
 const a=api.pick(()=>0);
 const b=api.pick(()=>0);
 const c=api.pick(()=>0);
 assert.notEqual(a.text,b.text);
 assert.notEqual(b.text,c.text);
 const other=factory(store).api.pick(()=>0);
 assert.notEqual(other.text,c.text);
 assert.equal(store.get(api.KEY),String(api.QUOTES.findIndex(q=>q.text===other.text)));
});
test('bad storage and invalid random values never prevent launching',()=>{
 const a=factory(new Map([['formarota-launch-last-quote-v1','NaN']])).api.pick(()=>NaN);
 assert.ok(a.text);
 const noStorage={window:{localStorage:{getItem(){throw Error('private mode')},setItem(){throw Error('private mode')}}}};
 vm.runInNewContext(src,noStorage);
 assert.ok(noStorage.window.FormaRotaLaunchQuotes.pick(()=>1).author);
});
function launchHarness(){
 const start=1000,clock={now:start,timers:[]},events={};
 const cls=new Set(),attrs={},nodes={
  'frLaunchQuote':{textContent:''},'frLaunchAuthor':{textContent:''},
  'frLaunchWork':{textContent:''},'frLaunchSkip':{
   listeners:{},addEventListener(event,fn){this.listeners[event]=fn},blur(){this.blurred=true}
  }
 };
 const el={classList:{add(x){cls.add(x)},remove(x){cls.delete(x)}},
  setAttribute(k,v){attrs[k]=v},removeAttribute(k){delete attrs[k]},
  querySelector:()=>({style:{animation:''},offsetWidth:120})};
 nodes['fr-launch']=el;
 let calls=0;
 const doc={readyState:'complete',hidden:false,activeElement:null,
  getElementById:id=>nodes[id]||null,
  addEventListener:(event,fn)=>{events[event]=fn}};
 const win={FormaRotaLaunchQuotes:{pick:()=>({
  text:'Deneme motivasyonu '+(++calls),author:'Epiktetos',work:'Söylevler · I.15'})},
  addEventListener:(event,fn)=>{events[event]=fn}};
 const block=html.match(/<script>\(function\(\)\{\nvar el=document\.getElementById\('fr-launch'\)[\s\S]*?\}\)\(\)<\/script>/)?.[0];
 assert.ok(block,'launch block should be in HTML');
 const script=block.slice('<script>'.length,-'</script>'.length);
 const sandbox={window:win,document:doc,Date:{now:()=>clock.now},
  setTimeout(fn,ms){clock.timers.push({fn,at:clock.now+ms})}};
 vm.runInNewContext(script,sandbox);
 function advance(ms){
  clock.now+=ms;
  let ready;
  while((ready=clock.timers.filter(t=>t.at<=clock.now)).length){
   clock.timers=clock.timers.filter(t=>t.at>clock.now);
   for(const t of ready)t.fn();
  }
 }
 return {nodes,cls,attrs,events,doc,advance,clock,get calls(){return calls}};
}
test('launch lasts ~3.8 seconds, shows citation, and can be skipped',()=>{
 const x=launchHarness();
 assert.equal(x.nodes.frLaunchQuote.textContent,'Deneme motivasyonu 1');
 assert.equal(x.nodes.frLaunchAuthor.textContent,'— Epiktetos');
 assert.equal(x.nodes.frLaunchWork.textContent,'Söylevler · I.15');
 assert.equal(x.cls.has('fr-launch-done'),false);
 x.advance(3500);
 assert.equal(x.cls.has('fr-launch-done'),false);
 x.advance(300);
 assert.equal(x.cls.has('fr-launch-done'),true);
 x.nodes.frLaunchSkip.listeners.click();
 assert.equal(x.attrs['aria-hidden'],'true');
});
test('brief app switches are ignored, long background returns show a new quote',()=>{
 const x=launchHarness();
 x.advance(3800);
 x.doc.hidden=true;x.events.visibilitychange();
 x.advance(4000);
 x.doc.hidden=false;x.events.visibilitychange();
 assert.equal(x.calls,1,'a short background switch should not delay work');
 x.doc.hidden=true;x.events.visibilitychange();
 x.advance(31000);
 x.doc.hidden=false;x.events.visibilitychange();
 assert.equal(x.calls,2);
 assert.equal(x.cls.has('fr-launch-done'),false);
 x.events.pageshow({persisted:true});
 assert.equal(x.calls,2,'bfcache and visibility should not double-display');
 x.nodes.frLaunchSkip.listeners.click();
 assert.equal(x.cls.has('fr-launch-done'),true);
});
test('integrates with existing icon, user motion preference, and offline shell',()=>{
 assert.match(html,/fr-launch-icon" src="\.\/assets\/formarota-icon\.svg"/);
 assert.match(html,/id="frLaunchSkip"/);
 assert.match(html,/id="frLaunchQuote"/);
 assert.match(html,/id="frLaunchAuthor"/);
 assert.match(html,/id="frLaunchWork"/);
 assert.match(html,/DURATION=3800,MAX_WAIT=5800/);
 assert.match(html,/RESUME_AFTER=30000/);
 assert.match(html,/data-fr-motion="system"\] \.fr-launch-quote/);
 assert.match(html,/src="\.\/assets\/launch-quotes\.js"/);
 assert.match(sw,/'\.\/assets\/launch-quotes\.js'/);
 assert.match(sw,/formarota-solo-v96-shell/);
 assert.match(html,/function collectBackup\(\)\{return\{version:7/);
 assert.doesNotThrow(()=>new vm.Script(src));
});

'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const source=p=>fs.readFileSync(path.join(__dirname,'..',p),'utf8');
class FakeEl{
 constructor(document,tag='div'){
  this.ownerDocument=document;this.tagName=tag;this.children=[];this.listeners={};
  this.dataset={};this.attributes={};this._id='';this.value='';this.textContent='';
  this.parent=null;this.className='';
 }
 set id(id){this._id=id;if(id)this.ownerDocument.nodes.set(id,this);}
 get id(){return this._id;}
 get previousElementSibling(){
  if(!this.parent)return null;
  const ix=this.parent.children.indexOf(this);return ix>0?this.parent.children[ix-1]:null;
 }
 append(...els){for(const el of els){if(el.parent){const i=el.parent.children.indexOf(el);if(i>=0)el.parent.children.splice(i,1);}
  el.parent=this;this.children.push(el);}}
 before(el){if(!this.parent)return;if(el.parent){const i=el.parent.children.indexOf(el);if(i>=0)el.parent.children.splice(i,1);}
  const at=this.parent.children.indexOf(this);this.parent.children.splice(at,0,el);el.parent=this.parent;}
 after(el){if(!this.parent)return;if(el.parent){const i=el.parent.children.indexOf(el);if(i>=0)el.parent.children.splice(i,1);}
  const at=this.parent.children.indexOf(this);this.parent.children.splice(at+1,0,el);el.parent=this.parent;}
 addEventListener(key,fn){(this.listeners[key]??=[]).push(fn);}
 dispatch(key){for(const fn of this.listeners[key]||[])fn();}
 setAttribute(key,val){this.attributes[key]=String(val);}
}
function scene(saved={},storageFails=false){
 const nodes=new Map();
 const document={nodes,readyState:'complete',documentElement:{dataset:{}},
  getElementById:id=>nodes.get(id)||null,
  createElement:tag=>new FakeEl(document,tag),
  addEventListener(){}};
 const make=(id,tag='div')=>{const e=document.createElement(tag);e.id=id;return e;};
 const parent=make('homePanel','section');
 const hero=make('homeIntro');const rank=make('frRankHome');
 const rings=make('spProgressRings');const week=make('spWeekTeaser');
 const meals=make('homeBreakfast','button');const water=make('waterPlus','button');
 parent.append(hero,rank,rings,week,meals,water);
 const motion=make('frhMotionSelect','select'),desc=make('frhMotionDescription','p');
 const writes=[];
 const localStorage={getItem:k=>{if(storageFails)throw Error('Storage unavailable');return saved[k]??null;},
  setItem:(k,v)=>{if(storageFails)throw Error('Storage unavailable');saved[k]=v;writes.push([k,v]);}};
 const window={document,localStorage};
 const sandbox=vm.createContext({window,document});
 vm.runInContext(source('assets/hybrid-premium-v1.js'),sandbox,{filename:'hybrid-premium-v1.js'});
 return {document,nodes,window,home:parent,rank,rings,week,meals,water,motion,desc,saved,writes};
}
test('first-load Normal is default, a heading is added and rank moves behind weekly story',()=>{
 const s=scene();
 assert.equal(s.document.documentElement.dataset.frMotion,'normal');
 assert.equal(s.motion.value,'normal');
 assert.equal(s.rank.previousElementSibling,s.week);
 assert.equal(s.rings.previousElementSibling.id,'frhDailyHeading');
 assert.equal(s.rings.attributes['aria-labelledby'],'frhDailyHeadingTitle');
 assert.equal(s.home.children.filter(x=>x===s.rank).length,1);
 assert.equal(s.home.children.filter(x=>x===s.meals).length,1);
 assert.equal(s.home.children.filter(x=>x===s.water).length,1);
 assert.deepEqual(s.writes,[]);
});
test('repeat init does not duplicate heading, remove content, or move handlers',()=>{
 const s=scene();
 s.window.FormaRotaHybridPremium.apply('normal',false);
 assert.equal(s.nodes.has('frhDailyHeading'),true);
 assert.equal(s.rank.previousElementSibling,s.week);
 assert.equal(s.home.children.filter(x=>x===s.rank).length,1);
});
test('Reduced motion saves and immediately updates root, with clear accessible explanation',()=>{
 const s=scene();s.motion.value='reduced';s.motion.dispatch('change');
 assert.equal(s.document.documentElement.dataset.frMotion,'reduced');
 assert.equal(s.saved['formarota-motion-mode-v1'],'reduced');
 assert.match(s.desc.textContent,/Gereksiz geçişler/);
});
test('System preference is supported without deleting any existing app settings',()=>{
 const saved={'formarota-motion-mode-v1':'reduced','formarota-ui-theme':'sunset'};
 const s=scene(saved);
 assert.equal(s.motion.value,'reduced');
 s.motion.value='system';s.motion.dispatch('change');
 assert.equal(saved['formarota-ui-theme'],'sunset');
 assert.equal(s.document.documentElement.dataset.frMotion,'system');
 assert.equal(saved['formarota-motion-mode-v1'],'system');
});
test('invalid local preference falls back to Normal and does not overwrite saved data',()=>{
 const s=scene({'formarota-motion-mode-v1':'invalid'});
 assert.equal(s.document.documentElement.dataset.frMotion,'normal');
 assert.equal(s.motion.value,'normal');
 assert.deepEqual(s.writes,[]);
 assert.equal(s.window.FormaRotaHybridPremium.validMode('custom'),'normal');
});
test('storage blocked by iOS privacy settings never prevents app rendering',()=>{
 const s=scene({},true);
 assert.equal(s.document.documentElement.dataset.frMotion,'normal');
 s.motion.value='reduced';assert.doesNotThrow(()=>s.motion.dispatch('change'));
 assert.equal(s.document.documentElement.dataset.frMotion,'reduced');
});
test('index integrates both visual files and early saved mode before render',()=>{
 const html=source('index.html'),css=source('assets/hybrid-premium-v1.css');
 assert.ok(html.includes('src="./assets/hybrid-premium-v1.js"'));
 assert.ok(html.includes('href="./assets/hybrid-premium-v1.css"'));
 assert.ok(html.indexOf('hybrid-premium-v1.css')>html.indexOf('abs-workouts.css'));
 assert.ok(html.indexOf('hybrid-premium-v1.js')>html.indexOf('rank-system.js'));
 assert.ok(html.indexOf('dataset.frMotion')<html.indexOf('</head>'));
 assert.ok(css.includes('--frh-radius-card'));
 assert.ok(css.includes('max-width:365px'));
 assert.ok(css.includes('data-fr-motion="reduced"'));
 assert.ok(css.includes('data-fr-motion="system"'));
});
test('all seven theme values, workout GIFs, history, macros, buttons and backup keep original IDs',()=>{
 const html=source('index.html');
 for(const theme of ['night','ocean','light','sand','neon','volt','sunset'])
  assert.ok(html.includes('<option value="'+theme+'">'),theme);
 for(const id of ['homeKcal','homeProtein','spProgressRings','frRankHome','homeBreakfast','homeLunch','homeDinner','homeSnack','homeWorkout','waterPlus','waterMinus','walkToggle','walkKm','fitExerciseList','frhMotionSelect','exportBtn','importBtn'])
  assert.ok(html.includes('id="'+id+'"'),id);
 assert.ok(html.includes("collectBackup(){return{version:7"));
 assert.ok(html.includes('kocluk-fitness-history-v1'));
 const gif=fs.readdirSync(path.join(__dirname,'../assets')).filter(x=>x.endsWith('.gif'));
 assert.equal(gif.length,19);
});
test('new theme controls do not require changed storage schema or a login',()=>{
 const js=source('assets/hybrid-premium-v1.js');
 assert.equal(js.includes('kocluk-fitness-history-v1'),false);
 assert.equal(js.includes('fetch('),false);
 assert.equal(js.includes('removeItem('),false);
 assert.equal(js.includes('clear('),false);
 assert.equal(js.includes('userData'),false);
});
test('service worker precaches both visual additions and rotates shell safely',()=>{
 const sw=source('sw.js');
 for(const item of ['hybrid-premium-v1.css','hybrid-premium-v1.js'])
  assert.ok(sw.includes("'./assets/"+item+"'"),item);
 assert.ok(sw.includes("formarota-solo-v73-shell"));
 assert.ok(sw.includes("Promise.all(SHELL.filter"));
 assert.ok(sw.includes("throw new Error('Offline asset cannot be installed: '"));
});

test('explicit Normal mode overrides legacy OS reduced preference for key app transitions',()=>{
 const hybrid=source('assets/hybrid-premium-v1.css');
 const final=source('assets/final-motion.css');
 const studio=source('assets/studio-relaunch.css');
 assert.ok(final.includes('html[data-fr-motion="system"] *'));
 assert.ok(final.includes('html[data-fr-motion="system"] body main'));
 assert.ok(studio.includes('html[data-fr-motion="system"] .studio-home-intro'));
 assert.ok(hybrid.includes('html[data-fr-motion="normal"] body main'));
 assert.ok(hybrid.includes('html[data-fr-motion="normal"] .abs-exercise.abs-set-pulse'));
 assert.ok(hybrid.includes('html[data-fr-motion="reduced"] *'));
});

'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
function mock(){
 const nodes=new Map(),hooks={},observers=[];
 let writes=0;
 class Node{
  constructor(tag='div',cls='',id=''){
   this.tagName=tag;this.className=cls;this.id=id;this.dataset={};
   this.childNodes=[];this.parentNode=null;this.events={};if(id)nodes.set(id,this);
  }
  append(...els){for(const el of els){el.parentNode=this;this.childNodes.push(el);}}
  before(el){const parent=this.parentNode;if(!parent)return;const i=parent.childNodes.indexOf(this);
   parent.childNodes.splice(i,0,el);el.parentNode=parent;}
  querySelector(selector){return this.querySelectorAll(selector)[0]||null;}
  querySelectorAll(selector){
   const selectors=selector.split(',').map(x=>x.trim());
   const findDesc=(el,segments)=>{
    if(!segments.length)return true;
    const last=segments.at(-1);
    if(!match(el,last))return false;
    for(let ancestor=el.parentNode,k=segments.length-2;k>=0;k--){
     while(ancestor&&!match(ancestor,segments[k]))ancestor=ancestor.parentNode;
     if(!ancestor)return false;ancestor=ancestor.parentNode;
    }
    return true;
   };
   const match=(el,part)=>{
    const tokens=part.match(/\.[a-z0-9-]+|#[a-z0-9-]+|^[a-z][a-z0-9-]*/ig)||[];
    return tokens.every(t=>t[0]==='.'?el.className.split(' ').includes(t.slice(1)):t[0]==='#'?el.id===t.slice(1):el.tagName.toLowerCase()===t.toLowerCase());
   };
   const result=[],walk=el=>{for(const ch of el.childNodes){if(selectors.some(q=>findDesc(ch,q.split(/\s+/))))result.push(ch);walk(ch);}};
   walk(this);return result;
  }
  addEventListener(event,cb){(this.events[event]??=[]).push(cb);}
  fire(event){for(const cb of this.events[event]||[])cb();}
 }
 const doc={readyState:'complete',visibilityState:'visible',getElementById:id=>nodes.get(id)||null,
  createElement:tag=>new Node(tag),addEventListener:(key,cb)=>hooks[key]=cb};
 const win={document:doc,addEventListener:(key,cb)=>hooks[key]=cb,localStorage:{setItem:()=>writes++}};
 const coach=new Node('section','','coachOverview'),coachTop=new Node('div','coach-top');
 const coachTitle=new Node('h2');coachTop.append(coachTitle);coach.append(coachTop);
 const session=new Node('section','','fitSessionPanel'),sessionTitle=new Node('h2');session.append(sessionTitle);
 const exercisePanel=new Node('section','','fitExercisePanel'),head=new Node('div','fit-headline');
 const exerciseTitle=new Node('h2');head.append(exerciseTitle);exercisePanel.append(head);
 const list=new Node('div','','fitExerciseList');exercisePanel.append(list);
 nodes.set('coachOverview',coach);nodes.set('fitSessionPanel',session);nodes.set('fitExercisePanel',exercisePanel);nodes.set('fitExerciseList',list);
 function card(done){
  const node=new Node('article','fit-card');
  for(let i=0;i<3;i++)node.append(new Node('div',i<done?'fit-set done':'fit-set'));
  list.append(node);return node;
 }
 const a=card(0),b=card(1),c=card(3);
 const context=vm.createContext({window:win,document:doc,
  queueMicrotask:fn=>fn(),
  MutationObserver:class{constructor(cb){this.cb=cb;observers.push(this);}observe(target,opts){this.target=target;this.opts=opts;}}});
 vm.runInContext(read('assets/hybrid-premium-fitness.js'),context,{filename:'assets/hybrid-premium-fitness.js'});
 return{nodes,coach,session,exercisePanel,list,a,b,c,card,win,observers,hooks,writeCount:()=>writes};
}
test('Hybrid fitness adds useful section kickers without removing original headings',()=>{
 const m=mock();
 for(const [el,word] of [[m.coach,'KİŞİSEL ANTRENÖR'],[m.session,'ZAMANLAYICI'],[m.exercisePanel,'HAREKETLERİN']]){
  const kicker=el.querySelector('.frhf-kicker, .frhf-coach-kicker');
  assert.ok(kicker);
  assert.match(kicker.textContent,word);
  assert.ok(el.querySelector('h2'));
 }
});
test('display-only status derives from actual visible done rows',()=>{
 const m=mock();
 assert.equal(m.a.dataset.frhfProgress,'ready');
 assert.equal(m.b.dataset.frhfProgress,'partial');
 assert.equal(m.c.dataset.frhfProgress,'complete');
 assert.equal(m.writeCount(),0);
});
test('rebuilt cards get fresh completion styling and are not duplicated',()=>{
 const m=mock(),fresh=m.card(2);
 m.observers[0].cb();
 assert.equal(fresh.dataset.frhfProgress,'partial');
 m.win.FormaRotaHybridFitness.refresh();
 assert.equal(m.coach.querySelectorAll('.frhf-coach-kicker').length,1);
 assert.equal(m.session.querySelectorAll('.frhf-kicker').length,1);
 assert.equal(m.exercisePanel.querySelectorAll('.frhf-kicker').length,1);
});
test('set save click recolors cards without editing completed workout data',()=>{
 const m=mock();m.b.append(new (m.b.constructor)('div','fit-set done'));
 m.list.fire('click');
 assert.equal(m.b.dataset.frhfProgress,'partial');
 m.b.append(new (m.b.constructor)('div','fit-set done'));
 m.list.fire('click');
 assert.equal(m.b.dataset.frhfProgress,'complete');
 assert.equal(m.writeCount(),0);
});
test('DOM observer only watches direct card changes, preventing styling loops',()=>{
 const m=mock();assert.equal(m.observers.length,1);
 assert.equal(m.observers[0].target,m.list);
 assert.equal(m.observers[0].opts.childList,true);
 assert.equal(m.observers[0].opts.subtree,undefined);
});
test('all interfaces remain present and original records are untouched',()=>{
 const html=read('index.html'),sw=read('sw.js');
 for(const id of ['coachOverview','fitExercisePanel','fitExerciseList','fitSessionPanel']){
  if(id==='coachOverview')assert.ok(read('assets/coach-ui-v33.js').includes("card.id='coachOverview'"));
  else assert.ok(html.includes('id="'+id+'"'),id);
 }
 for(const asset of ['hybrid-premium-fitness.js','hybrid-premium-fitness.css']){
  assert.ok(html.includes('./assets/'+asset));
  assert.ok(sw.includes("'./assets/"+asset+"'"));
 }
 assert.match(sw,/formarota-solo-v\d+-shell/);
 assert.ok(html.indexOf('hybrid-premium-fitness.css')>html.indexOf('hybrid-premium-v1.css'));
 assert.ok(html.indexOf('hybrid-premium-fitness.js')>html.indexOf('hybrid-premium-v1.js'));
});
test('seven themes, 19 square exercise GIFs and data keys remain unchanged',()=>{
 const html=read('index.html'),css=read('assets/hybrid-premium-fitness.css'),js=read('assets/hybrid-premium-fitness.js');
 for(const theme of ['night','ocean','light','sand','neon','volt','sunset'])assert.ok(html.includes('<option value="'+theme+'">'),theme);
 const gifs=fs.readdirSync(path.join(root,'assets')).filter(x=>x.endsWith('.gif'));
 assert.equal(gifs.length,19);
 assert.ok(css.includes('aspect-ratio:1/1'));
 assert.ok(css.includes('max-width:380px'));
 assert.ok(css.includes('min-height:44px'));
 assert.ok(css.includes('data-fr-motion="reduced"'));
 for(const key of ['kocluk-fitness-history-v1','kocluk-fitness-current-v1','removeItem','fetch('])
  assert.equal(js.includes(key),false,key);
 assert.ok(html.includes('collectBackup(){return{version:7'));
});

'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const read=p=>fs.readFileSync(path.join(__dirname,'..',p),'utf8');
function setup(type='rest',explicit=false,note=''){
 const record={date:'2026-10-29',week:'2026-10-26',type,note,explicit};
 const nodes=new Map(),events={};let saves=0;
 class E{
  constructor(tag='div'){this.tag=tag;this.children=[];this.attrs={};this.dataset={};this.value='';this.hidden=false;this.textContent='';this.handlers={};this.style={values:{},setProperty:(k,v)=>{this.style.values[k]=v;}};this.classList={contains:()=>false};}
  setAttribute(k,v){this.attrs[k]=String(v);}
  append(...children){this.children.push(...children);}
  replaceChildren(...children){this.children=children;}
  addEventListener(k,fn){this.handlers[k]=fn;}
  querySelector(k){return k==='details.fit-fold'?this.fold:null;}
 }
 const ids=['homePanel','oledKcalRing','oledKcalValue','oledKcalTarget','oledKcalState',
  'oledCarbs','oledFat','oledProtein','oledCarbsNote','oledFatNote','oledProteinBar',
  'oledTodayPlan','oledRecentList','oledTodayActivitySelect','oledTodayActivityDate',
  'oledTodayActivityNote','oledTodayActivityNoteLabel','oledTodayActivityStatus',
  'oledTodayOpenWeek','oledTodayActivityCard','oledTodayActivitySaveOther','oledRecentAll','goalKcal','goalProtein','waterGoal'];
 ids.forEach(id=>nodes.set(id,new E()));
 nodes.get('oledTodayActivitySelect').value='rest';
 const section=new E();section.fold={open:false};nodes.set('fitSchedulePanel',section);
 const doc={readyState:'loading',visibilityState:'visible',
  getElementById:id=>nodes.get(id)||null,
  createElement:tag=>new E(tag),
  createDocumentFragment:()=>new E('fragment'),
  addEventListener:(k,fn)=>events[k]=fn};
 const localStore={
  getItem:()=>null,
  setItem(){throw Error('renderer must not write to storage directly');}
 };
 const types=[['rest','Dinlenme'],['full','Full Body'],['abs','ABS / Karın'],
  ['basket','Basketbol'],['basket-abs','Basketbol + ABS'],['full-abs','Full Body + ABS'],
  ['other','Başka etkinlik']].map(([value,label])=>({value,label}));
 const history={};
 const root={document:doc,localStorage:localStore,
  FormaRotaStudioPlusMetrics:{localISO:()=>record.date,fullSession:s=>s.status==='finished'},
  formaRotaFitnessCatalog:Array.from({length:13},(_,i)=>({id:'move-'+i})),
  FormaRotaWeeklyPlan:{types,getDay:()=>({...record}),setDay:(day,choice,memo)=>{
   saves++;assert.equal(day,record.date);record.type=choice;record.explicit=true;
   record.note=choice==='other'?memo:'';return {...record};
  }},
  addEventListener:(k,fn)=>events['window-'+k]=fn,
  navigateTo:(route,target)=>{history.route=route;history.target=target;},
  requestAnimationFrame:fn=>fn()};
 vm.runInNewContext(read('assets/oled-home.js'),{window:root,document:doc,queueMicrotask:fn=>fn()});
 events.DOMContentLoaded();
 return {root,nodes,record,events,section,history,saves:()=>saves};
}
test('home shortcut is an accessible own card, not repeated on other routed screens',()=>{
 const html=read('index.html'),css=read('assets/oled-home.css');
 const homeStart=html.indexOf('<section class="panel wide oled-home"');
 const next=html.indexOf('<section class="route-heading wide studio-nutrition-hero"',homeStart);
 const card=html.indexOf('id="oledTodayActivityTitle"');
 assert.ok(card>homeStart&&card<next);
 for(const id of ['oledTodayActivityCard','oledTodayActivitySaveOther','oledTodayActivitySelect','oledTodayActivityNote','oledTodayActivityStatus','oledTodayOpenWeek'])
  assert.equal((html.match(new RegExp('id="'+id+'"','g'))||[]).length,1,id);
 assert.ok(css.includes('#homePanel.oled-home .oled-today-activity'));
 assert.ok(css.includes('#homePanel.oled-home #oledTodayActivitySelect'));
 assert.ok(css.includes('color:var(--text)!important'));
 assert.ok(css.includes('#oledTodayActivityNoteLabel[hidden]'));
 assert.ok(css.includes('.oled-today-activity[hidden]'));
 assert.ok(css.includes('display:none!important'));
 assert.ok(!css.includes('#homePanel.oled-home{display:grid!important'));
});
test('selecting Full Body records a plan but never touches workout completion records',()=>{
 const x=setup();
 const picker=x.nodes.get('oledTodayActivitySelect');
 picker.value='full';picker.handlers.change();
 assert.equal(x.saves(),1);
 assert.equal(x.record.type,'full');
 const status=x.nodes.get('oledTodayActivityStatus').textContent;
 assert.match(status,/Full Body/);
 assert.match(status,/henüz tamamlanmış kayıt yok/);
 assert.doesNotMatch(status,/antrenmanın kaydedilmiş/);
});
test('basketball remains unverified and does not fabricate attended training',()=>{
 const x=setup('basket-abs',true);
 assert.match(x.nodes.get('oledTodayActivityStatus').textContent,/Basketbol katılımı otomatik doğrulanmaz/);
 const picker=x.nodes.get('oledTodayActivitySelect');
 picker.value='basket';picker.handlers.change();
 assert.match(x.nodes.get('oledTodayActivityStatus').textContent,/Basketbol katılımı otomatik doğrulanmaz/);
});
test('custom activity stays open for a note and disappears only after explicit save',()=>{
 const x=setup();
 const picker=x.nodes.get('oledTodayActivitySelect');
 picker.value='other';picker.handlers.change();
 assert.equal(x.saves(),0,'selecting Other should not save before entering a note');
 assert.equal(x.nodes.get('oledTodayActivityCard').hidden,false);
 assert.equal(x.nodes.get('oledTodayActivityNoteLabel').hidden,false);
 assert.equal(x.nodes.get('oledTodayActivitySaveOther').hidden,false);
 const note=x.nodes.get('oledTodayActivityNote');
 note.value='Basketbol yerine yüzme';
 x.nodes.get('oledTodayActivitySaveOther').handlers.click();
 assert.equal(x.record.note,'Basketbol yerine yüzme');
 assert.equal(x.record.type,'other');
 assert.equal(x.saves(),1);
 assert.equal(x.nodes.get('oledTodayActivityCard').hidden,true);
 const html=read('index.html');
 assert.ok(html.includes('id="oledTodayActivityNote" type="text" maxlength="80"'));
});
test('existing saved plans hide the shortcut immediately on home load, even when planned in Fitness',()=>{
 for(const type of ['full','abs','basket','basket-abs','full-abs','other','rest']){
  const x=setup(type,true);
  assert.equal(x.nodes.get('oledTodayActivityCard').hidden,true,type);
  assert.equal(x.saves(),0);
 }
});
test('fresh day without a saved plan shows the shortcut; selecting any usual choice hides it',()=>{
 const x=setup();
 const card=x.nodes.get('oledTodayActivityCard');
 assert.equal(card.hidden,false);
 const picker=x.nodes.get('oledTodayActivitySelect');
 picker.value='full';picker.handlers.change();
 assert.equal(x.saves(),1);
 assert.equal(card.hidden,true);
 x.root.FormaRotaOLEDHome.render();
 assert.equal(card.hidden,true,'re-render must not show an already saved choice');
});
test('special Other draft remains visible after refresh until Save is tapped',()=>{
 const x=setup();
 const picker=x.nodes.get('oledTodayActivitySelect');
 picker.value='other';picker.handlers.change();
 x.root.FormaRotaOLEDHome.render();
 assert.equal(x.nodes.get('oledTodayActivityCard').hidden,false);
 assert.equal(x.nodes.get('oledTodayActivitySaveOther').hidden,false);
 assert.equal(picker.value,'other','draft choice must not reset to rest');
});
test('weekly plan shortcut reveals collapsed settings and opens the Fitness page',()=>{
 const x=setup();
 assert.equal(x.section.fold.open,false);
 x.nodes.get('oledTodayOpenWeek').handlers.click();
 assert.equal(x.section.fold.open,true);
 assert.equal(x.history.route,'fitness');
 assert.equal(x.history.target,'fitSchedulePanel');
});
test('after a rejected plan save, visible status reports the error rather than success',()=>{
 const x=setup();
 x.root.FormaRotaWeeklyPlan.setDay=()=>{throw Error('quota');};
 const picker=x.nodes.get('oledTodayActivitySelect');picker.value='abs';picker.handlers.change();
 assert.match(x.nodes.get('oledTodayActivityStatus').textContent,/kaydedilemedi/);
 assert.equal(x.record.type,'rest');
});
test('home shortcut does not alter stored backup shape and stays offline with the existing GIFs',()=>{
 const html=read('index.html'),sw=read('sw.js');
 assert.ok(html.includes("collectBackup(){return{version:7"));
 assert.ok(html.includes('dayPlans:read(FIT_DAY_PLAN_KEY,{})'));
 assert.ok(html.includes("root.FormaRotaWeeklyPlan")==false);
 assert.ok(html.includes('window.FormaRotaWeeklyPlan=Object.freeze'));
 assert.ok(sw.includes("'./assets/oled-home.js'"));
 assert.ok(sw.includes("'./assets/oled-home.css'"));
 assert.match(sw,/formarota-solo-v\d+-shell/);
 assert.equal(fs.readdirSync(path.join(__dirname,'../assets')).filter(x=>x.endsWith('.gif')).length,19);
});

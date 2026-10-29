'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const read=p=>fs.readFileSync(path.join(__dirname,'..',p),'utf8');
const html=read('index.html');
function harness(initial={}){
 const backing={...Object.fromEntries(Object.entries(initial).map(([k,v])=>[k,JSON.stringify(v)]))};
 let writes=0;
 const store={getItem:k=>backing[k]??null,setItem:(k,v)=>{backing[k]=v;writes++;},removeItem:k=>{delete backing[k];writes++;}};
 const readStore=(k,dflt)=>{try{return JSON.parse(store.getItem(k)??JSON.stringify(dflt));}catch{return dflt;}};
 const writeStore=(k,v)=>store.setItem(k,JSON.stringify(v));
 const from='const FIT_DAY_TYPES=[',to='function fitSvg(';
 const a=html.indexOf(from),b=html.indexOf(to,a);
 assert.ok(a>0&&b>a,'Planner function delimiters');
 class El{
  constructor(tag){this.tag=tag;this.children=[];this.dataset={};this.handlers={};this.textContent='';this.value='';this.attrs={};this.type='';this.disabled=false;}
  append(...children){this.children.push(...children);}
  replaceChildren(...children){this.children=children;}
  setAttribute(k,v){this.attrs[k]=v;}
  addEventListener(k,fn){this.handlers[k]=fn;}
  trigger(type){this.handlers[type]?.();}
 }
 const ids={fitWeekDays:new El('div'),fitWeekLabel:new El('strong'),
  fitWeekStatus:new El('p'),fitAbsDone:new El('input')};
 const $=id=>ids[id];
 const document={createElement:tag=>new El(tag)};
 const shiftISO=(date,shift)=>{const d=new Date(date+'T12:00:00Z');d.setUTCDate(d.getUTCDate()+shift);return d.toISOString().slice(0,10);};
 const context={window:{},document,localStorage:store,read:readStore,write:writeStore,$,
  FIT_DAY_PLAN_KEY:'formarota-fitness-day-plan-v1',FIT_WEEK_KEY:'kocluk-fitness-weeks-v1',
  FIT_ABS_KEY:'kocluk-fitness-abs-v1',FIT_DAYS:['Pzt','Sal','Çar','Per','Cum','Cmt','Paz'],
  fitWeekAnchor:'2026-10-28',fitWeekStart:()=> '2026-10-26',
  fitDateLabel:d=>d.slice(8)+'.'+d.slice(5,7),shiftISO,fitConf:()=>({frequency:2})};
 vm.runInNewContext(html.slice(a,b)+'\nthis.api={fitWeekPlan,fitDrawWeek,fitSaveWeekDay,fitValidDayPlans,FIT_DAY_TYPES};',context);
 return {api:context.api,publicApi:context.window.FormaRotaWeeklyPlan,backing,ids,store,reads:readStore,writes:()=>writes};
}
test('all seven days including Wednesday are selectable and use real dates',()=>{
 const x=harness();x.api.fitDrawWeek();
 assert.equal(x.ids.fitWeekDays.children.length,7);
 const wed=x.ids.fitWeekDays.children[2];
 assert.equal(wed.dataset.activity,'rest');
 const select=wed.children[1].children[1];
 assert.equal(select.attrs['aria-label'],'Çar 2026-10-28 antrenman etkinliği');
 assert.equal(select.children.length,7);
 assert.equal(select.disabled,false);
 for(const choice of ['full','abs','basket','basket-abs','full-abs','other','rest'])
  assert.ok(select.children.some(o=>o.value===choice),choice);
 assert.match(x.ids.fitWeekStatus.textContent,/Plan gerçek antrenman kaydı oluşturmaz/);
});
test('an existing older Full Body week remains intact on first open, Wednesday stays unlocked',()=>{
 const x=harness({'kocluk-fitness-weeks-v1':{'2026-10-26':['2026-10-26','2026-10-30']},
  'kocluk-fitness-abs-v1':{'2026-10-28':true}});
 const plan=x.api.fitWeekPlan('2026-10-26');
 assert.equal(plan['2026-10-26'].type,'full');
 assert.equal(plan['2026-10-30'].type,'full');
 assert.equal(plan['2026-10-28'].type,'rest');
 x.api.fitDrawWeek();
 assert.equal(x.ids.fitAbsDone.checked,true);
 assert.equal(x.writes(),0,'opening calendar must never migrate or overwrite data');
});
test('choosing Wednesday Full Body persists plan and stays compatible with existing Full Body weeks',()=>{
 const x=harness();
 x.api.fitDrawWeek();
 let wed=x.ids.fitWeekDays.children[2];
 let selector=wed.children[1].children[1];
 selector.value='full';selector.trigger('change');
 const plan=x.reads('formarota-fitness-day-plan-v1',{});
 assert.equal(plan['2026-10-26']['2026-10-28'].type,'full');
 assert.equal(x.reads('kocluk-fitness-weeks-v1',{})['2026-10-26'][0],'2026-10-28');
 assert.equal(x.ids.fitWeekDays.children[2].dataset.activity,'full');
 const next=x.ids.fitWeekDays.children[2].children[1].children[1];
 next.value='basket-abs';next.trigger('change');
 assert.equal(x.reads('formarota-fitness-day-plan-v1',{})['2026-10-26']['2026-10-28'].type,'basket-abs');
 assert.equal(x.reads('kocluk-fitness-weeks-v1',{})['2026-10-26'].length,0);
});
test('custom activities, notes, and next-week plans remain independent',()=>{
 const x=harness();
 x.api.fitSaveWeekDay('2026-10-26','2026-10-28','other','Yüzme');
 x.api.fitDrawWeek();
 const input=x.ids.fitWeekDays.children[2].children[2];
 assert.equal(input.value,'Yüzme');input.value='Hafif koşu';input.trigger('change');
 assert.equal(x.reads('formarota-fitness-day-plan-v1',{})['2026-10-26']['2026-10-28'].note,'Hafif koşu');
 x.api.fitSaveWeekDay('2026-11-02','2026-11-04','abs','');
 assert.equal(x.api.fitWeekPlan('2026-10-26')['2026-10-28'].note,'Hafif koşu');
 assert.equal(x.reads('formarota-fitness-day-plan-v1',{})['2026-11-02']['2026-11-04'].type,'abs');
 assert.equal(x.reads('kocluk-fitness-weeks-v1',{})['2026-10-26'].length,0);
});
test('backup validation rejects invalid dates, unrecognized activities, oversized text and arrays',()=>{
 const x=harness();const valid={'2026-10-26':{'2026-10-28':{type:'basket-abs',note:''}}};
 assert.equal(x.api.fitValidDayPlans(valid),true);
 for(const invalid of [[],{'2026-10-26':[]},{'2026-10-26':{'2026-11-18':{type:'full'}}},
  {'2026-10-26':{'2026-10-28':{type:'skating'}}},
  {'2026-10-26':{'2026-10-28':{type:'other',note:'x'.repeat(81)}}}]){
  assert.equal(x.api.fitValidDayPlans(invalid),false);
 }
});
test('the coach respects full-body on Wednesday and never treats planned basketball as a completed session',()=>{
 const sandbox={window:{}};vm.runInNewContext(read('assets/coach-engine-v35.js'),sandbox);
 const E=sandbox.window.FormaRotaCoachEngine;
 const plans={'2026-10-26':{type:'rest'},'2026-10-28':{type:'full'},
  '2026-10-30':{type:'basket'},'2026-10-31':{type:'full'}};
 const w=E.weekly([],'2026-10-28',2,['2026-10-28','2026-10-31'],plans);
 assert.equal(w.planReady,true);
 assert.equal(w.finished,0);
 assert.equal(w.activities['2026-10-28'],'full');
 assert.ok(w.planned.includes('2026-10-28'));
 assert.ok(!w.planned.includes('2026-10-30'));
 assert.ok(E.weekly([],'2026-10-28',3,[]).planned.includes('2026-10-28'));
});
test('coach reschedule skips planned ABS and basketball but may use a free Wednesday',()=>{
 const sandbox={window:{}};vm.runInNewContext(read('assets/coach-engine-v35.js'),sandbox);
 const E=sandbox.window.FormaRotaCoachEngine;
 const w=E.weekly([],'2026-10-29',2,['2026-10-26','2026-10-30'],
  {'2026-10-28':{type:'abs'}});
 assert.equal(w.activities['2026-10-28'],'abs');
 assert.deepEqual(Array.from(E.reschedule(w,'2026-10-29').missed),['2026-10-26']);
 assert.notEqual(E.reschedule(w,'2026-10-29').replacement,'2026-10-28');
 const b=E.weekly([],'2026-10-28',2,['2026-10-26','2026-10-30'],{});
 assert.equal(b.activities['2026-10-28'],'rest');
});
test('live coach strip uses user activities; never hardwires Wednesday as basketball',()=>{
 const ui=read('assets/coach-ui-v33.js'),html=read('index.html');
 assert.ok(ui.includes("read('formarota-fitness-day-plan-v1',{})"));
 assert.ok(ui.includes('w.activities?.[date]'));
 assert.ok(!ui.includes("i===2?'ball'"));
 assert.ok(html.includes("FIT_DAY_PLAN_KEY='formarota-fitness-day-plan-v1'"));
 assert.ok(html.includes('id="fitWeekDays"'));
 assert.ok(!html.includes('Çarşamba: Basketball + Abs'));
});
test('plan is included in JSON export/import with legacy backup compatibility',()=>{
 assert.ok(html.includes('dayPlans:read(FIT_DAY_PLAN_KEY,{})'));
 assert.ok(html.includes('fitValidDayPlans(data.fitness.dayPlans)'));
 assert.ok(html.includes('changes.push([FIT_DAY_PLAN_KEY,data.fitness.dayPlans||null])'));
 assert.ok(html.includes('collectBackup(){return{version:7'));
 assert.ok(html.includes('FIT_HISTORY_KEY'));
});
test('contrast never uses white text over light-green day card; all ten themes and PWA files remain',()=>{
 const css=read('assets/flexible-weekly-plan.css'),sw=read('sw.js');
 for(const name of ['fit-plan-day','fit-plan-activity select','fitWeekStatus','coach-week-strip .coach-day'])
  assert.ok(css.includes(name),name);
 assert.ok(css.includes('background:var(--panel2)!important'));
 assert.ok(css.includes('color:var(--text)!important'));
 assert.ok(css.includes('-webkit-text-fill-color:var(--text)!important'));
 assert.ok(css.includes('@media(max-width:420px)'));
 assert.ok(html.includes('./assets/flexible-weekly-plan.css'));
 assert.ok(sw.includes("'./assets/flexible-weekly-plan.css'"));
 assert.match(sw,/const CACHE='formarota-solo-v\d+-shell'/);
 for(const theme of ['night','ocean','light','sand','neon','volt','sunset','oled-black','oled-neon','oled-ember'])
  assert.ok(html.includes('<option value="'+theme+'">'),theme);
 assert.equal(fs.readdirSync(path.join(__dirname,'../assets')).filter(x=>x.endsWith('.gif')).length,19);
});

test('home shortcut and full weekly planner share one save path, and planning never creates attendance',()=>{
 const x=harness();
 const first=x.publicApi.getDay('2026-10-28');
 assert.equal(first.type,'rest');assert.equal(first.explicit,false);
 assert.equal(x.writes(),0);
 const selected=x.publicApi.setDay('2026-10-28','basket-abs','');
 assert.equal(selected.type,'basket-abs');
 assert.equal(selected.explicit,true);
 assert.equal(x.reads('formarota-fitness-day-plan-v1',{})['2026-10-26']['2026-10-28'].type,'basket-abs');
 assert.deepEqual(x.reads('kocluk-fitness-weeks-v1',{})['2026-10-26'],[]);
 assert.equal(x.store.getItem('kocluk-fitness-history-v1'),null);
 assert.equal(x.store.getItem('formarota-abs-history-v1'),null);
 x.publicApi.setDay('2026-10-28','full','');
 assert.equal(x.publicApi.getDay('2026-10-28').type,'full');
 assert.deepEqual(x.reads('kocluk-fitness-weeks-v1',{})['2026-10-26'],['2026-10-28']);
});
test('home shortcut can save a custom activity note and rejects invalid choices',()=>{
 const x=harness();
 assert.equal(x.publicApi.types.length,7);
 x.publicApi.setDay('2026-10-28','other','Yüzme');
 assert.equal(x.publicApi.getDay('2026-10-28').note,'Yüzme');
 x.publicApi.setDay('2026-10-28','rest','');
 assert.equal(x.publicApi.getDay('2026-10-28').type,'rest');
 assert.throws(()=>x.publicApi.setDay('2026-10-28','unsupported'));
 assert.throws(()=>x.publicApi.setDay('today','full'));
 assert.equal(x.publicApi.getDay('not-a-date'),null);
});

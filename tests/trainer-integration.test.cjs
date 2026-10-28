'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const root=path.resolve(__dirname,'..');
const read=file=>fs.readFileSync(path.join(root,file),'utf8');
const catalog=[
 {id:'incline',name:'Incline Chest Press Machine',reps:'8–12'},
 {id:'row',name:'Seated Cable Row',reps:'8–12',options:[{name:'Seated Cable Row'},{name:'Dumbbell Row'}]}
];
function harness(settings={}){
 const saved=new Map([['formarota-trainer-settings-v1',JSON.stringify(settings)]]);
 const localStorage={getItem:k=>saved.has(k)?saved.get(k):null,setItem:(k,v)=>saved.set(k,String(v))};
 const window={formaRotaFitnessCatalog:catalog};
 const document={readyState:'loading',addEventListener(){}};
 const context=vm.createContext({window,document,localStorage,queueMicrotask(){}});
 for(const file of ['assets/trainer-foundation.js','assets/coach-engine-v35.js','assets/trainer-adapter.js']){
  vm.runInContext(read(file),context,{filename:file});
 }
 return {E:window.FormaRotaCoachEngine,F:window.FormaRotaTrainerFoundation,adapter:window.FormaRotaTrainerAdapter,saved,context};
}
const set=(kg=40,reps=12,name='Incline Chest Press Machine')=>({done:true,weight:kg,reps,name});
const record=(date,reps=[12,12,12],kg=40,status='finished',name='Incline Chest Press Machine')=>
 ({date,status,items:{incline:reps.map(x=>set(kg,x,name))}});
const move=catalog[0];
test('new trainer scripts load after coach UI and before import-related controls are used',()=>{
 const index=read('index.html');
 for(const n of ['trainer-foundation.js','coach-engine-v35.js','coach-ui-v33.js','trainer-adapter.js'])
  assert.ok(index.includes('src="./assets/'+n+'"'),n);
 assert.ok(index.indexOf('src="./assets/trainer-foundation.js"')<index.indexOf('src="./assets/coach-engine-v35.js"'));
 assert.ok(index.indexOf('src="./assets/coach-ui-v33.js"')<index.indexOf('src="./assets/trainer-adapter.js"'));
});
test('both trainer assets are included in offline shell cache',()=>{
 const sw=read('sw.js');
 assert.ok(sw.includes("'./assets/trainer-foundation.js'"));
 assert.ok(sw.includes("'./assets/trainer-adapter.js'"));
 assert.match(sw,/formarota-solo-v\\d+-shell/);
 assert.ok(sw.includes('abs-heel-touch'));
});
test('JSON export and import preserve validated personal trainer settings',()=>{
 const index=read('index.html');
 assert.ok(index.includes('settings:window.FormaRotaTrainerAdapter?.readSettings?.()||{}'));
 assert.ok(index.includes("validateSettings?.(data.coach.settings)"));
 assert.ok(index.includes("['formarota-trainer-settings-v1',data.coach.settings]"));
 assert.ok(index.includes('const prior=new Map(changes.map'));
});
test('settings validate 13 movement IDs, alternate variants and proper limits',()=>{
 const {adapter}=harness();
 assert.equal(adapter.validateSettings({'row|Dumbbell Row':{min:8,max:12,step:1}}),true);
 assert.equal(adapter.validateSettings({'row|Dumbbell Row':{min:12,max:8,step:1}}),false);
 assert.equal(adapter.validateSettings({'row|Dumbbell Row':{min:8,max:12,step:0.5}}),false);
 assert.equal(adapter.validateSettings({'unknown|test':{min:8,max:12,step:1}}),false);
 assert.equal(adapter.validateSettings([]),false);
});
test('all exercise variants keep independent target settings',()=>{
 const settings={'row|Seated Cable Row':{min:9,max:13,step:5}};
 const {adapter}=harness(settings),row=catalog[1];
 const cable=adapter.getConfiguration(row,'Seated Cable Row',2.5),dumbbell=adapter.getConfiguration(row,'Dumbbell Row',2.5);
 assert.equal(cable.max,13);assert.equal(cable.step,5);
 assert.equal(dumbbell.max,12);assert.equal(dumbbell.step,1);
});
test('custom repetition ceiling changes the existing coach decision, with explicit approval',()=>{
 const h=[record('2026-10-25',[10,10,10]),record('2026-10-27',[10,10,10])];
 const normal=harness().E.assess(move,move.name,h,2.5,'2026-10-29');
 const {E}=harness({'incline|Incline Chest Press Machine':{min:8,max:10,step:1}});
 const updated=E.assess(move,move.name,h,2.5,'2026-10-29');
 assert.equal(normal.status,'hold');
 assert.equal(updated.status,'increase');
 assert.equal(updated.proposedIncrement,1);
 assert.equal(updated.requiresApproval,true);
 assert.equal(updated.nextTargetReps,8);
 assert.deepEqual(h[0].items.incline.map(s=>s.weight),[40,40,40]);
});
test('unequal reps and incomplete latest sessions do not trigger load increases',()=>{
 const {E}=harness();
 const hold=E.assess(move,move.name,[record('2026-10-25'),record('2026-10-27',[12,10,9])],2.5,'2026-10-29');
 const stopped=E.assess(move,move.name,[record('2026-10-25'),record('2026-10-27',[12,12,12],40,'stopped')],2.5,'2026-10-29');
 assert.equal(hold.status,'hold');
 assert.equal(stopped.status,'caution');
});
test('two workout entries on the same date do not count as two separate days',()=>{
 const {E}=harness();
 const res=E.assess(move,move.name,[record('2026-10-27'),record('2026-10-27')],2.5,'2026-10-29');
 assert.equal(res.status,'collect');
});
test('three distinct comparable days with declining reps block increases',()=>{
 const {E}=harness();
 const res=E.assess(move,move.name,[record('2026-10-19',[12,12,12]),record('2026-10-23',[11,11,11]),record('2026-10-27',[10,10,10])],2.5,'2026-10-29');
 assert.equal(res.status,'reassess');
 assert.match(res.detail,/üç ayrı gün/i);
});
test('workout report and exercise card use the same configured coach decision',()=>{
 const {E}=harness({'incline|Incline Chest Press Machine':{min:8,max:10,step:1}});
 const make=(date)=>{const row=record(date,[10,10,10]);for(const id of E.FULL_MOVES||['lat','row','pec','lateral','rear','push','overhead','zottman','legpress','extension','legcurl','calf'])
  row.items[id]=[1,2,3].map(()=>({done:true,weight:30,reps:12,name:id}));return row;};
 const history=[make('2026-10-26'),make('2026-10-28')];
 const card=E.assess(move,move.name,history,2.5,'2026-11-01');
 const report=E.report(history,[move],'2026-10-29',2,{},2.5,[]);
 assert.equal(card.status,'increase');
 assert.ok(report.messages.some(s=>s.includes(card.short)),JSON.stringify(report.messages));
});

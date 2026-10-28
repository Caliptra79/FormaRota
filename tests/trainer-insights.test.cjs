'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const source=p=>fs.readFileSync(path.join(__dirname,'..',p),'utf8');
function harness(extraUI=false,storage={}){
 const window={formaRotaFitnessCatalog:[],today:()=> '2026-10-29'};
 const localStorage={getItem:key=>storage[key]||null,setItem:(key,value)=>storage[key]=String(value)};
 const document={readyState:'loading',addEventListener(){}};
 const sandbox=vm.createContext({window,localStorage,document});
 for(const p of ['assets/trainer-foundation.js','assets/coach-engine-v35.js','assets/trainer-insights-engine.js',...(extraUI?['assets/trainer-insights-ui.js']:[])])
  vm.runInContext(source(p),sandbox,{filename:p});
 return {E:window.FormaRotaCoachEngine,M:window.FormaRotaTrainerInsights,window,localStorage};
}
const lat={id:'lat',name:'Lat Pulldown',reps:'8–12'};
const row={id:'row',name:'Seated Cable Row',reps:'8–12',options:[{name:'Seated Cable Row'},{name:'Dumbbell Row'}]};
function session(date,move=lat,variant=move.name,kg=40,reps=[8,9,10],status='finished'){
 return {date,status,items:{[move.id]:reps.map(n=>({done:true,name:variant,weight:kg,reps:n}))}};
}
const perf=(h,move=lat,variant=move.name)=>harness().M.performance({history:h,move,variant,asOf:'2026-10-29',coach:harness().E});
test('per-exercise series computes kg, repeats and actual sum(kg × reps) without multiplying sets twice',()=>{
 const x=perf([session('2026-10-28',lat,lat.name,40,[8,9,10])]);
 assert.equal(x.latest.maxKg,40);assert.equal(x.latest.totalReps,27);assert.equal(x.latest.volume,1080);
 assert.equal(x.latest.sets.length,3);
});
test('changes compare only last two distinct completed days',()=>{
 const x=perf([session('2026-10-21',lat,lat.name,40,[8,9,10]),session('2026-10-28',lat,lat.name,40,[10,10,10])]);
 assert.equal(x.changes.volume,120);assert.equal(x.changes.totalReps,3);assert.equal(x.changes.maxKg,0);
});
test('same-day duplicate completed entries use only latest',()=>{
 const x=perf([session('2026-10-28',lat,lat.name,40,[8,8,8]),session('2026-10-28',lat,lat.name,40,[10,10,10])]);
 assert.equal(x.entries.length,1);assert.equal(x.latest.totalReps,30);assert.equal(x.changes,null);
});
test('exercise variants and mixed variant sets never contaminate performance',()=>{
 const h=[session('2026-10-19',row,'Seated Cable Row'),session('2026-10-21',row,'Dumbbell Row',20),session('2026-10-28',row,'Seated Cable Row',45)];
 const result=perf(h,row,'Dumbbell Row');
 assert.equal(result.entries.length,1);assert.equal(result.latest.maxKg,20);
 const partial=session('2026-10-29',row,'Dumbbell Row',100);
 partial.items.row[0].name='Seated Cable Row';
 assert.equal(perf([...h,partial],row,'Dumbbell Row').entries.length,1);
});
test('half completed and numerically invalid histories never appear in charts',()=>{
 const bad=session('2026-10-24');bad.items.lat[0].weight='';
 const x=perf([session('2026-10-20'),session('2026-10-22',lat,lat.name,40,[8,8,8],'stopped'),bad]);
 assert.equal(x.entries.length,1);assert.equal(x.latest.date,'2026-10-20');
});
test('estimated 1RM uses eligible positive kg records only, and is explicitly not a real max',()=>{
 assert.equal(perf([session('2026-10-28',lat,lat.name,50,[8,9,10])]).latest.e1rm,66.7);
 assert.equal(perf([session('2026-10-28',lat,lat.name,50,[12,12,12])]).latest.e1rm,null);
 assert.equal(perf([session('2026-10-28',lat,lat.name,0,[8,9,10])]).latest.e1rm,null);
 assert.equal(perf([session('2026-10-28',lat,lat.name,40,[10,11,12])]).latest.e1rm,null);
});
test('empty and future dated histories yield insufficient trend',()=>{
 const {M,E}=harness();
 const r=M.performance({history:[session('2026-11-01')],move:lat,variant:lat.name,asOf:'2026-10-29',coach:E});
 assert.equal(r.entries.length,0);assert.equal(r.latest,null);
});
const recovery=(options={})=>{const {M,E}=harness();return M.recovery({asOf:'2026-10-29',coach:E,moves:[lat,row],...options});};
test('missing sleep and energy are never interpreted as poor recovery',()=>{
 const r=recovery();assert.equal(r.status,'insufficient');assert.equal(r.allowIncrease,true);
 assert.equal(r.signals.length,0);
});
test('one low sleep observation alone does not claim high fatigue',()=>{
 const r=recovery({sleepLog:{'2026-10-28':{hours:5.5}}});
 assert.equal(r.status,'watch');assert.equal(r.signals.length,1);assert.equal(r.allowIncrease,true);
});
test('two independent current signals produce cautious fatigue status and block increase',()=>{
 const r=recovery({sleepLog:{'2026-10-28':{hours:5,energy:2}}});
 assert.equal(r.status,'caution');assert.equal(r.allowIncrease,false);
 assert.match(r.headline,/Yüksek yorgunluk/i);
});
test('future, stale and invalid sleep values are excluded',()=>{
 const r=recovery({sleepLog:{'2026-10-20':{hours:2,energy:1},'2026-10-31':{hours:4,energy:1},'2026-10-29':{hours:0,energy:0}}});
 assert.equal(r.status,'insufficient');assert.equal(r.signals.length,0);
});
test('self-reported pain takes priority even without training history',()=>{
 const r=recovery({painReported:true,sleepLog:{'2026-10-29':{hours:8,energy:5}}});
 assert.equal(r.status,'pain');assert.equal(r.allowIncrease,false);assert.match(r.advice,/ağrılı hareketi/i);
});
test('frequent recent sessions are only a cautious signal, never a recovery percentage',()=>{
 const r=recovery({fullHistory:[session('2026-10-27'),session('2026-10-28')]});
 assert.equal(r.status,'watch');assert.equal(r.signals.length,1);
 assert.doesNotMatch(JSON.stringify(r),/%\s*\d+|toparlanma yüzdesi/i);
});
test('three comparable session declines count as performance signal',()=>{
 const h=[session('2026-10-18',lat,lat.name,40,[12,12,12]),session('2026-10-23',lat,lat.name,40,[11,11,11]),session('2026-10-27',lat,lat.name,40,[10,10,10])];
 const r=recovery({fullHistory:h});
 assert.equal(r.performanceDeclines,1);assert.ok(r.signals.includes('performance'));
});
test('weight changes, duplicate same-day sessions, or stale decline do not generate performance decline',()=>{
 const h=[session('2026-10-18',lat,lat.name,40,[12,12,12]),session('2026-10-23',lat,lat.name,42.5,[11,11,11]),session('2026-10-27',lat,lat.name,42.5,[10,10,10])];
 assert.equal(recovery({fullHistory:h}).performanceDeclines,0);
});
test('widely spaced sessions do not imply muscle recovery risk',()=>{
 const r=recovery({fullHistory:[session('2026-10-21'),session('2026-10-28')]});
 assert.equal(r.signals.includes('muscle-interval'),false);
});
test('adjacent days with unrelated muscles do not imply repeated muscle loading',()=>{
 const r=recovery({fullHistory:[session('2026-10-27')],absHistory:[{
  date:'2026-10-28',status:'finished',items:{plank:[{done:true,seconds:40}]}
 }]});
 assert.equal(r.signals.includes('muscle-interval'),false);
});
test('source fitness and wellness objects are not modified',()=>{
 const fullHistory=[session('2026-10-28')],sleepLog={'2026-10-28':{hours:5,energy:2}};
 const before=JSON.stringify({fullHistory,sleepLog});
 recovery({fullHistory,sleepLog});
 assert.equal(JSON.stringify({fullHistory,sleepLog}),before);
});
test('UI adds graph controls to existing chart, preserves no-version and offline cached dependencies',()=>{
 const index=source('index.html'),sw=source('sw.js'),css=source('assets/coach-quality-v33.css');
 for(const f of ['trainer-insights-engine.js','trainer-insights-ui.js']){
  assert.ok(index.includes('./assets/'+f));assert.ok(sw.includes('./assets/'+f));
 }
 assert.ok(index.indexOf('trainer-insights-engine.js')<index.indexOf('trainer-insights-ui.js'));
 assert.ok(index.indexOf('trainer-insights-ui.js')>index.indexOf('trainer-adapter.js'));
 assert.ok(css.includes('#trainerGraphMetrics'));assert.ok(sw.includes('formarota-solo-v72-shell'));
});
test('active coach with two fatigue signals changes increase to caution without modifying old workout weights',()=>{
 const h=[session('2026-10-23',lat,lat.name,40,[12,12,12]),session('2026-10-28',lat,lat.name,40,[12,12,12])];
 const storage={'kocluk-fitness-history-v1':JSON.stringify(h),'formarota-sleep-energy-v1':JSON.stringify({'2026-10-28':{hours:5,energy:2}})};
 const {E}=harness(true,storage);
 const r=E.assess(lat,lat.name,h,2.5,'2026-10-29');
 assert.equal(r.status,'caution');assert.match(r.short,/artışını ertele/i);
 assert.equal(JSON.stringify(h),storage['kocluk-fitness-history-v1']);
});
test('current pain signals do not rewrite historical exercise coach recommendations',()=>{
 const h=[session('2026-10-12',lat,lat.name,40,[12,12,12]),session('2026-10-17',lat,lat.name,40,[12,12,12])];
 const storage={'formarota-sleep-energy-v1':JSON.stringify({'2026-10-29':{hours:5,energy:2}})};
 const {E}=harness(true,storage);
 assert.equal(E.assess(lat,lat.name,h,2.5,'2026-10-17').status,'increase');
});

test('current-week coach report prioritizes fatigue warning, without rewriting older reports',()=>{
 const history=[session('2026-10-28',lat,lat.name,40,[12,12,12])];
 const storage={'kocluk-fitness-history-v1':JSON.stringify(history),
  'formarota-sleep-energy-v1':JSON.stringify({'2026-10-28':{hours:5,energy:2}})};
 const {E}=harness(true,storage);
 const current=E.report(history,[lat],'2026-10-29',2,{},2.5,[]);
 assert.match(current.messages[0],/Toparlanma/i);
 assert.ok(current.messages.every(s=>!s.includes('artışını değerlendirebilirsin')));
 const past=E.report(history,[lat],'2026-10-19',2,{},2.5,[]);
 assert.ok(past.messages.every(s=>!s.startsWith('Toparlanma:')));
});

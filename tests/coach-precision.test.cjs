// FormaRota coach precision regression tests.
// Run: node --test tests/coach-precision.test.cjs
const {test}=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const fs=require('node:fs');
const path=require('node:path');
const read=name=>fs.readFileSync(path.join(__dirname,'..',name),'utf8');
const win={};
vm.runInNewContext(read('assets/coach-engine-v35.js'),{window:win});
const E=win.FormaRotaCoachEngine;
const MOVE={id:'lat',name:'Lat Pulldown',reps:'8–12'};
const CALF={id:'calf',name:'Bodyweight Standing Calf Raise',reps:'15–25'};
function session(date,{kg=30,reps=12,move=MOVE,variant=move.name,time='10:00:00'}={}){
 return {status:'finished',date,endedAt:date+'T'+time+'Z',items:{
  [move.id]:Array.from({length:3},()=>({done:true,weight:kg,reps,name:variant}))
 }};
}
const evaluate=(history,increment=2.5,move=MOVE,variant=move.name)=>E.assess(move,variant,history,increment,'2026-10-24');
test('one distinct day with two sessions is insufficient to increase weight',()=>{
 const a=session('2026-10-20',{time:'10:00:00'});
 const b=session('2026-10-20',{time:'18:00:00'});
 const result=evaluate([a,b]);
 assert.equal(result.status,'collect');
 assert.equal(result.completed,1);
 assert.equal(result.fullSessions,2);
 assert.equal(result.basis.previous,null);
});
test('three sessions on two separate days use latest attempt per distinct date',()=>{
 const early=session('2026-10-19');
 const morning=session('2026-10-22',{time:'08:00:00'});
 const evening=session('2026-10-22',{time:'20:00:00'});
 const result=evaluate([evening,early,morning]);
 assert.equal(result.status,'increase');
 assert.equal(result.completed,2);
 assert.equal(result.fullSessions,3);
 assert.equal(result.basis.previous.date,'2026-10-19');
 assert.equal(result.basis.latest.date,'2026-10-22');
});
test('a very large percentage increase is rejected, not silently reduced',()=>{
 const hist=[session('2026-10-16',{kg:5}),session('2026-10-20',{kg:5})];
 const out=evaluate(hist,2.5);
 assert.equal(out.status,'step_large');
 assert.equal(out.proposedIncrement,2.5);
 assert.equal(out.proposedPercent,50);
 assert.match(out.short,/%50/);
 assert.doesNotMatch(out.short,/7,5 kg artışını değerlendirebilirsin/);
 assert.equal(hist[0].items.lat[0].weight,5);
});
test('10 percent threshold is allowed but 12.5 percent is not',()=>{
 assert.equal(E.MAX_STEP_SHARE,0.10);
 assert.equal(evaluate([session('2026-10-16',{kg:25}),session('2026-10-20',{kg:25})],2.5).status,'increase');
 assert.equal(evaluate([session('2026-10-16',{kg:20}),session('2026-10-20',{kg:20})],2.5).status,'step_large');
});
test('user-selected five kilogram step cannot override conservative threshold',()=>{
 const h=[session('2026-10-16',{kg:30}),session('2026-10-20',{kg:30})];
 assert.equal(evaluate(h,5).status,'step_large');
 assert.equal(evaluate(h,2.5).status,'increase');
 assert.equal(evaluate(h,1).status,'increase');
});
test('bodyweight calf raises do not generate a kilogram increment',()=>{
 const h=[session('2026-10-16',{move:CALF,kg:0,reps:25}),session('2026-10-20',{move:CALF,kg:0,reps:25})];
 assert.equal(evaluate(h,2.5,CALF).status,'bodyweight');
});
test('different equipment alternatives remain independently evaluated',()=>{
 const a=session('2026-10-16',{variant:'Lat Pulldown'});
 const b=session('2026-10-20',{variant:'Band Pull'});
 const result=evaluate([a,b],2.5,MOVE,'Lat Pulldown');
 assert.equal(result.status,'collect');
});
test('low repetitions and incomplete sessions never give a load increase',()=>{
 const base=session('2026-10-16');
 const weak=session('2026-10-20',{reps:7});
 assert.equal(evaluate([base,weak]).status,'hold');
 const interrupted=session('2026-10-20');
 interrupted.status='stopped';interrupted.items.lat[1].done=false;
 assert.equal(evaluate([base,interrupted]).status,'caution');
});
test('old performance is still considered stale',()=>{
 const old=[session('2026-01-05'),session('2026-01-15')];
 assert.equal(evaluate(old).status,'reassess');
});
test('weekly report describes disproportionate step as caution',()=>{
 const ids=['lat','row','incline','pec','lateral','rear','push','overhead','zottman','legpress','extension','legcurl','calf'];
 const full=date=>({date,status:'finished',items:Object.fromEntries(ids.map(id=>[id,
  Array.from({length:3},()=>({done:true,weight:id==='lat'?5:30,reps:12,name:id==='lat'?'Lat Pulldown':id}))]))});
 const result=E.report([full('2026-10-19'),full('2026-10-23')],[MOVE],'2026-10-24',2,{},2.5);
 assert.equal(result.finished,2);
 assert.ok(result.messages.some(x=>/fazla büyük/.test(x)));
 assert.ok(!result.messages.some(x=>/7,5 kg artışını/.test(x)));
});
function setFixture(moveId,kgValue){
 const html=read('index.html'),start=html.indexOf('function fitMarkSet(id,i){');
 const end=html.indexOf('function fitStartPhase(',start);
 assert.ok(start>=0&&end>start,'Workout logger function must exist');
 const s=html.slice(start,end);
 const alerts=[],events=[];
 const curr={items:{
  lat:[{done:false,reps:12,weight:''}],
  calf:[{done:false,reps:20,weight:''}]
 }};
 const fields=new Map([
  ['fit-'+moveId+'-0-kg',{value:kgValue}],
  ['fit-'+moveId+'-0-reps',{value:moveId==='calf'?'20':'12'}]
 ]);
 const env={
  fitCurrent:curr,
  FIT_MOVES:[{id:'lat',name:'Lat Pulldown'},{id:'calf',name:'Bodyweight Standing Calf Raise'}],
  $:id=>fields.get(id),
  alert:msg=>alerts.push(msg),
  fitActiveVariant:move=>move,
  fitRepsCompleted:()=>1,
  fitStartPhase:kind=>events.push(kind),
  fitStopPhase:()=>events.push('stopped'),
  fitSaveCurrent:()=>events.push('saved'),
  fitDrawExercises:()=>events.push('drawn'),
  fitSyncClock:()=>events.push('synced'),
  window:{formarotaReady:false}
 };
 vm.runInNewContext(s+';this.markSet=fitMarkSet;',env);
 return {env,alerts,events,curr,mark:()=>env.markSet(moveId,0)};
}
test('blank machine weight blocks logging without touching the active session',()=>{
 const f=setFixture('lat','');
 const before=JSON.stringify(f.curr);
 f.mark();
 assert.equal(JSON.stringify(f.curr),before);
 assert.equal(f.events.length,0);
 assert.match(f.alerts[0],/Ağırlık/);
});
test('explicit 0 kg is accepted as an intentional machine entry',()=>{
 const f=setFixture('lat','0');
 f.mark();
 assert.equal(f.curr.items.lat[0].weight,0);
 assert.equal(f.curr.items.lat[0].done,true);
 assert.ok(f.events.includes('saved'));
});
test('blank bodyweight calf kg remains permitted and stores 0 kg',()=>{
 const f=setFixture('calf','');
 f.mark();
 assert.equal(f.curr.items.calf[0].weight,0);
 assert.equal(f.curr.items.calf[0].reps,20);
 assert.equal(f.curr.items.calf[0].done,true);
});
test('existing data and PWA branding remain unchanged',()=>{
 const html=read('index.html'),manifest=JSON.parse(read('manifest.webmanifest'));
 assert.equal(manifest.name,'FormaRota Solo');
 assert.doesNotMatch(html,/name="application-version"/);
 assert.ok(html.includes("function collectBackup(){return{version:7"));
 assert.ok(html.includes('figure.append(picture)'));
 assert.ok(html.includes('const FIT_MOVES=['));
 assert.ok(html.includes('./assets/coach-engine-v35.js'));
});

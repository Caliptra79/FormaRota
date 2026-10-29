// FormaRota v33 conservative coach quality regression suite.
// Run: node --test tests/coach-v33.test.cjs
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const context={window:{}};
vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../assets/coach-engine-v33.js'),'utf8'),context);
const E=context.window.FormaRotaCoachEngine;
const ALL=['lat','row','incline','pec','lateral','rear','push','overhead','zottman','legpress','extension','legcurl','calf'];
const lat={id:'lat',name:'Lat Pulldown',reps:'8–12'};
const row={id:'row',name:'Seated Cable Row',reps:'8–12',options:[{name:'Seated Cable Row'},{name:'Dumbbell Row'}]};
const calf={id:'calf',name:'Bodyweight Standing Calf Raise',reps:'15–25'};
function sets(move=lat,kg=30,reps=12,count=3,variant=move.name){
 return Array.from({length:3},(_,i)=>({name:variant,weight:kg,reps,done:i<count}));
}
function session(date,opts={}){
 const move=opts.move||lat;
 const items=opts.all
  ?Object.fromEntries(ALL.map(id=>[id,sets(id==='calf'?calf:id==='row'?row:id==='lat'?lat:{id,name:id},opts.kg??30,opts.reps??12,3,id==='lat'?'Lat Pulldown':id)]))
  :{[move.id]:sets(move,opts.kg??30,opts.reps??12,opts.count??3,opts.variant||move.name)};
 return {date,status:opts.status||'finished',items};
}
test('current, matching two complete exercise records generate only optional step',()=>{
 const hist=[session('2026-10-09'),session('2026-10-16')],before=JSON.stringify(hist);
 const suggestion=E.assess(lat,lat.name,hist,2.5,'2026-10-24');
 assert.equal(suggestion.status,'increase');
 assert.match(suggestion.short,/30 kg → 32,5 kg/);
 assert.equal(JSON.stringify(hist),before,'History must never be changed by coaching');
 assert.equal(suggestion.basis.previous.date,'2026-10-09');
 assert.equal(suggestion.basis.latest.date,'2026-10-16');
 assert.equal(suggestion.basis.latest.sets.length,3);
});
test('freshness threshold is explicitly 28 days',()=>{
 assert.equal(E.FRESH_DAYS,28);
 const recent=[session('2026-09-24'),session('2026-10-01')];
 assert.equal(E.assess(lat,lat.name,recent,2.5,'2026-10-24').status,'increase');
 assert.equal(E.assess(lat,lat.name,recent,2.5,'2026-10-30').status,'reassess');
});
test('several months since exercise prevents new increase',()=>{
 const old=[session('2026-01-05'),session('2026-01-12')];
 const result=E.assess(lat,lat.name,old,2.5,'2026-10-24');
 assert.equal(result.status,'reassess');
 assert.doesNotMatch(result.short,/32,5/);
});
test('long gap between two workouts blocks progress suggestion',()=>{
 const history=[session('2026-01-05'),session('2026-10-20')];
 assert.equal(E.assess(lat,lat.name,history,2.5,'2026-10-24').status,'reassess');
});
test('invalid blank weight and invalid repetitions are not silently converted to zero',()=>{
 for(const invalid of ['', ' ', null, 'abc', undefined]){
  assert.equal(E.isValidSet({done:true,weight:invalid,reps:12}),false,String(invalid));
 }
 for(const reps of ['',0,2.5,101]){
  assert.equal(E.isValidSet({done:true,weight:30,reps}),false,String(reps));
 }
 assert.equal(E.isValidSet({done:true,weight:'32.5',reps:'12'}),true);
});
test('corrupt latest record cancels a previous valid increase, without deleting any record',()=>{
 const hist=[session('2026-10-09'),session('2026-10-16')];
 const bad=session('2026-10-20');bad.items.lat[0].weight='';
 hist.push(bad);
 const before=JSON.stringify(hist);
 assert.equal(E.assess(lat,lat.name,hist,2.5,'2026-10-24').status,'invalid');
 assert.equal(JSON.stringify(hist),before);
});
test('all 13 moves with 3 valid sets each are required for completed Full Body',()=>{
 const complete=session('2026-10-20',{all:true});
 assert.equal(E.fullWorkout(complete),true);
 for(const moveId of ALL){
  const broken=JSON.parse(JSON.stringify(complete));
  broken.items[moveId][0].done=false;
  assert.equal(E.fullWorkout(broken),false,moveId);
 }
});
test('a finished session with a blank machine weight is partial, not full',()=>{
 const broken=session('2026-10-20',{all:true});
 broken.items.lat[2].weight='';
 const week=E.weekly([broken],'2026-10-24',2,[]);
 assert.equal(week.finished,0);
 assert.equal(week.partial,1);
 assert.equal(week.sets,39);
 assert.equal(week.validSets,38);
});
test('two complete workouts on the same day make one training day',()=>{
 const hist=[session('2026-10-19',{all:true}),session('2026-10-19',{all:true})];
 const w=E.weekly(hist,'2026-10-21',2,['2026-10-19','2026-10-23']);
 assert.equal(w.finished,1);
 assert.equal(w.fullSessions,2);
 assert.equal(w.sets,78);
 const report=E.report(hist,[lat],'2026-10-21',2,{},2.5);
 assert.equal(report.finished,1);
 assert.ok(report.messages.some(m=>m.includes('Aynı güne')));
});
test('two workouts on distinct days meet the two-day target',()=>{
 const hist=[session('2026-10-19',{all:true}),session('2026-10-23',{all:true})];
 assert.equal(E.weekly(hist,'2026-10-21',2,[]).finished,2);
});
test('incomplete weekly date selection is not mistaken for missed training',()=>{
 const w=E.weekly([],'2026-10-22',2,['2026-10-19']);
 assert.equal(w.planReady,false);
 assert.equal(w.plannedCount,1);
 assert.equal(E.reschedule(w,'2026-10-22').missed.length,0);
});
test('only a complete weekly schedule allows reschedule guidance',()=>{
 const w=E.weekly([],'2026-10-22',2,['2026-10-19','2026-10-23']);
 assert.equal(w.planReady,true);
 assert.deepEqual(Array.from(E.reschedule(w,'2026-10-22').missed),['2026-10-19']);
});
test('a stopped session is attended, not missed and not completed',()=>{
 const w=E.weekly([session('2026-10-19',{status:'stopped'})],'2026-10-22',2,['2026-10-19','2026-10-23']);
 assert.equal(w.finished,0);
 assert.equal(w.partial,1);
 assert.equal(w.attended['2026-10-19'],1);
 assert.equal(E.reschedule(w,'2026-10-22').missed.length,0);
});
test('Wednesday is available as a Full Body training day',()=>{
 const w=E.weekly([],'2026-10-21',3,[]);
 assert.equal(w.planned.includes(w.days[2]),true);
});
test('dumbbell vs cable row histories never mix',()=>{
 const machine=session('2026-10-09',{move:row,variant:'Seated Cable Row'});
 const dumbbell=session('2026-10-16',{move:row,variant:'Dumbbell Row'});
 assert.equal(E.assess(row,'Seated Cable Row',[machine,dumbbell],2.5,'2026-10-24').completed,1);
 assert.equal(E.assess(row,'Dumbbell Row',[machine,dumbbell],2.5,'2026-10-24').completed,1);
});
test('the most recently skipped exercise does not mean failed performance',()=>{
 const hist=[session('2026-10-09'),session('2026-10-16'),session('2026-10-23',{move:row,status:'stopped'})];
 assert.equal(E.assess(lat,lat.name,hist,2.5,'2026-10-24').status,'increase');
});
test('a stopped partial attempt on the same movement postpones an increase',()=>{
 const hist=[session('2026-10-09'),session('2026-10-16'),session('2026-10-23',{status:'stopped',count:1})];
 assert.equal(E.assess(lat,lat.name,hist,2.5,'2026-10-24').status,'caution');
});
test('bodyweight calf with 0 kg is not classified as unloaded gym machine',()=>{
 const hist=[session('2026-10-09',{move:calf,kg:0,reps:25}),session('2026-10-16',{move:calf,kg:0,reps:25})];
 assert.equal(E.assess(calf,calf.name,hist,2.5,'2026-10-24').status,'bodyweight');
});
test('machine 0 kg is not a reason to recommend adding a plate',()=>{
 const hist=[session('2026-10-09',{kg:0}),session('2026-10-16',{kg:0})];
 assert.equal(E.assess(lat,lat.name,hist,2.5,'2026-10-24').status,'hold');
});
test('a historical report cannot borrow a future workout',()=>{
 const future=[session('2026-10-29',{all:true}),session('2026-11-06',{all:true})];
 const result=E.report(future,[lat],'2026-10-20',2,{},2.5);
 assert.equal(result.finished,0);
 assert.equal(result.messages.length,1);
});
test('a historical report does not recommend a move absent from that week',()=>{
 const hist=[session('2026-10-05'),session('2026-10-12'),session('2026-10-20',{all:true})];
 const result=E.report(hist,[row],'2026-10-20',2,{},2.5);
 assert.ok(!result.messages.some(x=>/Seated Cable Row:.*artış/.test(x)));
});
test('old comparisons with a new full-body workout require reassessment',()=>{
 const hist=[session('2026-01-05'),session('2026-01-12'),session('2026-10-20',{all:true})];
 const result=E.report(hist,[lat],'2026-10-20',2,{},2.5);
 assert.equal(result.finished,1);
 assert.ok(!result.messages.some(x=>x.includes('32,5 kg')));
 assert.ok(result.messages.some(x=>/uzun ara|doğrula/.test(x)));
});
test('report uses the actually performed variant from the selected week',()=>{
 const hist=[session('2026-10-05',{move:row,variant:'Seated Cable Row'}),session('2026-10-12',{move:row,variant:'Seated Cable Row'}),session('2026-10-20',{all:true})];
 hist[2].items.row.forEach(x=>{x.name='Dumbbell Row';x.reps=12;});
 const result=E.report(hist,[row],'2026-10-20',2,{row:0},2.5);
 assert.equal(result.finished,1);
 assert.ok(!result.messages.some(x=>x.includes('Seated Cable Row:')&&x.includes('artış')));
});

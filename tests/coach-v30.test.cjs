// Run from the repo root: node --test tests/coach-v30.test.cjs
const test=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const fs=require('node:fs');
const path=require('node:path');
const browser={window:{}};
vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../assets/coach-engine-v30.js'),'utf8'),browser);
const coach=browser.window.FormaRotaCoachEngine;
const lat={id:'lat',name:'Lat Pulldown',reps:'8–12'};
const row={id:'row',name:'Seated Cable Row',reps:'8–12',options:[
 {name:'Seated Cable Row'},{name:'Dumbbell Row'}]};
const calf={id:'calf',name:'Bodyweight Standing Calf Raise',reps:'15–25'};
function session(date,move,weight,reps,name=move.name,status='finished',done=3){
 return {date,status,items:{[move.id]:reps.map((rep,i)=>({
  name,done:i<done,weight,reps:rep
 }))}};
}
test('insufficient data does not trigger weight increases',()=>{
 assert.equal(coach.assess(lat,lat.name,[],2.5).status,'initial');
 assert.equal(coach.assess(lat,lat.name,[session('2026-10-01',lat,30,[12,12,12])],2.5).status,'collect');
});
test('two matching completed sessions give an optional, not automatic, increment',()=>{
 const history=[session('2026-10-01',lat,30,[12,12,12]),session('2026-10-08',lat,30,[12,12,12])];
 const before=JSON.stringify(history);
 const result=coach.assess(lat,lat.name,history,2.5);
 assert.equal(result.status,'increase');
 assert.match(result.short,/32,5 kg/);
 assert.equal(JSON.stringify(history),before);
});
test('short reps, stopped sessions and partial sessions do not trigger an increase',()=>{
 const ok=session('2026-10-01',lat,30,[12,12,12]);
 assert.equal(coach.assess(lat,lat.name,[ok,session('2026-10-08',lat,30,[7,10,10])],2.5).status,'hold');
 assert.equal(coach.assess(lat,lat.name,[ok,session('2026-10-08',lat,30,[12,12,12],lat.name,'stopped')],2.5).status,'collect');
 assert.equal(coach.assess(lat,lat.name,[ok,session('2026-10-08',lat,30,[12,12,12],lat.name,'finished',2)],2.5).status,'collect');
});
test('machine and dumbbell row history remain separate',()=>{
 const history=[
  session('2026-10-01',row,30,[12,12,12],'Seated Cable Row'),
  session('2026-10-08',row,30,[12,12,12],'Dumbbell Row')
 ];
 assert.equal(coach.assess(row,'Seated Cable Row',history,2.5).completed,1);
 assert.equal(coach.assess(row,'Dumbbell Row',history,2.5).completed,1);
});
test('bodyweight exercises do not receive arbitrary kilogram increments',()=>{
 const history=[session('2026-10-01',calf,0,[25,25,25]),session('2026-10-08',calf,0,[25,25,25])];
 assert.equal(coach.assess(calf,calf.name,history,2.5).status,'bodyweight');
});
test('weekly training suggestions reserve Wednesday for basketball',()=>{
 const suggested=coach.weekly([], '2026-10-21',3,[]);
 assert.equal(suggested.target,3);
 assert.equal(suggested.custom,false);
 assert.equal(suggested.planned.includes(suggested.days[2]),false);
 assert.equal(coach.reschedule(suggested,'2026-10-22').missed.length,0);
 const chosen=coach.weekly([],'2026-10-21',2,['2026-10-19','2026-10-23']);
 assert.equal(coach.reschedule(chosen,'2026-10-22').missed.length,1);
});
test('historical reports do not use future training sessions',()=>{
 const upcoming=[session('2026-10-31',lat,30,[12,12,12]),session('2026-11-07',lat,30,[12,12,12])];
 const report=coach.report(upcoming,[lat],'2026-10-19',2,{},2.5);
 assert.equal(report.finished,0);
 assert.equal(report.messages.length,1);
});
test('weekly report counts only finished sessions and their completed sets',()=>{
 const history=[
  session('2026-10-19',lat,30,[10,10,10]),
  session('2026-10-21',lat,30,[10,10,10],lat.name,'stopped'),
  session('2026-10-23',lat,30,[10,10,10],lat.name,'finished',2)
 ];
 const report=coach.report(history,[lat],'2026-10-21',2,{},2.5);
 assert.equal(report.finished,2);
 assert.equal(report.sets,5);
});

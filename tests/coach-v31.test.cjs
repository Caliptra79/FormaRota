// Run from repository root: node --test tests/coach-v31.test.cjs
const {test}=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs'),path=require('node:path');
const window={};
vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../assets/coach-engine-v30.js'),'utf8'),{window});
const E=window.FormaRotaCoachEngine;
const lat={id:'lat',name:'Lat Pulldown',reps:'8–12'};
const calf={id:'calf',name:'Bodyweight Standing Calf Raise',reps:'15–25'};
function session(date,status='finished',kg=30,reps=12,done=3,move=lat){
 return {date,status,items:{[move.id]:Array.from({length:3},(_,i)=>({done:i<done,weight:kg,reps,name:move.name}))}};
}
test('later stopped or incomplete session postpones automatic weight recommendation',()=>{
 const base=[session('2026-10-01'),session('2026-10-08')];
 assert.equal(E.assess(lat,lat.name,base,2.5).status,'increase');
 assert.equal(E.assess(lat,lat.name,[...base,session('2026-10-15','stopped',30,6,1)],2.5).status,'caution');
 assert.equal(E.assess(lat,lat.name,[...base,session('2026-10-15','finished',30,6,1)],2.5).status,'caution');
});
test('finished status without all 39 sets does not count as full-body completion',()=>{
 let w=E.weekly([session('2026-10-19','finished',30,10,1)],'2026-10-21',2,[]);
 assert.equal(w.finished,0);assert.equal(w.partial,1);assert.equal(w.sets,1);
 w=E.weekly([session('2026-10-19','stopped')],'2026-10-21',2,[]);
 assert.equal(w.finished,0);assert.equal(w.partial,1);
});
test('39 completed sets count as a full session',()=>{
 const keys=['lat','row','incline','pec','lateral','rear','push','overhead','zottman','legpress','extension','legcurl','calf'];
 const items=Object.fromEntries(keys.map(id=>[id,Array.from({length:3},()=>({done:true,weight:20,reps:10}))]));
 const w=E.weekly([{date:'2026-10-19',status:'finished',items}],'2026-10-21',2,[]);
 assert.equal(w.finished,1);assert.equal(w.sets,39);assert.equal(w.partial,0);
});
test('0 kg on machines is not treated as bodyweight, while calf raises are',()=>{
 assert.equal(E.assess(lat,lat.name,[session('2026-10-01','finished',0),session('2026-10-08','finished',0)],2.5).status,'hold');
 assert.equal(E.assess(calf,calf.name,[session('2026-10-01','finished',0,25,3,calf),session('2026-10-08','finished',0,25,3,calf)],2.5).status,'bodyweight');
});
test('stopped workouts are not counted as completed planned workouts',()=>{
 const w=E.weekly([session('2026-10-19','stopped')],'2026-10-21',2,['2026-10-19','2026-10-23']);
 assert.equal(w.perDay['2026-10-19'],0);
 assert.equal(w.attended['2026-10-19'],1);
 assert.equal(E.reschedule(w,'2026-10-22').missed.length,0);
});

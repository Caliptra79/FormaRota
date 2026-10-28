'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const F=require('../assets/trainer-foundation.js');
const set=(weight=40,reps=12,name='Incline Chest Press Machine')=>({done:true,weight,reps,name});
const full=(date,reps=[12,12,12],weight=40,status='finished',name='Incline Chest Press Machine')=>({date,status,items:{incline:reps.map(n=>set(weight,n,name))}});
const args=(history)=>({moveId:'incline',variant:'Incline Chest Press Machine',history,range:[8,12],step:2.5,asOf:'2026-10-29'});
test('one completed day does not permit increase',()=>assert.equal(F.doubleProgression(args([full('2026-10-27')])).status,'insufficient'));
test('two upper-bound days permit optional increase, with lower repeat target',()=>{
 const r=F.doubleProgression(args([full('2026-10-25'),full('2026-10-27')]));
 assert.equal(r.status,'consider_increase');assert.equal(r.suggestedKg,42.5);assert.equal(r.nextTargetReps,8);assert.equal(r.requiresApproval,true);
});
test('12/10/9 holds weight',()=>assert.equal(F.doubleProgression(args([full('2026-10-25'),full('2026-10-27',[12,10,9])])).status,'hold'));
test('two records on same day count as one',()=>assert.equal(F.doubleProgression(args([full('2026-10-27'),full('2026-10-27')])).status,'insufficient'));
test('partial and invalid latest workouts cannot trigger increase',()=>{
 const a=full('2026-10-25'),b=full('2026-10-27');b.status='stopped';
 assert.equal(F.doubleProgression(args([a,b])).status,'caution');
 const c=full('2026-10-27');c.items.incline[0].weight='';
 assert.equal(F.doubleProgression(args([a,c])).status,'caution');
});
test('variants are isolated',()=>{
 const h=[full('2026-10-25'),full('2026-10-27',[12,12,12],40,'Dumbbell Press')];
 assert.equal(F.doubleProgression(args(h)).status,'insufficient');
});
test('oversized step rejected; old records remain unmodified',()=>{
 const h=[full('2026-10-25',[12,12,12],20),full('2026-10-27',[12,12,12],20)],before=JSON.stringify(h);
 assert.equal(F.doubleProgression(args(h)).status,'hold');assert.equal(JSON.stringify(h),before);
});
test('stale records are not used to increase',()=>assert.equal(F.doubleProgression(args([full('2026-08-01'),full('2026-08-05')])).status,'stale'));
test('volume uses only valid completed sets and separately counts assistance',()=>{
 const history=[{date:'2026-10-26',status:'stopped',items:{lat:[set(30,10,'Lat Pulldown'),{done:false},set('',12,'Lat Pulldown')],legpress:[set(80,10)]}}];
 const x=F.weeklyVolume({fullHistory:history,start:'2026-10-26',end:'2026-11-01'});
 assert.equal(x.physicalSets,2);assert.equal(x.byMuscle['Sırt'].primarySets,1);
 assert.equal(x.byMuscle['Biceps'].secondarySets,1);assert.equal(x.byMuscle['Ön bacak'].primarySets,1);
});
test('ABS plank counts time, not repetitions',()=>{
 const abs=[{date:'2026-10-28',status:'finished',items:{plank:[{done:true,seconds:35},{done:true,seconds:0}], 'heel-touch':[{done:true,reps:20}]}}];
 const x=F.weeklyVolume({absHistory:abs,start:'2026-10-26',end:'2026-11-01'});
 assert.equal(x.physicalSets,2);assert.equal(x.byMuscle['Core'].primarySets,1);assert.equal(x.byMuscle['Oblik'].primarySets,1);
});
test('source and legacy records are not modified',()=>{
 const history=[full('2026-10-25')],before=JSON.stringify(history);
 F.weeklyVolume({fullHistory:history,start:'2026-10-26',end:'2026-11-01'});
 F.doubleProgression(args(history));assert.equal(JSON.stringify(history),before);
});

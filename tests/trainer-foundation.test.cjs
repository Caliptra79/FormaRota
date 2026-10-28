'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const F=require('../assets/trainer-foundation.js');
const set=(weight=40,reps=12,name='Lat Pulldown')=>({done:true,weight,reps,name});
test('Full Body valid sets require explicit completion and numeric values',()=>{
 assert.equal(F.validFullSet(set(30,10)),true);
 assert.equal(F.validFullSet(set('',10)),false);
 assert.equal(F.validFullSet({...set(30,10),done:false}),false);
 assert.equal(F.validFullSet(set(30,2.5)),false);
});
test('volume counts a valid set once, and assistant muscle only as secondary',()=>{
 const history=[{date:'2026-10-27',status:'stopped',items:{lat:[set(30,10),{done:false},set('',12)],legpress:[set(80,10)]}}];
 const result=F.weeklyVolume({fullHistory:history,start:'2026-10-26',end:'2026-11-01'});
 assert.equal(result.physicalSets,2);
 assert.equal(result.byMuscle['Sırt'].primarySets,1);
 assert.equal(result.byMuscle['Biceps'].secondarySets,1);
 assert.equal(result.byMuscle['Ön bacak'].primarySets,1);
});
test('complete and partial workouts only count actually valid performed sets',()=>{
 const history=[{date:'2026-10-27',status:'finished',items:{row:[set(40,12,'Seated Cable Row'),{done:false},set(40,10,'Seated Cable Row')]}}];
 const result=F.weeklyVolume({fullHistory:history,start:'2026-10-26',end:'2026-11-01'});
 assert.equal(result.physicalSets,2);
 assert.equal(result.byMuscle['Sırt'].primarySets,2);
});
test('ABS seconds do not count unfinished or zero-length planks',()=>{
 const abs=[{date:'2026-10-28',status:'finished',items:{plank:[{done:true,seconds:35},{done:true,seconds:0}], 'heel-touch':[{done:true,reps:20}]}}];
 const x=F.weeklyVolume({absHistory:abs,start:'2026-10-26',end:'2026-11-01'});
 assert.equal(x.physicalSets,2);
 assert.equal(x.byMuscle.Core.primarySets,1);
 assert.equal(x.byMuscle.Oblik.primarySets,1);
});
test('valid ISO dates distinguish real calendar days',()=>{
 assert.equal(F.validDate('2026-02-31'),false);
 assert.equal(F.validDate('2026-10-29'),true);
});
test('running workouts and out-of-week records are ignored',()=>{
 const records=[{date:'2026-10-27',status:'running',items:{lat:[set()]}},{date:'2026-10-20',status:'finished',items:{lat:[set()]}}];
 const result=F.weeklyVolume({fullHistory:records,start:'2026-10-26',end:'2026-11-01'});
 assert.equal(result.physicalSets,0);
});
test('volume analysis never mutates historic workout records',()=>{
 const history=[{date:'2026-10-27',status:'finished',items:{lat:[set(),set()]}}];
 const snapshot=JSON.stringify(history);
 F.weeklyVolume({fullHistory:history,start:'2026-10-26',end:'2026-11-01'});
 assert.equal(JSON.stringify(history),snapshot);
});

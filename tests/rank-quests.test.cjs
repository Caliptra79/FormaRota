'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const Q=require('../assets/rank-quests.js');
const read=p=>fs.readFileSync(path.join(__dirname,'..',p),'utf8');
const IDS=['lat','row','incline','pec','lateral','rear','push','overhead','zottman','legpress','extension','legcurl','calf'];
const gym=(date,add=0,status='finished')=>({id:'gym-'+date,date,status,items:Object.fromEntries(IDS.map(id=>[id,Array.from({length:3},()=>({done:true,weight:id==='lat'?20+add:10,reps:10,name:id}))]))});
const home=(date,complete=true)=>({id:'home-'+date,date,program:'home-calisthenics-v1',status:'finished',targetSets:2,
 items:Object.fromEntries(['incline-pushup','band-row','band-pulldown','squat','band-rdl','band-shoulder','band-lateral','band-curl','band-triceps','glute-bridge','dead-bug','pallof-press','tuck-hollow'].map(id=>[id,Array.from({length:2},()=>({done:complete,reps:10}))]))});
test('weekly missions use distinct dates and existing real records only',()=>{
 const d='2026-11-07',foods=['02','03','04','05'].map(x=>({date:'2026-11-'+x,amount:100}));
 const result=Q.analyze({foods:[...foods,foods[0]],walks:{'2026-11-02':5,'2026-11-03':5,'2026-11-04':5},
 full:[gym('2026-11-03'),gym('2026-11-05',2)],home:[home('2026-11-07')]},d);
 assert.equal(result.week,'2026-11-02');
 assert.deepEqual(result.missions.map(m=>m.value),[3,2,4,5]);
 assert.equal(result.complete,4);
 assert.equal(result.stats.perfectWeeks,1);
 assert.equal(result.stats.homeCompleted,1);
 assert.equal(result.stats.prCount,1,'only lat increases volume on second Gym session');
});
test('walking streaks count >=5km consecutive days, not repetitions or extra mileage',()=>{
 const a=Q.analyze({walks:{'2026-11-04':5,'2026-11-05':5,'2026-11-06':5,'2026-11-07':7,'2026-11-08':25}},'2026-11-07');
 assert.equal(a.stats.longestStreak,4);assert.equal(a.stats.currentStreak,4);
 assert.equal(a.missions[0].value,3);
 const b=Q.analyze({walks:{'2026-11-04':5,'2026-11-05':5}},'2026-11-07');
 assert.equal(b.stats.currentStreak,0);assert.equal(b.stats.longestStreak,2);
});
test('unfinished or future sessions cannot count toward home/workout tasks',()=>{
 assert.equal(Q.finishedHome(home('2026-11-07',false)),false);
 assert.equal(Q.finishedHome(home('2026-11-07',true)),true);
 assert.equal(Q.finishedGym(gym('2026-11-07',0,'stopped')),false);
 const x=Q.analyze({home:[home('2026-11-07',false),home('2026-11-08',true)],full:[gym('2026-11-08',0)]},'2026-11-07');
 assert.equal(x.stats.homeCompleted,0);
 assert.equal(x.missions[1].value,0);
});
test('Rank 2 does not write XP or change backup schema',()=>{
 const src=read('assets/rank-quests.js'),rank=read('assets/rank-system.js'),html=read('index.html');
 new vm.Script(src);new vm.Script(rank);
 assert.doesNotMatch(src,/localStorage|setItem\(/);
 assert.ok(rank.includes('questMarkup(questData)'));
 assert.ok(rank.includes('achievementMarkup({...progress.stats,...(questData?.stats||{})})'));
 assert.ok(rank.includes("['Bronze',0"));
 assert.ok(rank.includes("['FormaRota Legend',25000"));
 assert.ok(html.includes('function collectBackup(){return{version:7'));
 assert.match(read('sw.js'),/formarota-solo-v\d+-shell/);
});

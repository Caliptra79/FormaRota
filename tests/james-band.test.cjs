'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const read=p=>fs.readFileSync(path.join(__dirname,'..',p),'utf8');
const E=require('../assets/james-band-engine.js');
const html=read('index.html'),sw=read('sw.js');
const DATE='2026-11-07';
function filled(s,reps=12,form='good',rir=3){
 for(const m of E.movesOf(s)){
  s.items[m.id]=Array.from({length:s.targetSets},()=>({done:true,reps,band:m.band,grip:'normal',rir,form}));
 }
 s.status='finished';s.endedAt=new Date().toISOString();
 return s;
}
test('James Grage library has named A/B training and a source for every technique',()=>{
 assert.equal(E.MOVES.length,13);
 assert.equal(E.PLANS.A.length,8);assert.equal(E.PLANS.B.length,8);
 assert.ok(E.MOVES.every(m=>m.id&&m.tr&&m.tip&&m.mistake&&m.source.startsWith('https://')&&m.low<m.high));
 assert.deepEqual(E.BAND_LEVELS,['none','10','20','30','40']);
 assert.ok(E.MOVES.some(m=>m.id==='pallof'));
 assert.ok(E.MOVES.some(m=>m.id==='bent-row'));
 assert.equal(E.MOVES.find(m=>m.id==='band-squat').tr,'Bantla Overhead Squat');
});
test('separate A/B sessions progress on completed performances, not elapsed months',()=>{
 const h=[];let s=E.create(DATE,h);
 assert.equal(s.variant,'A');assert.equal(s.targetSets,2);assert.equal(s.stage,1);
 s.items['band-squat'][0]={done:true,reps:11,band:'10',grip:'normal',rir:2,form:'good'};
 assert.equal(E.count(s),1);assert.equal(E.complete(s),false);
 s.status='finished';assert.equal(E.finished(s),false,'incomplete session never counts as finished');
 s.status='stopped';h.push(s);
 assert.equal(E.create(DATE,h).variant,'A','partial sessions do not advance program');
 h.pop();
 for(let i=0;i<4;i++){
  const next=E.create(DATE,h);
  assert.equal(next.variant,i%2===0?'A':'B');
  h.push(filled(next));
 }
 assert.equal(E.stage(h),2);
 const next=E.create(DATE,h);
 assert.equal(next.targetSets,3);
 assert.equal(next.variant,'A');
 for(let i=0;i<8;i++)h.push(filled(E.create(DATE,h)));
 assert.equal(E.stage(h),3,'third phase depends on clean set history');
});
test('conservative repetition and band progression uses good technique and reported RIR',()=>{
 const first=filled(E.create(DATE,[]),8,'good',2);
 let r=E.recommend('band-squat',[first]);
 assert.equal(r.aim,9);
 assert.equal(r.band,'10');assert.equal(r.canTryBand,null);
 const b=filled(E.create(DATE,[first]),12,'good',4);
 const a=filled(E.create(DATE,[first,b]),12,'good',4);
 const b2=filled(E.create(DATE,[first,b,a]),12,'good',4);
 const a2=filled(E.create(DATE,[first,b,a,b2]),12,'good',4);
 r=E.recommend('band-squat',[first,b,a,b2,a2]);
 assert.equal(r.band,'10','a high performance must not silently change resistance');
 assert.equal(r.canTryBand,'20');
 assert.match(r.advice,/deneme setinde/);
 a2.items['band-squat'][0].form='poor';
 r=E.recommend('band-squat',[first,b,a,b2,a2]);
 assert.equal(r.canTryBand,null);
 assert.match(r.advice,/Form veya efor/);
});
test('set integrity, backup validation and independent storage keys',()=>{
 const s=filled(E.create(DATE,[]));
 assert.equal(E.finished(s),true);
 assert.equal(E.validateBackup({history:[s],current:null}),true);
 s.items['band-squat'][0].rir=8;assert.equal(E.finished(s),false);
 assert.equal(E.validateBackup({history:[s]}),false);
 const bad=E.create(DATE,[]);
 bad.items['band-squat'][0]={done:true,reps:0,band:'40',grip:'normal',rir:1,form:'good'};
 assert.equal(E.validateBackup({current:bad,history:[]}),false);
 assert.equal(E.validateBackup({history:[]}),true);
 assert.equal(E.validateBackup({history:'invalid'}),false);
 assert.equal(E.validateBackup({history:[{...bad,program:'home-calisthenics-v1'}]}),false);
 assert.ok(html.includes('formarota-james-band-current-v1'));
 assert.ok(html.includes('formarota-james-band-history-v1'));
 assert.ok(html.includes('bandWorkouts:{current:read('));
 assert.ok(html.includes('data.fitness?.bandWorkouts&&!window.FormaRotaBandEngine?.validateBackup?'));
});
test('fourth program is in fitness, weekly planner and home today choices',()=>{
 for(const item of ['data-workout-choice="band"','id="jamesBandPanel"','id="jamesBandMoves"','id="jamesBandHistory"','<option value="band">'])
  assert.ok(html.includes(item),item);
 assert.ok(html.includes("{value:'band',label:'James Grage · Direnç Bandı'"));
 assert.ok(read('assets/oled-home.js').includes("selected.type==='band'"));
 assert.ok(read('assets/abs-workouts.js').includes("['fullbody','abs','home','band']"));
 assert.ok(read('assets/coach-engine-v35.js').includes("'home','band'"));
 assert.ok(read('assets/coach-ui-v33.js').includes("band:'James Grage · Direnç Bandı'"));
});
test('offline shell loads all new scripts but deliberately ships no unsupplied GIF',()=>{
 for(const asset of ['james-band-engine.js','james-band.js','james-band.css']){
  assert.ok(html.includes('./assets/'+asset+'?fr='+(asset==='james-band-engine.js'?'113':'112')),asset);
  assert.ok(sw.includes("'./assets/"+asset+"'"),asset);
  assert.ok(sw.includes("'./assets/"+asset+"?fr="+(asset==='james-band-engine.js'?'113':'112')+"'"),asset);
  if(asset.endsWith('.js'))assert.doesNotThrow(()=>new vm.Script(read('assets/'+asset)));
 }
 assert.match(sw,/formarota-solo-v113-shell/);
 assert.ok(read('assets/james-band.js').includes("assets/band-gifs/"));
 assert.ok(read('assets/james-band.js').includes('GIF’i bekleniyor'));
 assert.ok(!sw.includes("'./assets/band-gifs/"),'unprovided GIFs must not break offline install');
});

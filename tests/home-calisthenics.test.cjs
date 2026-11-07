'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const source=p=>fs.readFileSync(path.join(__dirname,'..',p),'utf8');
const E=require('../assets/home-calisthenics-engine.js');
const html=source('index.html'),sw=source('sw.js');
function filled(sets=2){
 const s=E.create('2026-11-07','home-test',sets);
 for(const move of E.MOVES){
  s.items[move.id]=Array.from({length:sets},()=>({
   done:true,[move.kind==='seconds'?'seconds':'reps']:move.low,resistance:'bodyweight'
  }));
 }
 return s;
}
test('home program has 10 strength plus 3 distinct calisthenics core moves, not the Solo ABS prescription',()=>{
 assert.equal(E.MOVES.length,13);
 assert.deepEqual(E.MOVES.slice(10).map(m=>m.id),['dead-bug','pallof-press','tuck-hollow']);
 assert.equal(E.MOVES.slice(10).filter(m=>m.kind==='seconds').length,1);
 assert.ok(E.MOVES.every(m=>m.low>0&&m.high>=m.low&&m.tip&&m.tool));
 assert.ok(E.MOVES.some(m=>m.id==='band-row'));
 assert.ok(E.MOVES.some(m=>m.id==='incline-pushup'));
 assert.match(source('assets/abs-engine.js'),/id:'floor-crunch'/);
 assert.deepEqual(require('../assets/abs-engine.js').MOVES.map(m=>m.id),
  ['floor-crunch','reverse-crunch','heel-touch','plank']);
});
test('two sets to start and three to progress; incomplete sets cannot masquerade as a completed session',()=>{
 for(const sets of [2,3]){
  const s=filled(sets);assert.equal(E.count(s),13*sets);
  assert.equal(E.complete(s),true);assert.equal(E.finished(s),false);
  s.status='finished';assert.equal(E.finished(s),true);
  assert.equal(E.validateBackup({history:[s],current:null}),true);
  s.items['dead-bug'][0].reps=null;
  assert.equal(E.complete(s),false);assert.equal(E.finished(s),false);
  assert.equal(E.validateBackup({history:[s]}),false);
 }
 const empty=E.create('2026-11-07','new-home',2);
 assert.equal(E.count(empty),0);assert.equal(E.complete(empty),false);
 assert.equal(E.validateBackup({history:[],current:empty}),true);
});
test('invalid set values, bad backup payloads, and unknown exercises are rejected',()=>{
 const bad=filled();
 for(const value of [null,'',0,-1,3.5,151,Infinity]){
  const set={done:true,reps:value};assert.equal(E.validSet(E.MOVES[0],set),false);
 }
 assert.equal(E.validSet(E.MOVES.at(-1),{done:true,seconds:121}),false);
 assert.equal(E.validSet(E.MOVES.at(-1),{done:true,seconds:20}),true);
 assert.equal(E.validateBackup({}),true,'old backups may omit home records');
 assert.equal(E.validateBackup({history:'broken'}),false);
 assert.equal(E.validateBackup({history:[{...bad,program:'wrong'}]}),false);
 assert.equal(E.validateBackup({history:[{...bad,items:{...bad.items,'unknown':[null,null]}}]}),false);
 assert.equal(E.validateBackup({history:[{...bad,targetSets:4}]}),false);
 assert.equal(E.validateBackup({current:[],history:[]}),false);
 assert.throws(()=>E.create('bad','x',2));
 assert.throws(()=>E.create('2026-11-07','x',4));
});
test('all three programs exist, but home data keys and backup validation are independent',()=>{
 for(const key of ['data-workout-choice="home"','id="homeCalPanel"','id="homeCalMoves"','id="homeCalHistory"'])
  assert.ok(html.includes(key),key);
 assert.ok(html.includes('data-workout-choice="fullbody"'));
 assert.ok(html.includes('data-workout-choice="abs"'));
 assert.ok(html.includes("homeWorkouts:{current:read('formarota-home-current-v1',null),history:read('formarota-home-history-v1',[])}"));
 assert.ok(html.includes("data.fitness?.homeWorkouts&&!window.FormaRotaHomeEngine?.validateBackup?"));
 assert.ok(html.includes("changes.push(['formarota-home-history-v1'"));
 assert.ok(html.includes("changes.push(['formarota-abs-history-v1'"));
 assert.ok(html.includes("function collectBackup(){return{version:7"));
 assert.ok(source('assets/abs-workouts.js').includes("['fullbody','abs','home']"));
 assert.ok(source('assets/coach-engine-v35.js').includes("'volleyball','home'"));
 assert.ok(html.includes("{value:'home',label:'Evde Full Body + Core'"));
 assert.ok(source('assets/oled-home.js').includes("selected.type==='home'"));
});
test('offline cache carries home program UI, CSS and engine without modifying existing exercise GIF cache',()=>{
 for(const asset of ['home-calisthenics-engine.js','home-calisthenics.js','home-calisthenics.css']){
  assert.ok(html.includes('./assets/'+asset),asset+' in HTML');
  assert.ok(sw.includes("'./assets/"+asset+"'"),asset+' precached');
  if(asset.endsWith('.js'))new vm.Script(source('assets/'+asset),{filename:asset});
 }
 assert.match(sw,/formarota-solo-v104-shell/);
 assert.ok(source('assets/home-calisthenics.css').includes('data-workout-program="home"'));
 assert.ok(source('assets/home-calisthenics.css').includes('grid-template-columns:1fr'));
 assert.ok(html.includes('id="absManualToggle"'));
 assert.ok(html.includes('id="fitExerciseList"'));
 assert.ok(html.includes('id="workoutTodaySummary"'));
 assert.ok(sw.includes("'abs-plank'"));
});

test('four exact band levels are selectable while legacy band notes remain readable',()=>{
 const ui=source('assets/home-calisthenics.js');
 for(const band of ['band-10','band-20','band-30','band-40'])assert.ok(ui.includes("'"+band+"'"),band);
 for(const band of ['light','medium','heavy'])assert.ok(ui.includes(band+":'"),'legacy '+band);
 assert.ok(ui.includes('const bandLabel='));
 assert.ok(ui.includes('previousBands.join'));
 assert.ok(ui.includes('her taraf için tekrar'));
 assert.ok(ui.includes('Kapı ankrajını kapalı ve güvenli kapıya'));
 assert.ok(source('assets/home-calisthenics.css').includes('.home-cal-gear'));
});

'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const src=x=>fs.readFileSync(path.join(__dirname,'..',x),'utf8');
const engine=require('../assets/abs-engine.js');
const html=src('index.html'),ui=src('assets/abs-workouts.js'),css=src('assets/abs-workouts.css'),sw=src('sw.js');
const today='2026-11-01',timestamp='2026-11-01T08:00:00.000Z';
function realValues(){
 return {
  'floor-crunch':[12,12,12],
  'reverse-crunch':[12,11,10],
  'heel-touch':[20,20,20],
  'plank':[40,35,32]
 };
}
test('a manual ABS session is a valid completed 12-set history record with no faked measured duration',()=>{
 const values=realValues();
 const session=engine.manualSession(today,'abs-manual-1',timestamp,values);
 assert.equal(session.status,'finished');
 assert.equal(session.recordedAfterWorkout,true);
 assert.equal(session.startedAt,timestamp);
 assert.equal(session.endedAt,timestamp);
 assert.deepEqual(session.watch,{elapsedMs:0,startedAt:null});
 assert.equal(engine.count(session),12);
 assert.equal(engine.complete(session),true);
 assert.equal(engine.finished(session),true);
 assert.equal(engine.completedDates([session]).has(today),true);
 assert.equal(engine.todaySummary([session],[],today).absCompleted,1);
 assert.equal(engine.validateBackup({history:[session],selected:'abs'}),true);
 assert.deepEqual(session.items.plank.map(v=>v.seconds),[40,35,32]);
 assert.deepEqual(session.items['reverse-crunch'].map(v=>v.reps),[12,11,10]);
});
test('manual sessions require all actual values: blanks, decimals and out-of-range sets are refused',()=>{
 for(const [id,index,value] of [
  ['plank',1,''],['plank',1,0],['plank',1,7201],
  ['floor-crunch',0,null],['floor-crunch',0,151],
  ['reverse-crunch',2,2.5],['heel-touch',0,-5],
  ['plank',0,NaN]
 ]){
  const values=realValues();values[id][index]=value;
  assert.throws(()=>engine.manualSession(today,'manual-x',timestamp,values),/set/);
 }
 const missing=realValues();delete missing.plank;
 assert.throws(()=>engine.manualSession(today,'manual-x',timestamp,missing),/Dört ABS hareketinin/);
 const extra={...realValues(),unknown:[5,5,5]};
 assert.throws(()=>engine.manualSession(today,'manual-x',timestamp,extra),/Dört ABS hareketinin/);
 const incomplete=realValues();incomplete.plank=[10,10];
 assert.throws(()=>engine.manualSession(today,'manual-x',timestamp,incomplete),/3 set/);
});
test('existing normal ABS sessions and backup schemas remain valid',()=>{
 const active=engine.session(today,'abs-normal-1',timestamp);
 assert.equal(active.status,'running');assert.equal(engine.count(active),0);
 assert.equal(engine.validateBackup({current:active,history:[]}),true);
 const manual=engine.manualSession(today,'abs-manual-2',timestamp,realValues());
 const legacy={...manual,recordedAfterWorkout:undefined};
 assert.equal(engine.finished(legacy),true);
 assert.equal(engine.validateBackup({current:active,history:[manual,legacy]}),true);
});
test('manual entry is available within ABS workout without altering Full Body or creating new history keys',()=>{
 for(const id of ['absManualToggle','absManualPanel','absManualDate','absManualMoves','absManualForm','absManualSave','absManualCancel','absManualStatus'])
  assert.equal((html.match(new RegExp('id="'+id+'"','g'))||[]).length,1,id);
 for(const marker of ['renderManualForm','manualSave(event)','recordedAfterWorkout','engine.manualSession','KEY.history','already'])
  if(marker!=='already')assert.ok(ui.includes(marker),marker);
 assert.ok(ui.includes('history().some(row=>row.date===today&&engine.finished(row))'),'prevent accidental duplicates');
 assert.ok(ui.includes("if(current())"),'block competing active ABS session');
 assert.ok(ui.includes('root.FormaRotaStudioPlus?.refresh?.()'),'refresh weekly trainer metrics');
 assert.ok(ui.includes('root.FormaRotaRouteMap?.schedule?.()'),'refresh journey map');
 assert.match(html,/id="absManualPanel" class="abs-manual-panel" hidden/);
 assert.match(css,/#absManualPanel\[hidden\]\{display:none!important\}/);
 assert.match(css,/@media\(max-width:650px\)/);
 assert.match(sw,/'\.\/assets\/abs-workouts\.js'/);
 assert.match(sw,/'\.\/assets\/abs-workouts\.css'/);
 assert.ok(html.includes('function collectBackup(){return{version:7'));
});

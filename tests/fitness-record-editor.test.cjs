// Regression suite for FormaRota's opt-in, local fitness history corrections.
const {test}=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const fs=require('node:fs');
const path=require('node:path');
const root=path.join(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
function state(){
 const map=new Map();let failKey=null;
 const localStorage={
  getItem:key=>map.has(key)?map.get(key):null,
  setItem:(key,value)=>{if(failKey===key)throw Error('quota');map.set(key,String(value))},
  removeItem:key=>map.delete(key)
 };
 const window={};
 vm.runInNewContext(read('assets/fitness-record-editor.js'),{window,localStorage});
 return {E:window.FormaRotaFitnessEdits,localStorage,map,setFail:key=>{failKey=key}};
}
const session=(date='2026-10-20',kg=30)=>({id:'session-1',date,startedAt:date+'T12:00:00Z',endedAt:date+'T14:00:00Z',status:'finished',
 items:{lat:[{done:true,name:'Lat Pulldown',weight:kg,reps:12},{done:true,name:'Lat Pulldown',weight:kg,reps:12},
 {done:false,name:'Lat Pulldown',weight:'',reps:12}]}});
const H='kocluk-fitness-history-v1',J='formarota-fitness-edits-v1';
test('validates numeric kg and integer repetitions without silently accepting blanks',()=>{
 const {E}=state();
 assert.equal(E.validate('2,5','12').weight,2.5);
 for(const kg of ['', ' ', '-1', '1501', 'oops'])assert.throws(()=>E.validate(kg,12));
 for(const reps of ['', '0', '101', '3.5', 'oops'])assert.throws(()=>E.validate(30,reps));
 assert.equal(E.validate('0','12').weight,0);
});
test('correct returns a new history but does not overwrite the original session or other sets',()=>{
 const {E}=state(),original=[session()],snapshot=JSON.stringify(original);
 const update=E.correct(original,0,'lat',0,32.5,11);
 assert.equal(update.changed,true);
 assert.equal(JSON.stringify(original),snapshot);
 assert.equal(update.history[0].items.lat[0].weight,32.5);
 assert.equal(update.history[0].items.lat[1].weight,30);
 assert.equal(update.history[0].items.lat[0].name,'Lat Pulldown');
 assert.equal(update.history[0].date,'2026-10-20');
 assert.equal(update.history[0].status,'finished');
});
test('unmarked sets cannot be turned into completed historical sets by editing',()=>{
 const {E}=state();
 assert.throws(()=>E.correct([session()],0,'lat',2,30,12),/kaydedilmiş/);
});
test('an out-of-range session or stale editor value cannot modify data',()=>{
 const {E}=state();
 assert.throws(()=>E.correct([session()],5,'lat',0,30,12));
 assert.throws(()=>E.correct([session()],0,'lat',0,35,12,{weight:25,reps:12}),/değişmiş/);
});
test('no-op history correction does not add any journal event',()=>{
 const {E,localStorage}=state();
 localStorage.setItem(H,JSON.stringify([session()]));
 const r=E.updateStored(0,'lat',0,30,12,{weight:30,reps:12});
 assert.equal(r.changed,false);assert.equal(localStorage.getItem(J),null);
});
test('archived edit and undo preserve original data and add traceable audit entries',()=>{
 const {E,localStorage}=state();
 localStorage.setItem(H,JSON.stringify([session()]));
 const updated=E.updateStored(0,'lat',0,32.5,10,{weight:30,reps:12});
 assert.equal(updated.changed,true);
 assert.equal(JSON.parse(localStorage.getItem(H))[0].items.lat[0].weight,32.5);
 assert.equal(JSON.parse(localStorage.getItem(J))[0].type,'edit');
 E.undoLast(0);
 assert.equal(JSON.parse(localStorage.getItem(H))[0].items.lat[0].weight,30);
 const journal=JSON.parse(localStorage.getItem(J));
 assert.equal(journal.length,2);assert.equal(journal[1].type,'undo');
 assert.equal(journal[1].parent,journal[0].id);
 assert.throws(()=>E.undoLast(0),/zaten geri alınmış/);
});
test('second edited set remains unchanged when the other set is corrected and undone',()=>{
 const {E,localStorage}=state();
 localStorage.setItem(H,JSON.stringify([session()]));
 E.updateStored(0,'lat',1,35,11);
 E.updateStored(0,'lat',0,32,12);
 E.undoLast(0);
 const sets=JSON.parse(localStorage.getItem(H))[0].items.lat;
 assert.equal(sets[0].weight,30);assert.equal(sets[1].weight,35);
});
test('failed journal write rolls back history',()=>{
 const {E,localStorage,setFail}=state();
 const before=JSON.stringify([session()]);
 localStorage.setItem(H,before);setFail(J);
 assert.throws(()=>E.updateStored(0,'lat',0,40,12),/depolamasına kaydedilemedi/);
 assert.equal(localStorage.getItem(H),before);
});
test('recordActive stores only a correction event and does not edit archived session',()=>{
 const {E,localStorage}=state();
 const before=JSON.stringify([session()]);
 localStorage.setItem(H,before);
 E.recordActive({sessionId:'session-active',moveId:'lat',setIndex:0,before:{weight:30,reps:12},after:{weight:35,reps:10}});
 assert.equal(localStorage.getItem(H),before);
 assert.equal(JSON.parse(localStorage.getItem(J))[0].type,'active');
});
test('app references local editor, seven themes, existing backup schema and the original 13 moves',()=>{
 const html=read('index.html'),sw=read('sw.js');
 assert.ok(html.includes('./assets/fitness-record-editor.js'));
 assert.ok(html.includes('./assets/fitness-record-editor.css'));
 assert.ok(sw.includes('./assets/fitness-record-editor.js'));
 assert.ok(sw.includes('./assets/fitness-record-editor.css'));
 assert.ok(html.includes("collectBackup(){return{version:7"));
 assert.ok(html.includes("window.formaRotaFitnessCatalog=FIT_MOVES"));
 assert.ok(html.includes("edits:read('formarota-fitness-edits-v1',[])"));
 assert.ok(html.includes("changes.push(['formarota-fitness-edits-v1'"));
 const count=html.split("const FIT_MOVES=[")[1].split("];")[0].match(/\{id:/g).length;
 assert.equal(count,13);
 for(const theme of ['night','ocean','light','sand','neon','volt','sunset'])assert.ok(html.includes("'"+theme+"'"));
 assert.ok(!/<meta[^>]*name="application-version"/.test(html));
});
test('partial finished sessions cannot be stored as full via end-session button',()=>{
 const html=read('index.html');
 const start=html.indexOf('function fitEndSession(complete){'),end=html.indexOf('function fitDrawHistory()',start);
 assert.ok(start>=0&&end>start);
 const snippet=html.slice(start,end);
 const alerts=[],saves=[],confirms=[];
 const env={fitCurrent:{id:'x',date:'2026-10-24',items:{lat:[]}},fitRepsCompleted:()=>20,
  window:{FormaRotaCoachEngine:{fullWorkout:()=>false}},
  alert:x=>alerts.push(x),confirm:x=>{confirms.push(x);return true},
  fitFreezeClock:()=>{},fitMsec:()=>90000,fitSetHist:x=>saves.push(x),
  fitGetHist:()=>[],fitDrawExercises:()=>{},fitDrawHistory:()=>{},fitSyncClock:()=>{},
  fitSetFocus:()=>{},renderPRs:()=>{},renderHome:()=>{},localStorage:{removeItem:()=>{}}
 };
 vm.runInNewContext(snippet+';this.run=fitEndSession;',env);
 env.run(true);
 assert.equal(saves.length,0);assert.equal(confirms.length,0);assert.equal(alerts.length,1);
});
test('graph uses the coach engine record set and retains last session per distinct day',()=>{
 const html=read('index.html');
 const start=html.indexOf('function v21MoveData(moveId,variantName=null)'),end=html.indexOf('function v21MoveOptions()',start);
 assert.ok(start>=0&&end>start);
 const calls=[];
 const env={
  FIT_MOVES:[{id:'row',name:'Seated Cable Row',options:[{name:'Seated Cable Row'},{name:'Dumbbell Row'}]}],
  fitGetHist:()=>[],read:()=>({row:1}),today:()=> '2026-10-24',
  window:{FormaRotaCoachEngine:{records:(hist,move,variant)=>{calls.push(variant);return [
   {date:'2026-10-20',full:true,sets:[{kg:20,reps:12},{kg:20,reps:12},{kg:20,reps:12}]},
   {date:'2026-10-22',full:false,sets:[{kg:100,reps:1}]},
   {date:'2026-10-23',full:true,sets:[{kg:25,reps:12}]},
   {date:'2026-10-23',full:true,sets:[{kg:30,reps:12}]},
   {date:'2026-10-25',full:true,sets:[{kg:50,reps:12}]}
  ]}}}
 };
 vm.runInNewContext(html.slice(start,end)+';this.fn=v21MoveData;',env);
 const rows=env.fn('row');
 assert.equal(rows.length,2);assert.equal(rows[1].v,30);assert.equal(calls[0],'Dumbbell Row');
});
test('prior set readouts are filtered to selected exercise variant',()=>{
 const html=read('index.html'),start=html.indexOf('function fitLastResult(moveId,variantName=null)'),end=html.indexOf('let fitEditingSetKey=',start);
 assert.ok(start>=0&&end>start);
 const env={FIT_MOVES:[{id:'row',name:'Seated Cable Row'}],
  fitGetHist:()=>[{items:{row:[{done:true,name:'Seated Cable Row',weight:40,reps:12}]}},
   {items:{row:[{done:true,name:'Dumbbell Row',weight:20,reps:10}]}}]};
 vm.runInNewContext(html.slice(start,end)+';this.getLast=fitLastResult;',env);
 assert.equal(env.getLast('row','Dumbbell Row'),'20 kg · 10 tekrar');
 assert.equal(env.getLast('row','Seated Cable Row'),'40 kg · 12 tekrar');
});

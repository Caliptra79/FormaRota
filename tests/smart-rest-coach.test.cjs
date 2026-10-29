'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const src=name=>fs.readFileSync(path.join(__dirname,'..',name),'utf8');
function engine(preferences={}){
 const writes=[];
 const localStorage={getItem:k=>preferences[k]??null,setItem:(k,v)=>writes.push([k,v])};
 const root={localStorage,v21Ready:false};
 vm.runInNewContext(src('assets/smart-rest.js'),{window:root});
 return {...root.FormaRotaSmartRest,writes,root};
}
test('all 13 actual movements have suggested rest durations, compounds get longer rest',()=>{
 const x=engine();
 assert.equal(Object.keys(x.RESTS).length,13);
 for(const [id,time] of Object.entries(x.RESTS))assert.ok(time>=75&&time<=180,id);
 for(const id of ['lat','row','incline','legpress'])assert.ok(x.RESTS[id]>=120,id);
 for(const id of ['lateral','rear','push','overhead','extension','legcurl','calf'])
  assert.ok(x.RESTS[id]>=60&&x.RESTS[id]<=90,id);
 assert.equal(x.resolve('legpress',{},90).seconds,180);
 assert.equal(x.resolve('incline',{},90).seconds,150);
 assert.equal(x.resolve('lateral',{},90).seconds,90);
 assert.equal(x.resolve('unknown',{},90).seconds,90);
});
test('existing manually saved per-move rest settings override all new suggestions',()=>{
 const x=engine({'formarota-rest-by-exercise-v1':JSON.stringify({lat:165,legpress:240,lateral:60})});
 assert.deepEqual(JSON.parse(JSON.stringify(x.get('lat',90))),{seconds:165,source:'personal'});
 assert.equal(x.get('legpress',120).seconds,240);
 assert.equal(x.get('lateral',90).seconds,60);
 assert.equal(x.writes.length,0);
});
test('customized general rest stays higher priority than new suggested values',()=>{
 const x=engine();
 assert.deepEqual(JSON.parse(JSON.stringify(x.resolve('legpress',{},110))),{seconds:110,source:'global'});
 assert.equal(x.resolve('legpress',{},90).seconds,180);
 assert.equal(x.resolve('lat',{lat:75},150).seconds,75);
});
test('invalid saved values safely fall back without writing or migrating data',()=>{
 const x=engine({'formarota-rest-by-exercise-v1':'invalid-json'});
 assert.equal(x.get('lat',90).seconds,120);
 for(const bad of [null,0,9,700,'garbage',-2]){
  assert.equal(x.resolve('legpress',{legpress:bad},90).seconds,180);
 }
 assert.equal(x.writes.length,0);
});
test('session countdown does not end the workout automatically',()=>{
 const html=src('index.html');
 assert.ok(html.includes('function fitStartPhase(kind,moveId)'));
 assert.ok(html.includes("if(fitRepsCompleted()<39)fitStartPhase('rest',id);else fitStopPhase()"));
 assert.ok(html.includes("durationSec=kind==='work'?cfg.workSeconds:fitRestForMove(chosen)"));
 assert.ok(html.includes('120:00'));
 assert.ok(html.includes('durationMin:120,workSeconds:75,restSeconds:90'));
 assert.ok(html.includes('if(seconds===0||seconds<0&&fitPhaseMs()<=-seconds*1000)fitStopPhase()'));
 assert.ok(html.includes("Planlanan süre doldu; sayaç sıfırda."));
 assert.ok(!html.includes("if(fitRepsCompleted()<39)fitStartPhase('rest');else fitStopPhase()"));
});
test('timer duration is tied to the saved movement, not the next active movement',()=>{
 const html=src('index.html');
 const start=html.indexOf('function fitRestForMove(id){');
 const end=html.indexOf('function fitStartSession(){',start);
 assert.ok(start>0&&end>start);
 const engineRoot=engine();
 const variables={window:{FormaRotaSmartRest:engineRoot},
  FIT_MOVES:[{id:'lat'},{id:'legpress'}],
  fitCurrent:{activeExercise:1,status:'running',phase:null},
  fitConf:()=>({restSeconds:90,workSeconds:75}),
  fitSaveCurrent:()=>{},fitSyncClock:()=>{},fitPhaseMs:()=>90*1000,fitStopPhase:()=>{}};
 vm.runInNewContext(html.slice(start,end)+
  '\nthis.__start=fitStartPhase;this.__adjust=fitAdjustRest;',variables);
 variables.__start('rest','lat');
 assert.equal(variables.fitCurrent.phase.durationSec,120);
 assert.equal(variables.fitCurrent.phase.moveId,'lat');
 variables.__start('rest','legpress');
 assert.equal(variables.fitCurrent.phase.durationSec,180);
 variables.__start('work');
 assert.equal(variables.fitCurrent.phase.durationSec,75);
});
test('rest +30, -15 and Skip change active timer but never workout progress records',()=>{
 const html=src('index.html');
 const start=html.indexOf('function fitRestForMove(id){');
 const end=html.indexOf('function fitStartSession(){',start);
 const x=engine();
 let saves=0,changes=0,skips=0;
 const ctx={window:{FormaRotaSmartRest:x},
  FIT_MOVES:[{id:'lat'}],fitCurrent:{activeExercise:0,status:'running',phase:null,items:{lat:[{done:true,weight:50,reps:10}]}},
  fitConf:()=>({restSeconds:90,workSeconds:75}),
  fitSaveCurrent:()=>{saves++},fitSyncClock:()=>{changes++},
  fitPhaseMs:()=>45*1000,fitStopPhase:()=>{ctx.fitCurrent.phase=null;skips++}};
 vm.runInNewContext(html.slice(start,end)+'\nthis.start=fitStartPhase;this.adjust=fitAdjustRest;',ctx);
 ctx.start('rest','lat');ctx.adjust(30);
 assert.equal(ctx.fitCurrent.phase.durationSec,150);
 ctx.adjust(-15);assert.equal(ctx.fitCurrent.phase.durationSec,135);
 ctx.adjust(0);assert.equal(ctx.fitCurrent.phase,null);assert.equal(skips,1);
 assert.equal(ctx.fitCurrent.items.lat[0].weight,50);
 assert.ok(saves>=3&&changes>=4);
});
test('advanced timer reuses the same per-movement preferences',()=>{
 const html=src('index.html');
 assert.ok(html.includes("n=window.FormaRotaSmartRest?.resolve($('v21TimerMove').value,times,fitConf().restSeconds)?.seconds"));
 assert.ok(html.includes("const V21_MEASURES='formarota-measurements-v1'"));
 assert.ok(html.includes("V21_RESTS='formarota-rest-by-exercise-v1'"));
 assert.ok(src('assets/smart-rest.js').includes("if(root.v21Ready&&typeof root.v21RestChange==='function')root.v21RestChange();"));
});
test('coach tips are visible even if there are no completed records',()=>{
 const ui=src('assets/coach-ui-v33.js');
 assert.ok(ui.includes('}else{\n   const body=card.querySelector'));
 assert.ok(!ui.includes('if(!result.records){old.remove();return}'));
 assert.ok(ui.includes("details.append(text('summary','','Bu öneri neden verildi?'));"));
 assert.ok(ui.includes('Koçum ne diyor? · Öneriler nasıl hesaplanıyor?'));
 assert.ok(ui.includes("result.status==='increase'?'↗':result.records?'●':'?'"));
 assert.ok(ui.includes('Kayıt durumu: '));
 assert.ok(ui.includes('Önceki: '));
 assert.ok(ui.includes('Son: '));
 assert.ok(ui.includes("const guide=text('details','coach-guide');"));
});
test('new UI is accessible and cached offline with no changes to backup version',()=>{
 const html=src('index.html'),sw=src('sw.js'),css=src('assets/smart-rest-coach.css');
 for(const id of ['fitSmartRestControls','fitSmartRestHint','fitRestPlus','fitRestMinus','fitRestSkip'])
  assert.ok(html.includes('id="'+id+'"'));
 for(const name of ['smart-rest.js','smart-rest-coach.css']){
  assert.ok(html.includes('./assets/'+name));
  assert.ok(sw.includes("'./assets/"+name+"'"));
 }
 assert.ok(css.includes('#fitSessionPanel .smart-rest-controls[hidden]{display:none!important}'));
 assert.ok(css.includes('.coach-guide'));
 assert.ok(html.includes('collectBackup(){return{version:7'));
 assert.ok(html.includes('kocluk-fitness-history-v1'));
 assert.ok(sw.includes("formarota-solo-v79-shell"));
 assert.equal(fs.readdirSync(path.join(__dirname,'../assets')).filter(f=>f.endsWith('.gif')).length,19);
});

test('adding 30 seconds after an elapsed rest grants a fresh complete 30 seconds',()=>{
 const html=src('index.html');
 const start=html.indexOf('function fitRestForMove(id){');
 const end=html.indexOf('function fitStartSession(){',start);
 const ctx={window:{FormaRotaSmartRest:engine()},
  FIT_MOVES:[{id:'lat'}],
  fitCurrent:{activeExercise:0,status:'running',phase:null},
  fitConf:()=>({restSeconds:90,workSeconds:75}),fitSaveCurrent:()=>{},
  fitSyncClock:()=>{},fitPhaseMs:()=>0,fitStopPhase:()=>{}};
 vm.runInNewContext(html.slice(start,end)+'\nthis.start=fitStartPhase;this.adjust=fitAdjustRest;',ctx);
 ctx.start('rest','lat');
 ctx.fitCurrent.phase.runningSince=Date.now()-152000;
 ctx.adjust(30);
 const phase=ctx.fitCurrent.phase;
 const remaining=phase.durationSec*1000-(Date.now()-phase.runningSince);
 assert.ok(remaining>28000&&remaining<=30500,'expected 30 seconds, found '+remaining);
});

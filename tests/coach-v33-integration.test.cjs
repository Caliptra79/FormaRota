// Run: node --test tests/coach-v33-integration.test.cjs
const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const load=name=>fs.readFileSync(path.join(__dirname,'..',name),'utf8');
const html=load('index.html'),sw=load('sw.js'),ui=load('assets/coach-ui-v33.js'),engine=load('assets/coach-engine-v33.js'),css=load('assets/coach-quality-v33.css');
const context={window:{}};vm.runInNewContext(engine,context);const E=context.window.FormaRotaCoachEngine;
const ALL=['lat','row','incline','pec','lateral','rear','push','overhead','zottman','legpress','extension','legcurl','calf'];
const fixture=(date,bad=false)=>({date,status:'finished',items:Object.fromEntries(ALL.map(id=>[id,Array.from({length:3},(_,i)=>({done:true,reps:12,weight:bad&&id==='lat'&&i===0?'':30}))]))});
test('main v33 app loads engine, interface, style and offline cache',()=>{
 assert.match(html,/application-version" content="33"/);
 for(const name of ['coach-engine-v33.js','coach-ui-v33.js','coach-quality-v33.css']){
  assert.ok(html.includes('./assets/'+name),name);
  assert.ok(sw.includes('./assets/'+name),name);
 }
 assert.ok(sw.includes('formarota-solo-v33-shell'));
 assert.ok(sw.includes('formarota-solo-v33-gifs'));
});
test('original 13 moves, 15 GIF and 7 themes still exist',()=>{
 const moves=html.slice(html.indexOf('const FIT_MOVES=['),html.indexOf('];',html.indexOf('const FIT_MOVES=[')));
 assert.equal([...moves.matchAll(/\bid:'[^']+',name:/g)].length,13);
 assert.ok(html.includes('figure.append(picture)'));
 for(const theme of ['night','ocean','light','sand','neon','volt','sunset'])assert.ok(html.includes('value="'+theme+'"'));
 assert.equal((sw.match(/const GIFS=\[([^\]]+)\]/)?.[1].match(/'/g)||[]).length/2,15);
 assert.ok(load('assets/theme-minimal-v26.css').includes('width:min(100%,240px)'));
});
test('old weekly report uses exactly the coach full-workout validator',()=>{
 assert.match(html,/sess=\[\.\.\.new Set\(v21Sessions\(\)\.filter/);
 assert.match(html,/window\.FormaRotaCoachEngine\?\.fullWorkout\|\|v33FullWorkoutFallback/);
 assert.match(html,/<small>Tam Full Body günü<\/small>/);
 assert.match(ui,/w\.finished\+' \/ '\+w\.target\+' farklı gün/);
});
test('legacy report fallback and modern coach agree on full/partial records',()=>{
 const start=html.indexOf('function v33FullWorkoutFallback(session){');
 const end=html.indexOf('function v21Report(){',start);
 assert.ok(start>=0&&end>start);
 const source=html.slice(start,end)+'\nreturn v33FullWorkoutFallback;';
 const fallback=new Function('FIT_MOVES',source)(ALL.map(id=>({id})));
 const good=fixture('2026-10-20'),bad=fixture('2026-10-20',true);
 assert.equal(fallback(good),E.fullWorkout(good));
 assert.equal(fallback(bad),E.fullWorkout(bad));
 assert.equal(fallback(good),true);
 assert.equal(fallback(bad),false);
});
test('reason descriptions are computed from real stored sets, not a placeholder mock',()=>{
 assert.match(ui,/result\.basis\?\.previous/);
 assert.match(ui,/result\.basis\?\.latest/);
 assert.match(ui,/E\.assess\(move,selectedName\(move\),readHistory\(\),getStep\(\)/);
 assert.match(ui,/Bu öneri neden verildi\?/);
 assert.match(css,/\.coach-reason>summary/);
});
test('all original tracking and backup data keys and fallback remain present',()=>{
 for(const key of ['kocluk-fitness-history-v1','kocluk-fitness-current-v1','kocluk-food-log-v2','kocluk-weight-v1','formarota-ui-theme']){
  assert.ok(html.includes(key),key);
 }
 assert.ok(html.includes('function collectBackup()'));
 assert.ok(html.includes('confirmImport'));
 assert.ok(!engine.includes('localStorage')&&!ui.includes('fitSetHist('));
});
test('new scripts and existing inline JavaScript compile',()=>{
 for(const code of [engine,ui,sw])assert.doesNotThrow(()=>new vm.Script(code));
 for(const match of html.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/g)){
  assert.doesNotThrow(()=>new vm.Script(match[1]));
 }
});

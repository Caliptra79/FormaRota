const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const read=pathName=>fs.readFileSync(path.join(__dirname,'..',pathName),'utf8');
const html=read('index.html'),ui=read('assets/abs-workouts.js'),css=read('assets/abs-workouts.css'),
sw=read('sw.js'),studio=read('assets/studio-plus.js');
const engine=require('../assets/abs-engine.js');
const moves=engine.MOVES;
const round=()=>{
 const s=engine.session('2026-10-28','abs-test','2026-10-28T10:00:00.000Z');
 for(const m of moves)s.items[m.id]=Array.from({length:3},(_,i)=>m.kind==='seconds'?{done:true,seconds:35+i*4}:{done:true,reps:m.id==='heel-touch'?20:12+i});
 return s;
};
test('user-approved ABS plan has exactly four moves, three reps-based and timed plank',()=>{
 assert.equal(moves.length,4);
 assert.deepEqual(moves.map(x=>x.id),['floor-crunch','reverse-crunch','heel-touch','plank']);
 assert.deepEqual(moves.map(x=>x.group),['Üst karın','Alt karın','Yan karın (oblik)','Core']);
 assert.deepEqual(moves.map(x=>x.kind),['reps','reps','reps','seconds']);
 assert.equal(moves[2].defaultValue,20);
 assert.equal(moves[3].defaultValue,0);
 assert.ok(moves.every(x=>x.source.startsWith('https://fitnessprogramer.com/exercise/')));
 assert.ok(moves.every(x=>x.gif.startsWith('https://fitnessprogramer.com/wp-content/uploads/')));
});
test('ABS complete requires 12 VALID sets, measured plank seconds and distinct history',()=>{
 const s=round();
 assert.equal(engine.count(s),12);
 assert.equal(engine.complete(s),true);
 assert.equal(engine.finished(s),false,'active workout cannot count as completed');
 s.status='finished';
 assert.equal(engine.finished(s),true);
 s.items.plank[2].seconds=0;
 assert.equal(engine.count(s),11);
 assert.equal(engine.complete(s),false);
 assert.equal(engine.finished(s),false);
 s.items.plank[2].seconds=52;
 s.items['heel-touch'][0].reps=20.5;
 assert.equal(engine.complete(s),false);
 s.items['heel-touch'][0].reps=20;
 assert.equal(engine.finished(s),true);
});
test('fresh session cannot be reported as completed; old Full Body schema does not mix with ABS',()=>{
 const s=engine.session('2026-10-28','abs-fresh','2026-10-28T03:00:00.000Z');
 assert.equal(engine.count(s),0);
 assert.equal(engine.complete(s),false);
 assert.equal(s.items.plank.length,3);
 assert.deepEqual(Object.keys(s.items).sort(),moves.map(x=>x.id).sort());
 const full={date:'2026-10-28',status:'finished',items:{lat:[{done:true}]}};
 assert.equal(engine.finished(full),false);
});
test('same-day ABS and Full Body can each be independently represented and partially completed days stay separate',()=>{
 const a={...round(),status:'finished'};
 const stopped={...round(),status:'stopped'};
 const partial={...engine.session('2026-10-28','abs-p','2026-10-28T11:00:00Z'),status:'stopped'};
 const full=[{status:'finished',date:'2026-10-28'},{status:'finished',date:'2026-10-25'}];
 const summary=engine.todaySummary([a,stopped,partial],full,'2026-10-28');
 assert.deepEqual(summary.labels,['Full Body','ABS']);
 assert.equal(summary.absCompleted,1);
 assert.equal(summary.absPartial,2);
 assert.equal(summary.fullCompleted,1);
 assert.equal(engine.weekCount([a,a,stopped],['2026-10-27','2026-10-28']),1);
 assert.equal(engine.weekCount([partial,stopped],['2026-10-28']),0);
});
test('backup validation accepts only well-formed separate ABS sessions and old optional fields',()=>{
 const good={current:engine.session('2026-10-28','abs-c','2026-10-28T03:00:00Z'),history:[{...round(),status:'finished'}],selected:'abs'};
 assert.equal(engine.validateBackup(good),true);
 assert.equal(engine.validateBackup({}),true,'old backups do not contain new ABS fields');
 assert.equal(engine.validateBackup({...good,selected:'other'}),false);
 assert.equal(engine.validateBackup({...good,history:[]}),true);
 assert.equal(engine.validateBackup({...good,current:[]} ),false);
 assert.equal(engine.validateBackup({...good,history:123}),false);
 assert.equal(engine.validateBackup({...good,history:[{...round(),status:'finished',items:{...round().items,plank:[null,null,null]}}]}),false);
});
test('fitness selection, ABS hero, set inputs, plank stopwatch and both archive panels live in the same route',()=>{
 for(const id of ['workoutProgramChooser','workoutTodaySummary','studioFitnessHero',
  'absWorkoutHero','absProgressRing','absHeroAction','absWorkoutPanel','absStart','absFinish','absStop',
  'absWatchTime','absWatchTransfer','absExerciseList','absHistoryPanel','absHistory','fitSessionPanel',
  'fitExercisePanel','fitExerciseList','fitHistory']){
  assert.equal((html.match(new RegExp('id="'+id+'"','g'))||[]).length,1,id);
 }
 assert.ok(html.includes('data-workout-choice="fullbody"'));
 assert.ok(html.includes('data-workout-choice="abs"'));
 assert.ok(html.includes('12 set'));
 assert.ok(html.includes("window.FormaRotaABS?.onRoute?.(view)"));
 assert.ok(html.includes("window.FormaRotaABS?.renderHome?.()"));
 assert.ok(html.includes("window.FormaRotaABS?.completedOn?.(key)"));
 assert.ok(html.includes('v21ReportOffset'));
});
test('choosing ABS is not blocked on Wednesdays; original Full Body IDs, GIF count and coach validator remain',()=>{
 assert.doesNotMatch(html,/function fitStartSession\(\)\{if\(fitCurrent\)return;if\(new Date\(\).getDay\(\)===3/);
 assert.ok(html.includes("$('fitStart').disabled=isActive;"));
 assert.ok(html.includes('const FIT_MOVES=['));
 assert.ok(html.includes('function fitEndSession(complete)'));
 assert.ok(html.includes('window.FormaRotaCoachEngine?.fullWorkout'));
 assert.ok(html.includes("FIT_ABS_KEY='kocluk-fitness-abs-v1'"));
 assert.ok(html.includes('window.formaRotaFitnessCatalog=FIT_MOVES'));
 assert.ok(html.includes('id="globalTodayDate"'));
 const gifs=sw.match(/const GIFS=\[([^\]]+)\]/)?.[1]||'';
 assert.equal((gifs.match(/'/g)||[]).length/2,15);
});
test('ABS backup data is exported and safely validated before restore; older backups remain valid',()=>{
 assert.ok(html.includes("absWorkouts:{selected:localStorage.getItem('formarota-workout-choice-v1')"));
 assert.ok(html.includes("window.FormaRotaABSEngine?.validateBackup?.(data.fitness.absWorkouts)"));
 assert.ok(html.includes("if(data.fitness.absWorkouts){const absData=data.fitness.absWorkouts;"));
 for(const name of ['formarota-abs-history-v1','formarota-abs-current-v1','formarota-workout-choice-v1']){
  assert.ok(html.includes(name),name);
 }
 assert.ok(html.includes('window.FormaRotaABS?.refreshImported?.()'));
 assert.ok(html.includes('function collectBackup(){return{version:7'));
});
test('week metrics count ABS sessions as active but not as Full Body completed',()=>{
 const metrics=require('../assets/studio-plus-engine.js');
 const ids=['lat','row','incline','pec','lateral','rear','push','overhead','zottman','legpress','extension','legcurl','calf'];
 const summary=metrics.week({asOf:new Date(2026,9,28,12),moveIds:ids,absCompletedDates:['2026-10-27','2026-11-01']});
 assert.equal(summary.daysActive,1);
 assert.equal(summary.fullWorkoutDays,0);
 assert.equal(summary.daily[1].absWorkout,true);
 assert.equal(summary.daily[6].future,true);
 assert.equal(summary.daily[6].active,false);
 assert.ok(studio.includes('absCompletedDates:'));
 assert.ok(studio.includes("d.absWorkout?'ABS tamamlandı'"));
});
test('mobile route switch prevents unselected program panels appearing and all assets are offline cached',()=>{
 assert.ok(css.includes('html[data-workout-program="abs"] main>#studioFitnessHero:not(.hidden){display:none!important}'));
 assert.ok(css.includes('html[data-workout-program="abs"] #fitnessRoot>section[data-fit-page="workout"]:not(#absWorkoutPanel)'));
 assert.ok(css.includes('html[data-workout-program="fullbody"] #fitnessRoot>#absWorkoutPanel{display:none!important}'));
 assert.ok(css.includes('#fitnessRoot>#absWorkoutPanel.hidden{display:none!important}'));
 assert.ok(css.includes('@media(max-width:400px)'));
 assert.ok(css.includes('@media(prefers-reduced-motion:reduce)'));
 assert.ok(css.includes('abs-source'));
 for(const asset of ['abs-engine.js','abs-workouts.js','abs-workouts.css']){
  assert.ok(html.includes('./assets/'+asset));
  assert.ok(sw.includes("'./assets/"+asset+"'"));
 }
 assert.ok(sw.includes('formarota-solo-v51-shell'));
 new vm.Script(ui);new vm.Script(read('assets/abs-engine.js'));
 for(const m of html.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/g))new vm.Script(m[1]);
});
test('program switching, ABS starting and completing are isolated from Full Body storage',()=>{
 const data=new Map(),fakeDoc={
  readyState:'loading',visibilityState:'visible',documentElement:{dataset:{}},
  getElementById(){return null},querySelectorAll(){return []},addEventListener(){},
 };
 const window={document:fakeDoc,localStorage:{
  getItem:k=>data.has(k)?data.get(k):null,
  setItem(k,v){data.set(k,v)},
  removeItem(k){data.delete(k)}
 },confirm:()=>true,alert(){throw Error('unexpected alert')},matchMedia(){return {matches:false}},
  setInterval(){},addEventListener(){}};
 vm.runInNewContext(ui,{window,structuredClone,Set,Intl,Date,Math});
 const api=window.FormaRotaABS;
 // Engine is supplied before the script in real PWA; test reruns with same reference.
 assert.equal(typeof api,'undefined','without engine, the ABS enhancement safely does nothing');
 window.FormaRotaABSEngine=engine;
 vm.runInNewContext(ui,{window,structuredClone,Set,Intl,Date,Math});
 const abs=window.FormaRotaABS;
 assert.ok(abs);
 abs.choose('abs');
 assert.equal(data.get('formarota-workout-choice-v1'),'abs');
 abs.start();
 assert.ok(JSON.parse(data.get('formarota-abs-current-v1')));
 assert.equal(data.has('kocluk-fitness-current-v1'),false);
 abs.finish(true);
 assert.equal(data.has('formarota-abs-history-v1'),false,'no 12-set completion claim when empty');
 const active=JSON.parse(data.get('formarota-abs-current-v1'));
 for(const m of moves)active.items[m.id]=Array.from({length:3},()=>m.kind==='seconds'?{done:true,seconds:45}:{done:true,reps:12});
 data.set('formarota-abs-current-v1',JSON.stringify(active));
 abs.finish(true);
 assert.equal(data.has('formarota-abs-current-v1'),false);
 const completed=JSON.parse(data.get('formarota-abs-history-v1'));
 assert.equal(completed.length,1);
 assert.equal(completed[0].status,'finished');
 assert.ok(engine.finished(completed[0]));
 assert.equal(data.has('kocluk-fitness-history-v1'),false,'ABS leaves Full Body history untouched');
});

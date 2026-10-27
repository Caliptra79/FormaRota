const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const read=p=>fs.readFileSync(path.join(__dirname,'..',p),'utf8');
const engine=require('../assets/studio-plus-engine.js');
const ui=read('assets/studio-plus.js'),css=read('assets/studio-plus.css');
const html=read('index.html'),sw=read('sw.js');
const moves=['lat','row','incline','pec','lateral','rear','push','overhead','zottman','legpress','extension','legcurl','calf'];
const set=()=>({done:true,weight:20,reps:12});
const session=(date,status='finished')=>({
 date,status,items:Object.fromEntries(moves.map(id=>[id,[set(),set(),set()]]))
});
test('four goals compute safe bounded rings and count actual workout sets',()=>{
 assert.deepEqual(engine.progress(250,100),{value:250,goal:100,pct:100,remaining:0,valid:true});
 assert.equal(engine.progress(0,2500).pct,0);
 assert.equal(engine.progress('abc',0).valid,false);
 assert.equal(engine.progress(-100,2600).value,0);
 assert.equal(engine.workoutSets(session('2026-10-26'),moves),39);
 const partial=session('2026-10-26');
 partial.items.lat[0].done=false;
 assert.equal(engine.workoutSets(partial,moves),38);
 partial.items.lat[1].weight=null;
 assert.equal(engine.workoutSets(partial,moves),37);
});
test('full workouts require exactly 13 complete movements, 39 valid sets, and finished status',()=>{
 const full=session('2026-10-26');
 assert.equal(engine.fullSession(full,moves),true);
 assert.equal(engine.fullSession({...full,status:'stopped'},moves),false);
 assert.equal(engine.fullSession({...full,status:'paused'},moves),false);
 assert.equal(engine.fullSession(full,moves.slice(0,12)),false);
 for(const bad of [
  {...set(),reps:0},
  {...set(),weight:-2},
  {...set(),weight:null},
  {...set(),reps:1.5},
  {weight:20,reps:10,done:false}
 ]){
  const copy=session('2026-10-26');copy.items.lat[0]=bad;
  assert.equal(engine.fullSession(copy,moves),false,JSON.stringify(bad));
 }
});
test('weekly story includes only this week records, deduplicates full training days',()=>{
 const asOf=new Date(2026,9,29,12);
 const week=engine.week({
  asOf,moveIds:moves,
  logs:[
   {date:'2026-10-26',kcal:1000,protein:50},
   {date:'2026-10-26',kcal:800,protein:30},
   {date:'2026-10-27',kcal:900,protein:55},
   {date:'2026-10-25',kcal:4000,protein:200},
   {date:'2026-10-30',kcal:9000,protein:1000}
  ],
  sessions:[
   session('2026-10-26'),session('2026-10-26'),
   session('2026-10-27','stopped'),session('2026-10-28'),
   session('2026-10-30')
  ],
  water:{'2026-10-27':1750,'2026-10-30':9000},
  walk:{'2026-10-29':5,'2026-10-30':5}
 });
 assert.equal(week.dates[0],'2026-10-26');
 assert.equal(week.dates[6],'2026-11-01');
 assert.equal(week.daysRecorded,2);
 assert.equal(week.avgKcal,1350);
 assert.equal(week.avgProtein,67.5);
 assert.equal(week.fullWorkoutDays,2);
 assert.equal(week.walkTotal,5);
 assert.equal(week.waterTotal,1750);
 assert.equal(week.daily[4].future,true);
 assert.equal(week.daily[4].active,false);
 assert.equal(week.award,'Antrenman istikrarı');
});
test('weight change requires at least two distinct dates; no fabricated averages',()=>{
 const asOf=new Date(2026,9,29,12);
 const empty=engine.week({asOf,moveIds:moves});
 assert.equal(empty.avgKcal,null);
 assert.equal(empty.avgProtein,null);
 assert.equal(empty.weightDelta,null);
 assert.equal(empty.award,null);
 const same=engine.week({asOf,moveIds:moves,weights:[
  {date:'2026-10-26',kg:110},{date:'2026-10-26',kg:109.5}
 ]});
 assert.equal(same.weightPoints,1);
 assert.equal(same.weightDelta,null);
 const real=engine.week({asOf,moveIds:moves,weights:[
  {date:'2026-10-26',kg:110},
  {date:'2026-10-28',kg:109.3},
  {date:'2026-10-30',kg:90},
  {date:'2026-10-25',kg:120}
 ]});
 assert.equal(real.weightDelta,-0.7);
 assert.equal(real.weightPoints,2);
});
test('activity streak counts actual tracking only, not meeting calorie targets',()=>{
 const asOf=new Date(2026,9,29,12);
 const w=engine.week({asOf,moveIds:moves,
  logs:[{date:'2026-10-28',kcal:20,protein:1}],
  water:{'2026-10-27':500,'2026-10-29':250},
  walk:{'2026-10-26':5}
 });
 assert.equal(w.streak,4);
 assert.equal(w.award,'Üç günlük takip');
 assert.equal(w.daysActive,4);
 assert.equal(w.daysRecorded,1);
});
test('HTML inserts 4-ring host and two real weekly views, without duplicate data wrappers',()=>{
 assert.equal((html.match(/id="spProgressRings"/g)||[]).length,1);
 assert.equal((html.match(/id="spWeekTeaser"/g)||[]).length,1);
 assert.equal((html.match(/id="spWeekStory"/g)||[]).length,1);
 assert.ok(html.includes('data-view="insights" id="spWeekStory"'));
 assert.ok(html.includes('window.FormaRotaStudioPlus?.refresh?.()'));
 assert.ok(html.includes('window.FormaRotaStudioPlus?.renderWeek?.()'));
 assert.ok(html.includes('window.FormaRotaStudioPlus?.onSetSaved?.(id,i)'));
 assert.ok(css.includes('#homePanel .home-stats{display:none!important}'));
 assert.ok(css.includes('.sp-goal-ring{'));
 assert.ok(css.includes('.sp-week-days{'));
 assert.ok(css.includes('grid-template-columns:repeat(7,minmax(0,1fr))'));
});
test('progress summaries never write to the existing storage or mutate original workout definitions',()=>{
 assert.ok(!ui.includes('localStorage.setItem('));
 assert.ok(!ui.includes('localStorage.removeItem('));
 assert.ok(!ui.includes('localStorage.clear('));
 assert.ok(!ui.includes("history.pushState("));
 assert.ok(!ui.includes("fetch("));
 assert.ok(html.includes('function collectBackup(){return{version:7'));
 assert.ok(html.includes('const FIT_MOVES=['));
 assert.ok(html.includes('window.formaRotaFitnessCatalog=FIT_MOVES'));
 assert.ok(html.includes('id="globalTodayDate"'));
 assert.ok(ui.includes("getItem(name)"));
 assert.ok(ui.includes("history:'kocluk-fitness-history-v1'"));
 assert.ok(ui.includes("weights:'kocluk-weight-v1'"));
});
test('exercises receive progress ribbons, three completion dots, 13 existing GIFs preserved',()=>{
 assert.ok(ui.includes("doc.querySelectorAll('#fitExerciseList .fit-card')"));
 assert.ok(ui.includes("card.dataset.group=move.group"));
 assert.ok(ui.includes("card.dataset.complete=String(done===3)"));
 assert.ok(ui.includes("const dots=el('div','sp-move-dots')"));
 assert.ok(css.includes('.sp-move-dot.done'));
 for(const group of ['Chest','Back','Shoulders','Legs','Biceps','Triceps'])assert.ok(css.includes('[data-group="'+group+'"]'));
 const gifs=sw.match(/const GIFS=\[([^\]]+)\]/)?.[1]||'';
 assert.equal((gifs.match(/'/g)||[]).length/2,15);
 assert.ok(html.includes('fit-gif-preview'));
});
test('all seven themes have non-looping ambient polish, reduce-motion, and offline assets',()=>{
 for(const id of ['night','ocean','light','sand','neon','volt','sunset']){
  assert.ok(css.includes('html[data-theme="'+id+'"]'));
  assert.ok(html.includes('<option value="'+id+'">'));
 }
 assert.ok(css.includes('@media(prefers-reduced-motion:reduce)'));
 assert.ok(css.includes('sp-move-card.sp-set-flash'));
 assert.ok(css.includes('sp-move-card.sp-move-finished'));
 assert.doesNotMatch(css,/animation:[^;\n]*infinite/i);
 for(const asset of ['studio-plus.css','studio-plus-engine.js','studio-plus.js']){
  assert.ok(html.includes('./assets/'+asset));
  assert.ok(sw.includes("'./assets/"+asset+"'"));
 }
 assert.match(sw,/formarota-solo-v\d+-shell/);
 assert.equal(JSON.parse(read('manifest.webmanifest')).id,'./index.html');
 new vm.Script(ui);
 new vm.Script(read('assets/studio-plus-engine.js'));
 for(const match of html.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/g)){
  assert.doesNotThrow(()=>new vm.Script(match[1]));
 }
});

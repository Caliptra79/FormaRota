const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const read=p=>fs.readFileSync(path.join(__dirname,'..',p),'utf8');
const html=read('index.html'),css=read('assets/studio-relaunch.css'),js=read('assets/studio-relaunch.js'),sw=read('sw.js');
test('new Studio replaces the real workout heading with action buttons and a live 39-set progress gauge',()=>{
 const block=html.slice(html.indexOf('id="studioFitnessHero"'),html.indexOf('data-view="fitness-history"'));
 for(const id of ['studioFitnessHero','studioPrimaryAction','studioExercisesAction','studioProgressRing','studioDoneCount','studioWorkoutState','studioProgressNote'])assert.ok(block.includes('id="'+id+'"'),id);
 assert.ok(block.includes('role="progressbar"'));
 assert.ok(block.includes('aria-valuemax="39"'));
 assert.ok(block.includes('inşa et.'));
 assert.ok(block.includes('13</strong>'));
 assert.ok(!block.includes('<h2>Full Body rutinin</h2>'));
});
test('Home and nutrition have distinct new editorial hero markup and contextual primary actions',()=>{
 assert.ok(html.includes('class="home-intro studio-home-intro"'));
 assert.ok(html.includes('class="studio-home-art"'));
 assert.ok(html.includes('class="route-heading wide studio-nutrition-hero"'));
 assert.ok(html.includes('id="studioMealAction"'));
 assert.ok(css.includes('#homePanel .studio-home-intro'));
 assert.ok(css.includes('main>.studio-fitness-hero'));
 assert.ok(css.includes('main>.studio-nutrition-hero'));
});
test('The workout controls, original schedule and thirteen exercise GIFs stay usable',()=>{
 for(const id of ['fitStart','fitPause','fitFinish','fitStop','fitSessionPanel','fitExercisePanel','fitExerciseList','fitSchedulePanel','fitWeekDays','fitCompletedText','fitMainClock','fitPhaseClock']){
  assert.equal((html.match(new RegExp('id="'+id+'"','g'))||[]).length,1,id);
 }
 assert.ok(html.includes('const FIT_MOVES=['));
 assert.ok(html.includes('function fitDrawExercises()'));
 assert.ok(html.includes('function fitSyncClock()'));
 assert.ok(html.includes('function collectBackup(){return{version:7'));
 assert.ok(html.includes('id="globalTodayDate"'));
 assert.ok(css.includes('#fitnessRoot>.studio-legacy-intro{display:none!important}'));
 assert.ok(css.includes('#fitnessRoot #fitSessionPanel{order:1}'));
 assert.ok(css.includes('#fitnessRoot #fitExercisePanel{order:2}'));
 assert.ok(css.includes('grid-template-columns:minmax(180px,240px) minmax(0,1fr)!important'));
 const gifs=sw.match(/const GIFS=\[([^\]]+)\]/)?.[1]||'';
 assert.equal((gifs.match(/'/g)||[]).length/2,15);
});
test('Themes retain their distinct hero palettes and primary labels have a consistent readable foreground',()=>{
 for(const theme of ['night','ocean','light','sand','neon','volt','sunset']){
  assert.ok(css.includes('html[data-theme="'+theme+'"]'));
  assert.ok(html.includes('<option value="'+theme+'">'));
 }
 for(const target of ['--studio-ink:#f3fbff','--studio-ink-muted:#bfd5de','--studio-pop:#90e6cb','#studioPrimaryAction','#studioExercisesAction','#fitSessionPanel #fitMainClock'])assert.ok(css.includes(target),target);
 assert.ok(css.includes('color:var(--studio-ink)!important'));
 assert.ok(css.includes('color:var(--studio-pop)'));
 assert.ok(css.includes('#fitnessRoot #fitExercisePanel .fit-card'));
});
test('Mobile iPhone layout and reduced motion stay supported',()=>{
 assert.ok(css.includes('@media(max-width:600px)'));
 assert.ok(css.includes('@media(max-width:390px)'));
 assert.ok(css.includes('@media(prefers-reduced-motion:reduce)'));
 assert.ok(js.includes("prefers-reduced-motion: reduce"));
 assert.ok(css.includes('.studio-hero-actions'));
 assert.ok(css.includes('.studio-progress-card'));
 assert.doesNotMatch(css,/animation:\s*[^;]*infinite/i);
 assert.ok(!html.includes('id="studioStart"'));
});
test('Workout hero tracks existing set and session state without changing persisted training data',()=>{
 const makeElement=(data={})=>{
  const listeners={};
  return {textContent:'',disabled:false,attributes:{},style:{setProperty(name,value){this[name]=value}},
   setAttribute(name,value){this.attributes[name]=value},addEventListener(type,fn){listeners[type]=fn},
   scrollIntoView(options){this.scrolled=options},
   click(){this.clicked=true;listeners.click?.()},
   ...data
  };
 };
 const fields={
  studioPrimaryAction:makeElement(),
  studioExercisesAction:makeElement(),
  studioMealAction:makeElement(),
  studioWorkoutState:makeElement(),
  studioProgressNote:makeElement(),
  studioDoneCount:makeElement(),
  studioProgressRing:makeElement(),
  fitSessionLabel:makeElement({textContent:'Antrenman başlatılmadı'}),
  fitCompletedText:makeElement({textContent:'0 / 39 set'}),
  fitStart:makeElement(),
  fitExercisePanel:makeElement(),
  fitSchedulePanel:makeElement({querySelector(){return {open:false}}}),
  mealQuickPanel:makeElement()
 };
 const window={document:{
  readyState:'complete',visibilityState:'visible',
  getElementById:id=>fields[id]||null,
  addEventListener(){},
 },addEventListener(){},matchMedia(){return {matches:false}}};
 const FakeObserver=function(callback){this.observe=()=>{}};
 vm.runInNewContext(js,{window,MutationObserver:FakeObserver});
 const studio=window.FormaRotaStudio;
 assert.equal(studio.snapshot().running,false);
 assert.equal(fields.studioPrimaryAction.textContent,'▶ Antrenmana başla');
 assert.equal(fields.studioDoneCount.textContent,'0');
 fields.studioPrimaryAction.click();
 assert.equal(fields.fitStart.clicked,true);
 fields.fitSessionLabel.textContent='2026-10-25 · Antrenman sürüyor · Lat Pulldown';
 fields.fitCompletedText.textContent='17 / 39 set';
 studio.update();
 assert.equal(fields.studioDoneCount.textContent,'17');
 assert.equal(fields.studioProgressRing.attributes['aria-valuenow'],'17');
 assert.equal(fields.studioProgressRing.style['--studio-value'],(17/39*100).toFixed(1)+'%');
 assert.equal(fields.studioPrimaryAction.textContent,'↗ Setlere devam et');
 fields.studioPrimaryAction.click();
 assert.equal(fields.fitExercisePanel.scrolled.block,'start');
 fields.fitSessionLabel.textContent='2026-10-25 · Duraklatıldı · Lat Pulldown';
 studio.update();
 assert.equal(fields.studioWorkoutState.textContent,'Ⅱ Antrenman duraklatıldı');
 fields.studioExercisesAction.click();
 assert.ok(fields.fitExercisePanel.scrolled);
 fields.studioMealAction.click();
 assert.ok(fields.mealQuickPanel.scrolled);
 fields.fitSessionLabel.textContent='Antrenman başlatılmadı';
 fields.fitStart.disabled=true;
 studio.update();
 assert.equal(fields.studioPrimaryAction.textContent,'Haftalık planı gör');
 fields.studioPrimaryAction.click();
 assert.ok(fields.fitSchedulePanel.scrolled);
});
test('Studio assets are offline cached, independent of original data modules and all inline scripts parse',()=>{
 for(const asset of ['studio-relaunch.css','studio-relaunch.js']){
  assert.ok(html.includes('./assets/'+asset));
  assert.ok(sw.includes("'./assets/"+asset+"'"));
 }
 for(const asset of ['luxe-ui.js','coach-engine-v35.js','fitness-record-editor.js','turkish-foods.js','dinner-coach.js']){
  assert.ok(sw.includes(asset));
 }
 new vm.Script(js);
 for(const m of html.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/g))assert.doesNotThrow(()=>new vm.Script(m[1]));
 assert.equal(JSON.parse(read('manifest.webmanifest')).id,'./index.html');
});

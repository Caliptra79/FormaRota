'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.join(__dirname,'..');
const source=p=>fs.readFileSync(path.join(root,p),'utf8');
const html=source('index.html'),css=source('assets/visual-identity-2-home.css');
const start=html.indexOf('<section class="panel wide fr2-home" data-view="home" id="homePanel">');
const end=html.indexOf('<section class="route-heading wide studio-nutrition-hero"',start);
const home=html.slice(start,end);
const appearances=(id,text=html)=>(text.match(new RegExp('id="'+id+'"','g'))||[]).length;
test('dashboard is structurally redesigned, not a legacy hero restyle',()=>{
 assert.ok(start>0);assert.ok(end>start);
 assert.ok(home.includes('class="fr2-stage"'));
 assert.ok(home.includes('class="fr2-dashboard"'));
 assert.ok(home.includes('class="fr2-lower"'));
 assert.ok(home.includes('class="fr2-metrics"'));
 assert.ok(home.includes('class="mini-panel fr2-meals"'));
 assert.ok(home.includes('class="fr2-habits"'));
 assert.ok(home.includes('class="fr2-story"'));
 assert.ok(!home.includes('class="home-intro studio-home-intro"'));
});
test('workout CTA is inside dashboard stage, not buried among meal buttons',()=>{
 const stage=home.slice(home.indexOf('class="fr2-stage"'),home.indexOf('class="fr2-dashboard"'));
 const meal=home.slice(home.indexOf('class="mini-panel fr2-meals"'),home.indexOf('class="fr2-lower"'));
 assert.ok(stage.includes('id="homeWorkout"'));
 assert.ok(!meal.includes('id="homeWorkout"'));
 for(const id of ['homeBreakfast','homeLunch','homeDinner','homeSnack'])assert.ok(meal.includes('id="'+id+'"'));
 assert.ok(html.includes("navigateTo('fitness','workoutProgramChooser')"));
});
test('all previously functional home controls and stats still have exactly one ID',()=>{
 const ids=['homePanel','homeWorkout','homeSessionTag','homeDateLabel','spProgressRings',
 'frRankHome','spWeekTeaser','homeChecklist','homeKcal','homeKcalGoal','homeKcalBar',
 'homeProtein','homeProteinGoal','homeProteinBar','homeBreakfast','homeLunch',
 'homeDinner','homeSnack','waterCount','waterPlus','waterMinus','waterGoal',
 'walkCount','walkToggle','walkKm','homeBackupAlert','homeTrends','homeBackup'];
 for(const id of ids)assert.equal(appearances(id),1,id);
});
test('existing refresh, navigation, water, walking and backup handlers are intact',()=>{
 for(const call of [
 "function renderHome()","$('homeBreakfast').addEventListener('click'",
 "$('homeLunch').addEventListener('click'",
 "$('homeDinner').addEventListener('click'",
 "$('homeSnack').addEventListener('click'",
 "$('homeWorkout').addEventListener('click'",
 "$('homeTrends').addEventListener('click'",
 "$('homeBackup').addEventListener('click'",
 "$('waterPlus').addEventListener('click'",
 "$('waterMinus').addEventListener('click'",
 "$('walkToggle').addEventListener('click'",
 "$('walkKm').addEventListener('change'",
 "function renderWaterWalk()",
 "window.FormaRotaStudioPlus?.refresh?.()"
 ])assert.ok(html.includes(call),call);
});
test('four preexisting live metrics are displayed as compact linear bars with accessible values',()=>{
 assert.equal(appearances('spProgressRings',home),1);
 assert.ok(home.includes('id="spProgressRings" class="sp-rings"'));
 assert.ok(home.includes('aria-labelledby="frhDailyHeadingTitle"'));
 assert.ok(css.includes('.sp-goal-card .sp-goal-ring'));
 assert.ok(css.includes('grid-template-rows:minmax(0,1fr) 8px'));
 assert.ok(css.includes('linear-gradient(to right,'));
 assert.ok(css.includes('var(--sp-progress)'));
 assert.ok(source('assets/studio-plus.js').includes("graphic.setAttribute('role','progressbar')"));
});
test('the Rank and weekly teaser remain intact in a lower, distinct history panel',()=>{
 const story=home.slice(home.indexOf('class="fr2-story"'),home.indexOf('class="backup-alert"'));
 assert.ok(story.indexOf('id="spWeekTeaser"')>0);
 assert.ok(story.indexOf('id="frRankHome"')>story.indexOf('id="spWeekTeaser"'));
 assert.ok(home.indexOf('id="spProgressRings"')<home.indexOf('id="spWeekTeaser"'));
});
test('visual system has responsive iPhone layout at small phone widths and seven-theme tokens',()=>{
 for(const width of [800,640,420,355])assert.ok(css.includes('@media(max-width:'+width+'px)'),width);
 assert.ok(css.includes('grid-template-columns:repeat(2,minmax(0,1fr))'));
 assert.ok(css.includes('grid-template-columns:minmax(0,1fr)'));
 for(const token of ['var(--studio-ink)','var(--studio-pop)','var(--panel)',
  'var(--accent)','var(--border)','var(--sp-tone)'])
  assert.ok(css.includes(token),token);
 for(const theme of ['night','ocean','light','sand','neon','volt','sunset'])
  assert.ok(html.includes('<option value="'+theme+'">'),theme);
});
test('new stage is not hidden by old home styles and loads last',()=>{
 const cssStart=html.indexOf('href="./assets/visual-identity-2-home.css"');
 assert.ok(cssStart>html.indexOf('href="./assets/hybrid-premium-fitness.css"'));
 assert.ok(cssStart<html.indexOf('</head>'));
 assert.ok(css.includes('#homePanel.fr2-home'));
 assert.ok(css.includes('background:transparent!important'));
 assert.ok(css.includes('border:0!important'));
});
test('motion accessibility choices and fitness program remain unchanged',()=>{
 assert.ok(html.includes('id="frhMotionSelect"'));
 for(const m of ['normal','reduced','system'])assert.ok(html.includes('<option value="'+m+'">'),m);
 assert.ok(css.includes('data-fr-motion="reduced"'));
 assert.ok(html.includes('id="fitExerciseList"'));
 assert.ok(html.includes('id="workoutProgramChooser"'));
 assert.ok(source('assets/hybrid-premium-fitness.js').includes('updateCards()'));
 const gifs=fs.readdirSync(path.join(root,'assets')).filter(x=>x.endsWith('.gif'));
 assert.equal(gifs.length,19);
});
test('only new display CSS is cached; no record or backup schema revisions',()=>{
 const sw=source('sw.js');
 assert.ok(sw.includes("'./assets/visual-identity-2-home.css'"));
 assert.match(sw,/formarota-solo-v\d+-shell/);
 assert.ok(sw.includes('const GIFS='));
 assert.ok(html.includes('collectBackup(){return{version:7'));
 assert.ok(html.includes('kocluk-fitness-history-v1'));
 assert.ok(html.includes('kocluk-food-log-v2'));
 assert.ok(!css.includes('display:none!important}.home-actions'));
});

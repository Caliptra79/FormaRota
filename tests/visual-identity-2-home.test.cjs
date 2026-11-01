'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const source=p=>fs.readFileSync(path.join(__dirname,'..',p),'utf8');
const html=source('index.html'),css=source('assets/oled-home.css');
const a=html.indexOf('<section class="panel wide oled-home" data-view="home" id="homePanel">');
const b=html.indexOf('<section class="route-heading wide studio-nutrition-hero"',a);
const home=html.slice(a,b);
const count=id=>(html.match(new RegExp('id="'+id+'"','g'))||[]).length;
test('OLED Edition replaces the promotional stage with actual daily metrics',()=>{
 assert.ok(a>=0&&b>a);
 for(const word of ['Bugünkü Durum','Kalori planı','Günlük ilerleme','Hızlı kayıt','Bugün neler var?','Son kayıtlar']){
  assert.ok(home.includes(word),word);
 }
 for(const legacy of ['İlerlemeni','sen yönet','class="fr2-stage"','class="fr2-brand"','fr2-art-core'])
  assert.ok(!home.includes(legacy),legacy);
});
test('big circular calorie progress and macro values are visible and accessible',()=>{
 for(const id of ['oledKcalRing','oledKcalValue','oledKcalTarget','oledKcalState',
  'oledCarbs','oledFat','oledProtein','oledProteinBar'])
  assert.equal(count(id),1,id);
 assert.ok(home.includes('role="progressbar"'));
 assert.ok(home.includes('aria-valuenow="0"'));
 assert.ok(css.includes('conic-gradient('));
 assert.ok(css.includes('var(--oled-progress)'));
});
test('four circular daily goals and quick meal actions are kept separate',()=>{
 assert.equal(count('spProgressRings'),1);
 for(const id of ['homeBreakfast','homeLunch','homeDinner','homeSnack','homeWorkout'])
  assert.equal(count(id),1,id);
 const rings=source('assets/studio-plus.js');
 for(const label of ["name:'Protein'","name:'Su'","name:'Yürüyüş'","name:'Antrenman'"])
  assert.ok(rings.includes(label),label);
 assert.ok(css.includes('.sp-goal-ring'));
 assert.ok(css.includes('conic-gradient('));
});
test('day plan, recent meals and existing Rank/weekly reports stay in separate regions',()=>{
 for(const id of ['oledTodayPlan','oledRecentList','oledRecentAll','spWeekTeaser','frRankHome'])
  assert.equal(count(id),1,id);
 assert.ok(home.indexOf('id="oledTodayPlan"')<home.indexOf('id="oledRecentList"'));
 assert.ok(home.indexOf('id="oledRecentList"')<home.indexOf('id="spWeekTeaser"'));
});
test('every original daily action retains its exact ID, storage key and listener',()=>{
 const ids=['homePanel','homeSessionTag','homeDateLabel','homeKcal','homeKcalGoal',
  'homeKcalBar','homeProtein','homeProteinGoal','homeProteinBar','homeChecklist',
  'homeBreakfast','homeLunch','homeDinner','homeSnack','homeWorkout',
  'waterCount','waterMinus','waterPlus','waterGoal','walkCount','walkToggle','walkKm',
  'homeBackupAlert','homeTrends','homeBackup'];
 for(const id of ids)assert.equal(count(id),1,id);
 for(const id of ['homeWorkout','homeBreakfast','homeLunch','homeDinner','homeSnack','waterPlus','walkToggle']){
  assert.ok(html.includes("$('"+id+"').addEventListener('click'"),id);
 }
 assert.ok(html.includes("function collectBackup(){return{version:7"));
});
test('the same OLED screen works responsively and preserves reduce-motion preference',()=>{
 for(const width of [830,700,400])assert.ok(css.includes('@media(max-width:'+width+'px)')||css.includes('@media(min-width:'+width+'px)'));
 assert.ok(css.includes('grid-template-columns:repeat(2,minmax(0,1fr))'));
 assert.ok(css.includes('data-fr-motion="reduced"'));
});
test('all ten themes are selectable, the first three are OLED choices',()=>{
 const names=['oled-black','oled-neon','oled-ember','night','ocean','light','sand','neon','volt','sunset'];
 for(const id of names)assert.ok(html.includes('<option value="'+id+'">'),id);
 assert.ok(html.includes("localStorage.getItem('formarota-ui-theme')||'oled-black'"));
 assert.ok(html.includes("includes(t)?t:'oled-black'"));
 assert.ok(html.includes("collectBackup(){return{version:7"));
});
test('the new visual styles are loaded after previous identity layers',()=>{
 const x=html.indexOf('href="./assets/oled-edition.css"');
 const y=html.indexOf('href="./assets/oled-home.css"');
 assert.ok(x>html.indexOf('href="./assets/visual-identity-2-home.css"'));
 assert.ok(y>x&&y<html.indexOf('</head>'));
});
test('all OLED files are precached for offline PWA and GIFs are retained',()=>{
 const sw=source('sw.js');
 for(const name of ['oled-edition.css','oled-home.css','oled-home.js'])
  assert.ok(sw.includes("'./assets/"+name+"'"),name);
 assert.match(sw,/formarota-solo-v\d+-shell/);
 assert.ok(sw.includes("const GIFS="));
 assert.equal(fs.readdirSync(path.join(__dirname,'../assets')).filter(x=>x.endsWith('.gif')).length,19);
});

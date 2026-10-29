'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const source=p=>fs.readFileSync(path.join(__dirname,'..',p),'utf8');
const html=source('index.html'),css=source('assets/oled-screens.css'),sw=source('sw.js'),luxe=source('assets/luxe-ui.js');
const options=['oled-black','oled-neon','oled-ember','night','ocean','light','sand','neon','volt','sunset'];
test('settings contains one unified ten-theme select and the established preview dialog',()=>{
 assert.equal((html.match(/id="themeSelect"/g)||[]).length,1);
 assert.equal((html.match(/id="luxeThemeLaunch"/g)||[]).length,1);
 for(const name of options){
  assert.ok(html.includes('<option value="'+name+'">'),name);
  assert.ok(luxe.includes("id:'"+name+"'"),name+' missing from live preview');
 }
 assert.ok(html.includes("localStorage.getItem('formarota-ui-theme')||'oled-black'"));
 assert.ok(luxe.includes('openThemeDialog(launch)'));
 assert.ok(luxe.includes("select.addEventListener('change',updateThemeLaunch)"));
});
test('duplicate standalone OLED cards and injector are completely removed',()=>{
 for(const fragment of ['oledThemeQuick','oled-theme-quick','oled-theme-choices','oled-theme-choice','oled-theme-preview','oled-theme-quick.js']){
  assert.ok(!html.includes(fragment),fragment+' still in HTML');
  assert.ok(!css.includes(fragment),fragment+' still in CSS');
  assert.ok(!sw.includes(fragment),fragment+' still in service worker');
 }
 assert.equal(fs.existsSync(path.join(__dirname,'../assets/oled-theme-quick.js')),false);
});
test('all three OLED palettes remain fully functional and do not modify old palettes',()=>{
 const styles=source('assets/oled-edition.css');
 for(const theme of options.slice(0,3)){
  assert.ok(styles.includes('html[data-theme="'+theme+'"]'));
 }
 assert.ok(styles.includes('--bg:#000000'));
 for(const theme of options.slice(3))assert.ok(luxe.includes("id:'"+theme+"'"));
 assert.ok(!luxe.includes('oledThemeQuick'));
});
test('the OLED styles still decorate nutrition, fitness, coaching, progress, rank and settings',()=>{
 for(const selector of [
  '#nutritionTop .stat','#v21Budget .v21-box','#searchPanel',
  '#studioFitnessHero .studio-hero-content','#fitExercisePanel .fit-card',
  '#coachOverview .coach-main-tip','#trainerRecovery',
  '#frRankFull .fr-rank-row strong','#v21ExerciseChart','#v21WeightChart',
  '#preferencesPanel .luxe-theme-launch'
 ])assert.ok(css.includes(selector),selector);
 assert.ok(css.includes('@media(max-width:420px)'));
 assert.ok(css.includes('@media(max-width:700px)'));
 assert.ok(css.includes('html[data-theme^="oled-"]'));
 assert.ok(!css.includes('localStorage'));
});
test('OLED styles and existing main theme dialog stay precached for PWA offline',()=>{
 assert.ok(html.indexOf('oled-screens.css')>html.indexOf('oled-home.css'));
 for(const name of ['oled-screens.css','oled-edition.css','luxe-ui.js','luxe-ui.css']){
  assert.ok(sw.includes("'./assets/"+name+"'"),name);
 }
 assert.match(sw,/const CACHE='formarota-solo-v84-shell'/);
 assert.ok(sw.includes('const GIFS='));
});
test('duplicate-pickers removal does not affect JSON backup, food, fitness or GIF data',()=>{
 assert.ok(html.includes('function collectBackup(){return{version:7'));
 assert.ok(html.includes('kocluk-food-log-v2'));
 assert.ok(html.includes('kocluk-fitness-history-v1'));
 assert.ok(html.includes('formarota-fitness-day-plan-v1'));
 assert.ok(luxe.includes("const THEMES=["));
 assert.equal(fs.readdirSync(path.join(__dirname,'../assets')).filter(p=>p.endsWith('.gif')).length,19);
});

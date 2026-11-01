'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const base=path.join(__dirname,'..');
const contentOf=rel=>fs.readFileSync(path.join(base,rel),'utf8');
const html=contentOf('index.html'),sw=contentOf('sw.js'),browser=contentOf('tests/viewport-browser.cjs');
test('discontinued Apple Health bridge is absent from interface, startup, and offline assets',()=>{
 for(const id of ['frHealthBridge','frHealthPaste','frHealthImport','frHealthRecords','frHealthFile'])
  assert.ok(!html.includes('id="'+id+'"'),id);
 for(const asset of ['apple-health-bridge.js','apple-health-bridge.css']){
  assert.equal(fs.existsSync(path.join(base,'assets',asset)),false,asset);
  assert.ok(!html.includes(asset),asset+' not loaded');
  assert.ok(!sw.includes(asset),asset+' not precached');
 }
 assert.doesNotMatch(html,/FormaRotaAppleHealth|appleHealth:window\.|data\.appleHealth|FORMAROTA_HEALTH_V1/);
 assert.doesNotMatch(browser,/frHealthInput|frHealthImport|Apple Health paste import/);
 assert.match(sw,/formarota-solo-v100-shell/);
});
test('manual fitness, nutrition, weight, water and walk records remain in application',()=>{
 for(const marker of [
  'id="workoutProgramChooser"','id="absManualToggle"','id="frCaloriePlan"',
  'id="foodLogPanel"','id="weightKg"','id="exportBtn"',
  "formarota-water-v1","formarota-walks-v1",
  "kocluk-fitness-history-v1"
 ])assert.ok(html.includes(marker),marker);
 assert.ok(html.includes("function collectBackup(){return{version:7"),'same backup version');
 assert.ok(html.includes('window.FormaRotaABSEngine?.validateBackup?.'),'ABS import preserved');
 assert.match(sw,/'\.\/assets\/abs-workouts\.js'/);
 assert.match(sw,/'\.\/assets\/route-map\.js'/);
});

'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const source=pathName=>fs.readFileSync(path.join(__dirname,'..',pathName),'utf8');
const api=require('../assets/apple-health-bridge.js');
const date='2026-11-01';
const sample='FORMAROTA_HEALTH_V1\nDATE=2026-11-01\nSTEPS=8500\nDISTANCE_KM=5,2\nACTIVE_KCAL=430';
test('Apple Shortcuts daily totals import is explicit and accepts local decimal commas',()=>{
 const r=api.parse(sample,date);
 assert.deepEqual({...r},{date,steps:8500,distanceKm:5.2,activeKcal:430});
 assert.equal(api.parse(sample.replace('STEPS=8500','STEPS=8.500'),date).steps,8500);
 assert.equal(api.parse(sample.replace('ACTIVE_KCAL=430','ACTIVE_KCAL=430,75'),date).activeKcal,430.8);
 assert.equal(api.parse(JSON.stringify({format:'FORMAROTA_HEALTH_V1',date,steps:8500,distanceKm:5.2,activeKcal:430}),date).distanceKm,5.2);
});
test('Apple Health input rejects future/invalid dates, huge or negative data, duplicate keys and garbage',()=>{
 for(const [from,to] of [
  ['DATE=2026-11-01','DATE=2026-11-02'],
  ['DATE=2026-11-01','DATE=2026-02-30'],
  ['STEPS=8500','STEPS=-55'],
  ['STEPS=8500','STEPS=1.5'],
  ['STEPS=8500','STEPS=8500000'],
  ['DISTANCE_KM=5,2','DISTANCE_KM=900'],
  ['ACTIVE_KCAL=430','ACTIVE_KCAL=nan'],
  ['ACTIVE_KCAL=430','ACTIVE_KCAL=Infinity'],
  ['STEPS=8500','STEPS='],
  ['ACTIVE_KCAL=430','ACTIVE_KCAL=20000']
 ]){
  assert.throws(()=>api.parse(sample.replace(from,to),date),Error,to);
 }
 assert.throws(()=>api.parse(sample+'\nSTEPS=2',date),/tekrarlanan/);
 assert.throws(()=>api.parse('OTHER\n'+sample,date),/değil/);
 assert.throws(()=>api.parse(sample+' '.repeat(21000),date),/çok büyük/);
 assert.throws(()=>api.parse('FORMAROTA_HEALTH_V1\nDATE=2026-11-01\nSTEPS=0\nDISTANCE_KM=0\nACTIVE_KCAL=0',date),/sıfır/);
});
test('daily snapshot storage is validated; older FormaRota backups can omit Apple Health',()=>{
 const row=api.parse(sample,date);
 assert.equal(api.validateBackup({}),true);
 assert.equal(api.validateBackup({[date]:row},date),true);
 assert.equal(api.validateBackup({[date]:{...row,source:'apple-shortcuts',importedAt:'2026-11-01T11:00:00Z'}},date),true);
 assert.equal(api.validateBackup({[date]:{...row,steps:-5}},date),false);
 assert.equal(api.validateBackup({[date]:{...row,date:'2026-10-31'}},date),false);
 assert.equal(api.validateBackup({'2026-11-02':{...row,date:'2026-11-02'}},date),false);
 assert.equal(api.validateBackup([]),false);
});
test('browser assets, service worker and backup restore include daily Health stats without changing walks or calorie math',()=>{
 const html=source('index.html'),sw=source('sw.js'),css=source('assets/apple-health-bridge.css');
 for(const id of ['frHealthBridge','frHealthTitle','frHealthInput','frHealthImport','frHealthPaste',
   'frHealthFile','frHealthSelectFile','frHealthLatest','frHealthRecords','frHealthStatus'])
  assert.equal(html.split('id="'+id+'"').length-1,1,id);
 assert.match(html,/assets\/apple-health-bridge\.js/);
 assert.match(html,/assets\/apple-health-bridge\.css/);
 assert.match(sw,/'\.\/assets\/apple-health-bridge\.js'/);
 assert.match(sw,/'\.\/assets\/apple-health-bridge\.css'/);
 assert.match(sw,/formarota-solo-v99-shell/);
 assert.match(html,/appleHealth:window\.FormaRotaAppleHealth\?\.read\?\.\(\)\|\|\{\}/);
 assert.match(html,/data\.appleHealth!=null&&!window\.FormaRotaAppleHealth\?\.validateBackup\?\.\(data\.appleHealth\)/);
 assert.match(html,/changes\.push\(\['formarota-apple-health-v1',data\.appleHealth\]\)/);
 assert.match(html,/window\.FormaRotaAppleHealth\?\.render\?\.\(\)/);
 assert.match(css,/@media\(max-width:540px\)/);
 assert.match(source('assets/apple-health-bridge.js'),/root\.localStorage\.setItem\(KEY,JSON\.stringify\(records\)\)/);
 assert.doesNotMatch(source('assets/apple-health-bridge.js'),/formarota-walks-v1|goalKcal|kocluk-fitness-history-v1/);
 assert.doesNotMatch(source('assets/calorie-deficit.js'),/apple-health|AppleHealth|activeKcal/);
 assert.ok(html.includes('function collectBackup(){return{version:7'));
});

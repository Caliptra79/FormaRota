'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const path=require('node:path');
const fs=require('node:fs');
const {resolveAsset,externalURL}=require('./security.cjs');
const root=path.resolve(__dirname,'app');
test('bundled app origin always maps to an explicit allowed asset',()=>{
 const entry=resolveAsset(root,'app://formarota/index.html#/anasayfa');
 assert.equal(entry.filePath,path.join(root,'index.html'));
 assert.match(entry.contentType,/text\/html/);
 assert.equal(resolveAsset(root,'app://formarota/').filePath,entry.filePath);
 const gif=resolveAsset(root,'app://formarota/assets/lat.gif');
 assert.equal(gif.filePath,path.join(root,'assets','lat.gif'));
});
test('local protocol rejects path tricks and non-app origins',()=>{
 for(const url of [
  'file:///C:/Windows/system.ini','https://formarota/index.html',
  'app://other/index.html','app://formarota/.env',
  'app://formarota/%2ehidden','app://formarota/%5csecret.txt',
  'app://formarota/assets/secret.exe','app://formarota/%00evil.css',
  'app://formarota/%ZZ/index.html'
 ])assert.equal(resolveAsset(root,url),null,url);
});
test('unknown external navigation is blocked, links can only open HTTPS',()=>{
 for(const input of ['javascript:alert(1)','file:///C:/Windows','http://example.com','data:text/html,Hello','https://user:password@example.com']){
  assert.equal(externalURL(input),null);
 }
 assert.equal(externalURL('https://world.openfoodfacts.org/'),'https://world.openfoodfacts.org/');
});
test('desktop bundle is complete and keeps workout history intact',()=>{
 assert.ok(fs.existsSync(path.join(root,'index.html')));
 const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
 assert.ok(!html.includes("navigator.serviceWorker.register('./sw.js')"));
 assert.ok(html.includes('function collectBackup(){return{version:7'));
 assert.ok(html.includes("kocluk-food-log-v2"));
 assert.ok(html.includes('FormaRotaTurkishFoods'));
 assert.ok(html.includes('fitness-record-editor.js'));
 assert.ok(html.includes('id="globalTodayDate"'));
 const gifs=fs.readdirSync(path.join(root,'assets')).filter(x=>x.endsWith('.gif'));
 assert.equal(gifs.length,15);
});

// User-facing application branding must remain free of build/version labels.
// Run: node --test tests/versionless-ui.test.cjs
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=name=>fs.readFileSync(path.join(__dirname,'..',name),'utf8');
const html=root('index.html');
const manifest=JSON.parse(root('manifest.webmanifest'));
const shell=root('sw.js');
test('PWA home-screen names show no build version',()=>{
 assert.equal(manifest.name,'FormaRota');
 assert.equal(manifest.short_name,'FormaRota');
 assert.doesNotMatch(manifest.name,/\bv\d+(?:\.\d+)*\b/i);
 assert.doesNotMatch(manifest.short_name,/\bv\d+(?:\.\d+)*\b/i);
});
test('existing app installation identity and route remain unchanged',()=>{
 assert.equal(manifest.id,'./index.html');
 assert.equal(manifest.start_url,'./index.html#/anasayfa');
 assert.equal(manifest.display,'standalone');
 assert.ok(manifest.icons.some(x=>x.src==='./icon-192.png'));
 assert.ok(manifest.icons.some(x=>x.src==='./icon-512.png'));
});
test('settings import preview contains useful counts, not a backup format version',()=>{
 const marker="$('importPreviewText').textContent=";
 const start=html.indexOf(marker);
 assert.ok(start>=0);
 const end=html.indexOf(";$('importPreview').classList",start);
 assert.ok(end>start);
 const view=html.slice(start,end);
 for(const item of ['Yemek kaydı:','Kişisel besin:','Tartı:','Antrenman:'])assert.ok(view.includes(item),item);
 assert.doesNotMatch(view,/(?:Sürüm|Versiyon|version)\s*:/i);
});
test('no public app version meta is embedded in rendered index page',()=>{
 assert.doesNotMatch(html,/name=['"]application-version['"]/i);
 assert.match(html,/<h1>FormaRota<\/h1>/);
 assert.match(html,/<title>FormaRota \| Ana Sayfa<\/title>/);
});
test('backup schema version 7 remains for safe old and new imports',()=>{
 assert.ok(html.includes("function collectBackup(){return{version:7"));
 assert.ok(html.includes('pendingImportData=data'));
 assert.ok(html.includes('importSafetyReady'));
 assert.doesNotMatch(html,/Sürüm:\s*\$\{data\.version/);
 assert.ok(html.includes("function closeImportPreview()"));
 assert.ok(html.includes("id=\"confirmImport\""));
});
test('service worker refreshes PWA manifest and retains GIF precache',()=>{
 assert.match(shell,/formarota-solo-v\d+-shell/);
 assert.ok(shell.includes("'./manifest.webmanifest'"));
 const gifs=shell.match(/const GIFS=\[([^\]]+)\]/)?.[1];
 assert.ok(gifs);
 assert.equal((gifs.match(/'/g)||[]).length/2,15);
});

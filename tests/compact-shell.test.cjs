const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const get=f=>fs.readFileSync(path.join(__dirname,'..',f),'utf8');
const html=get('index.html'),css=get('assets/compact-shell.css'),sw=get('sw.js');
test('redundant marketing masthead is entirely removed, not merely hidden',()=>{
 assert.ok(html.includes('<body class="compact-app-shell">'));
 assert.doesNotMatch(html,/<header(?:\s|>)/i);
 assert.doesNotMatch(html,/Beslenme · Antrenman · Gelişim/);
 assert.doesNotMatch(html,/class="brand-lockup"/);
 assert.ok(html.includes('<h1 class="sr-only">FormaRota'));
 assert.ok(css.includes('.sr-only{'));
});
test('section headings and functional navigation remain available',()=>{
 for(const name of ['Ana','Beslenme','Fitness','Gelişim','Ayarlar']){
  assert.ok(html.includes('<span>'+name+'</span>'),'bottom navigation '+name);
 }
 for(const view of ['home','nutrition','dinner','recipes','fitness','fitness-history','settings']){
  assert.ok(html.includes('data-view="'+view+'"')||html.includes("view='"+view+"'"),view);
 }
 assert.ok(html.includes('id="contextNav"'));
 assert.ok(html.includes('id="nutritionLinks"'));
 assert.ok(html.includes('id="fitnessLinks"'));
 assert.ok(html.includes("document.body.classList.toggle('has-subnav',nutritionPage||fitnessPage)"));
 assert.ok(html.includes("button.dataset.tab||button.dataset.go"));
});
test('root navigation keeps menu hidden outside meal and fitness routes',()=>{
 const show=html.slice(html.indexOf('function showView(view,scroll=true,updateURL=true)'),html.indexOf('function navigateTo(view,id)'));
 assert.ok(show.startsWith('function showView('));
 assert.ok(show.includes("$('contextNav').classList.toggle('hidden',!nutritionPage&&!fitnessPage)"));
 assert.ok(show.includes("$('nutritionLinks').classList.toggle('hidden',!nutritionPage)"));
 assert.ok(show.includes("$('fitnessLinks').classList.toggle('hidden',!fitnessPage)"));
 assert.ok(show.includes('button.classList.toggle'));
});
test('home summary does not present a redundant Solo badge',()=>{
 assert.ok(html.includes('id="homeSessionTag" aria-live="polite"'));
 assert.ok(html.includes("badge.classList.toggle('hidden',!fitCurrent&&!basketballDay)"));
 assert.ok(html.includes('id="homeKcal"'));
 assert.ok(html.includes('id="homeProtein"'));
 assert.ok(html.includes('id="homeDateLabel"'));
 assert.ok(html.includes('id="homeChecklist"'));
});
test('safe-area and compact layout remain responsive across mobile widths',()=>{
 assert.ok(css.includes('env(safe-area-inset-top,0px)'));
 assert.ok(css.includes('width:min(100%,920px)'));
 assert.ok(css.includes('.context-nav.hidden{display:none!important}'));
 assert.ok(css.includes('.has-subnav main'));
 assert.match(css,/@media\(max-width:640px\)/);
 assert.match(css,/@media\(max-width:390px\)/);
 assert.ok(css.includes('min-height:44px'));
 assert.doesNotMatch(css,/:has\(/);
});
test('offline update caches new stylesheet and retains all original app assets',()=>{
 assert.ok(html.includes('./assets/compact-shell.css'));
 assert.ok(sw.includes("'./assets/compact-shell.css'"));
 for(const key of ['coach-engine-v35.js','fitness-record-editor.js','turkish-foods.js','dinner-coach.js','formarota-icon.svg'])assert.ok(sw.includes(key));
 const gifList=sw.match(/const GIFS=\[([^\]]+)\]/)?.[1];
 assert.ok(gifList);
 assert.equal((gifList.match(/'/g)||[]).length/2,19);
});
test('no personal data/backup schema or PWA install identity changes are introduced',()=>{
 const manifest=JSON.parse(get('manifest.webmanifest'));
 assert.equal(manifest.id,'./index.html');
 assert.equal(manifest.name,'FormaRota');
 assert.equal(manifest.start_url,'./index.html#/anasayfa');
 assert.ok(html.includes('function collectBackup(){return{version:7'));
 assert.ok(html.includes("const FIT_MOVES=["));
 assert.ok(html.includes("const logKey=\"kocluk-food-log-v2\""));
});
test('all inline scripts are syntactically valid after shell refactor',()=>{
 for(const m of html.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/g))assert.doesNotThrow(()=>new vm.Script(m[1]));
});

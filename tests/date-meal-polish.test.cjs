const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const read=p=>fs.readFileSync(path.join(__dirname,'..',p),'utf8'),html=read('index.html'),css=read('assets/date-meal-polish.css'),js=read('assets/date-masthead.js'),sw=read('sw.js');
test('date masthead appears once outside route-specific sections',()=>{
 assert.equal((html.match(/id="globalTodayDate"/g)||[]).length,1);
 assert.ok(html.indexOf('class="daily-masthead"')<html.indexOf('id="contextNav"'));
 assert.ok(html.includes('role="group" aria-label="Bugünün tarihi"'));
 assert.ok(html.includes('<time id="globalTodayDate"></time>'));
 assert.ok(html.includes('class="muted hidden" id="homeDateLabel" aria-hidden="true"'));
 assert.ok(!html.includes("homeDateLabel').textContent="));
 assert.ok(html.includes("window.FormaRotaDateMasthead?.refresh()"));
});
test('date display uses Turkish calendar format and the device-local date',()=>{
 const root={document:{readyState:'loading',addEventListener:()=>{}},addEventListener:()=>{}};
 vm.runInNewContext(js,{window:root,Date,Intl,Object,String});
 const d=new Date(2026,9,24,12);
 assert.equal(root.FormaRotaDateMasthead.iso(d),'2026-10-24');
 const label=root.FormaRotaDateMasthead.label(d);
 assert.match(label,/24 Ekim 2026/);
 assert.ok(label.includes('Cumartesi'));
 const time={dateTime:'',textContent:''};
 root.document.getElementById=id=>id==='globalTodayDate'?time:null;
 root.FormaRotaDateMasthead.refresh(d);
 assert.equal(time.dateTime,'2026-10-24');
 assert.equal(time.textContent,label);
});
test('all pages have safe-area-aware sticky date and scroll offsets',()=>{
 for(const word of ['position:sticky','top:0','env(safe-area-inset-top,0px)','scroll-padding-top','scroll-margin-top','z-index:50'])assert.ok(css.includes(word),word);
 assert.ok(css.includes('font-family:ui-rounded,'));
 assert.ok(css.includes('color:var(--text)'));
 assert.ok(css.includes('border-bottom:1px solid var(--border)'));
});
test('meal-card title and secondary copy override the general button ink in every theme',()=>{
 for(const part of ['#mealQuickPanel button.meal-card','button.meal-card .meal-description strong','color:var(--text)!important','-webkit-text-fill-color:var(--text)','button.meal-card .meal-description small','color:var(--muted)!important','color:var(--accent)!important'])assert.ok(css.includes(part),part);
 for(const name of ['night','ocean','light','sand','neon','volt','sunset'])assert.ok(html.includes('value="'+name+'"'));
});
test('additional transitions stay restrained and respect reduced motion',()=>{
 assert.ok(css.includes('animation:fr-soft-card 250ms'));
 assert.ok(css.includes('animation-delay:45ms'));
 assert.ok(css.includes('animation-delay:80ms'));
 assert.ok(css.includes('@media(prefers-reduced-motion:reduce)'));
 assert.ok(css.includes('animation:none!important'));
 assert.ok(!css.includes('infinite'));
});
test('functional date inputs, original workout and data remain untouched',()=>{
 for(const field of ['id="date" type="date"','id="weightDate" type="date"','id="v21MeasureDate"'])assert.ok(html.includes(field),field);
 assert.ok(html.includes('function collectBackup(){return{version:7'));
 assert.ok(html.includes('const FIT_MOVES=['));
 assert.ok(html.includes('fitSaveCurrent()'));
 assert.ok(html.includes('kocluk-food-log-v2'));
});
test('service worker and HTML include both assets and keep offline GIFs',()=>{
 for(const asset of ['date-meal-polish.css','date-masthead.js']){assert.ok(html.includes('./assets/'+asset));assert.ok(sw.includes("'./assets/"+asset+"'"))}
 const gifs=sw.match(/const GIFS=\[([^\]]+)\]/)?.[1]||'';
 assert.equal((gifs.match(/'/g)||[]).length/2,15);
 for(const m of html.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/g))assert.doesNotThrow(()=>new vm.Script(m[1]));
});

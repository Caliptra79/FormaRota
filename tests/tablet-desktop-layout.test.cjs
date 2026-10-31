'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const src=p=>fs.readFileSync(path.join(__dirname,'..',p),'utf8');
const html=src('index.html'),css=src('assets/tablet-desktop-layout.css'),sw=src('sw.js');

// A zero-top-level-declaration rule prevents accidental changes to phones.
function mediaRoots(source){
 const stripped=source.replace(/\/\*[\s\S]*?\*\//g,'');
 let depth=0,prelude='',roots=[];
 for(const char of stripped){
  if(char==='{'){
   if(depth===0){roots.push(prelude.trim());prelude='';}
   depth++;
  }else if(char==='}'){
   depth--;assert.ok(depth>=0,'unbalanced closing brace');
  }else if(depth===0){prelude+=char;}
 }
 assert.equal(depth,0,'unbalanced CSS braces');
 assert.equal(prelude.trim(),'','no stray declarations after media queries');
 return roots;
}
test('responsive layer is gated: no declarations can affect phone portrait or landscape',()=>{
 const roots=mediaRoots(css);
 assert.equal(roots.length,4);
 for(const rule of roots){
  assert.match(rule,/^@media\s*\(/);
  for(const part of rule.replace(/^@media\s*/, '').split(',')){
   const limits=[...part.matchAll(/min-width:\s*(\d+)px/g)].map(x=>Number(x[1]));
   assert.ok(limits.length>=1&&limits.every(v=>v>=768),
    'all media alternatives must be at least tablet wide: '+part);
   if(limits.some(v=>v<1200)){
    assert.match(part,/(min-height:\s*640px)|(hover:\s*hover)/,
     'tablet breakpoint must exclude landscape touch phones');
   }
  }
 }
 assert.doesNotMatch(css,/\b@import\b|\b@font-face\b/);
});
test('main shell and desktop navigation are balanced and keyboard accessible',()=>{
 for(const needle of [
  'main{','--fr-desktop-content-left:',
  'body.compact-app-shell .mobile-tabbar{',
  'grid-template-columns:minmax(0,1fr)!important;',
  'max-height:calc(100dvh - 96px)',
  'button:focus-visible',
  'grid-template-columns:minmax(0,1.08fr) minmax(0,.92fr)!important',
  'grid-template-columns:repeat(2,minmax(0,1fr))!important',
  '#fitExercisePanel .fit-card',
  '#searchPanel .food-result-controls',
  '#homePanel.oled-home .oled-routine .tracker-pair',
  '#homePanel.oled-home>.fr-route-home',
  '#frRoutePanel .fr-route-map',
  'aspect-ratio:400/420',
  'max-height:none!important',
  '(max-width:959px)'
 ])assert.ok(css.includes(needle),needle);
 const nav=html.slice(html.indexOf('<nav aria-label="Uygulama sayfaları"'),html.indexOf('</nav>',html.indexOf('<nav aria-label="Uygulama sayfaları"'))+6);
 for(const value of ['home','nutrition','fitness','progress','settings'])
  assert.ok(nav.includes('data-tab="'+value+'"'),value);
 assert.ok(nav.includes('aria-current="page"'));
});
test('style is appended last, preserving all 10 themes and the existing phone CSS',()=>{
 const link='<link rel="stylesheet" href="./assets/tablet-desktop-layout.css"/>';
 assert.equal(html.split(link).length-1,1);
 assert.ok(html.indexOf(link)>html.indexOf('<link rel="stylesheet" href="./assets/flexible-weekly-plan.css"/>'));
 for(const theme of ['oled-black','oled-neon','oled-ember','night','ocean','light','sand','neon','volt','sunset'])
  assert.ok(html.includes('<option value="'+theme+'">'),theme);
 assert.ok(html.includes('id="homePanel"'));
 assert.ok(html.includes('id="fitExercisePanel"'));
 assert.ok(html.includes('id="trackerDate"'));
 assert.ok(html.includes('function fitStartSession(){if(fitCurrent)return;'));
 assert.ok(html.includes('function collectBackup(){return{version:7'));
});
test('tablet and desktop map styling is scoped, preserving phone-only appearance',()=>{
 assert.match(css,/html\[data-theme\] #homePanel\.oled-home>\.fr-route-home\s*\{/);
 assert.match(css,/html\[data-theme\] #frRoutePanel \.fr-route-map\s*\{/);
 assert.match(css,/grid-template-columns:minmax\(0,1fr\)!important/);
 assert.match(css,/max-width:959px/);
 assert.match(css,/justify-self:center/);
 assert.ok(!css.includes('overflow-x:hidden'), 'do not hide overflow instead of fixing it');
});
test('new CSS is PWA precached; existing GIFs and data behavior remain unchanged',()=>{
 assert.match(sw,/const CACHE='formarota-solo-v\d+-shell'/);
 assert.match(sw,/const GIF_CACHE='formarota-solo-v\d+-gifs'/);
 assert.ok(sw.includes("'./assets/tablet-desktop-layout.css'"));
 assert.ok(sw.includes("'./assets/oled-home.css'"));
 assert.equal(fs.readdirSync(path.join(__dirname,'../assets')).filter(x=>x.endsWith('.gif')).length,19);
 assert.ok(html.includes('water:read(WATER_KEY,{})'));
 assert.ok(html.includes('walks:read(WALK_KEY,{})'));
});

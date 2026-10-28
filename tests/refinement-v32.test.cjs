// Run from repository root: node --test tests/refinement-v32.test.cjs
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const file=name=>fs.readFileSync(path.join(__dirname,'..',name),'utf8');
const html=file('index.html');
const css=file('assets/refinement-v32.css');
const previousCss=file('assets/theme-minimal-v26.css');
const hypeCss=file('assets/hype-themes-v29.css');
const js=file('assets/refinement-v32.js');
const sw=file('sw.js');

test('v32 loads its style and layout modules, including in offline shell',()=>{
 assert.doesNotMatch(html,/name="application-version"/);
 for(const file of ['refinement-v32.css','refinement-v32.js']){
  assert.ok(html.includes('./assets/'+file));
  assert.ok(sw.includes('./assets/'+file));
 }
 assert.match(sw,/formarota-solo-v\d+-shell/);
});
test('original fitness program, exercise GIFs and records remain',()=>{
 const start=html.indexOf('const FIT_MOVES=[');
 const block=html.slice(start,html.indexOf('];',start));
 assert.equal([...block.matchAll(/\bid:'[^']+',name:/g)].length,13);
 assert.ok(html.includes('figure.append(picture)'));
 assert.ok(html.includes('fitMarkSet(move.id,n)'));
 for(const value of ['kocluk-fitness-history-v1','kocluk-fitness-current-v1','kocluk-food-log-v2','kocluk-weight-v1'])assert.ok(html.includes(value));
 const list=sw.match(/const GIFS=\[([^\]]+)\]/)?.[1];
 assert.equal((list.match(/'/g)||[]).length/2,19);
});
test('large original exercise GIF dimensions are not reduced',()=>{
 assert.ok(previousCss.includes('width:min(100%,240px)'));
 assert.ok(previousCss.includes('width:138px'));
 assert.match(css,/width:min\(100%,240px\)/);
 assert.ok(!css.includes('width:112px'));
});
test('all seven original themes remain available',()=>{
 for(const name of ['night','ocean','light','sand','neon','volt','sunset']){
  assert.ok(html.includes('value="'+name+'"'));
  assert.ok((previousCss+hypeCss).includes('html[data-theme="'+name+'"]'));
 }
});
test('visual refinement has no write-to-storage or fitness calculation code',()=>{
 assert.doesNotMatch(js,/localStorage|indexedDB|fitSaveCurrent|fitSetHist|write\(/);
 new vm.Script(js);
});
test('nutrition and progress retain functional elements and interactive IDs',()=>{
 for(const id of ['nutritionTop','v21Budget','breakfastPanel','breakfastToggle','mealQuickPanel','profilePanel','weightKg','saveWeight','fitSchedulePanel','fitExerciseList','v21Report'])assert.ok(html.includes('id="'+id+'"'));
 for(const text of ['fr32-goal-summary','fr32-breakfast-details','progress-preferences','coachOverview'])assert.ok(js.includes(text));
});
test('relevant form controls and fold summaries have touch-friendly minimum sizes',()=>{
 assert.match(css,/main button,main select,header select\{min-height:44px\}/);
 assert.match(css,/main input\[type="number"\]/);
 assert.match(css,/\.coach-options>summary\{min-height:44px/);
 assert.match(css,/\.fit-card \.coach-technique>summary\{min-height:44px/);
 assert.match(css,/font-size:max\(16px,1rem\)/);
});
test('mobile, tablet and desktop breakpoints are explicitly handled',()=>{
 for(const breakpoint of [350,390,430,620,640])assert.ok(css.includes('@media(max-width:'+breakpoint+'px)'));
 assert.ok(css.includes('grid-template-columns:repeat(2,minmax(0,1fr))'));
 assert.ok(css.includes('env(safe-area-inset-bottom'));
});
test('unused focus styles are removed without removing GIF viewer styles',()=>{
 assert.ok(!previousCss.includes('#fitnessRoot.focus-mode .fit-card'));
 assert.ok(!previousCss.includes('.fit-focusnav'));
 assert.ok(previousCss.includes('fit-gif-preview'));
});
function brightness(hex){
 const rgb=hex.match(/[0-9a-fA-F]{2}/g).map(x=>parseInt(x,16)/255);
 const linear=rgb.map(x=>x<=.04045?x/12.92:Math.pow((x+.055)/1.055,2.4));
 return .2126*linear[0]+.7152*linear[1]+.0722*linear[2];
}
const contrast=(a,b)=>{const x=brightness(a),y=brightness(b);return (Math.max(x,y)+.05)/(Math.min(x,y)+.05)};
test('all seven palettes maintain at least AA contrast for basic panel labels and filled buttons',()=>{
 const palettes=previousCss+hypeCss;
 for(const name of ['night','ocean','light','sand','neon','volt','sunset']){
  const start=palettes.indexOf('html[data-theme="'+name+'"]{');
  assert.ok(start>=0,name);
  const style=palettes.slice(start,palettes.indexOf('}',start));
  const value=key=>style.match(new RegExp('--'+key+':(#[0-9a-fA-F]{6})'))?.[1];
  assert.ok(contrast(value('muted'),value('panel'))>=4.5,name+' muted/panel');
  assert.ok(contrast(value('onaccent'),value('accent'))>=4.5,name+' filled button');
 }
});

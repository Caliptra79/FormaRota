const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const read=name=>fs.readFileSync(path.join(__dirname,'..',name),'utf8');
const html=read('index.html'),sw=read('sw.js'),guard=read('assets/contrast-guard.css');
const base=read('assets/theme-minimal-v26.css'),hype=read('assets/hype-themes-v29.css'),luxe=read('assets/luxe-ui.css'),studio=read('assets/studio-relaunch.css');
const themes=['night','ocean','light','sand','neon','volt','sunset'];
function extractTokens(sheet,selector){
 const out={};let cursor=0;
 while((cursor=sheet.indexOf(selector+'{',cursor))>=0){
  const from=cursor+selector.length+1,to=sheet.indexOf('}',from);
  if(to<0)break;
  const block=sheet.slice(from,to);
  for(const token of block.matchAll(/--([\w-]+)\s*:\s*(#[\da-f]{6})\s*;/gi))out[token[1]]=token[2];
  cursor=to+1;
 }
 return out;
}
function palette(id){
 const sel='html[data-theme="'+id+'"]';
 return {...extractTokens(base,sel),...extractTokens(hype,sel)};
}
function accentPalette(id){
 const sel='html[data-theme="'+id+'"]';
 return {...extractTokens(luxe,'html[data-theme]'),...extractTokens(luxe,sel),...extractTokens(guard,sel)};
}
function studioPalette(id){
 const sel='html[data-theme="'+id+'"]';
 return {...extractTokens(studio,'html[data-theme]'),...extractTokens(studio,sel)};
}
function brightness(hex){
 const channels=[1,3,5].map(i=>parseInt(hex.slice(i,i+2),16)/255)
  .map(v=>v<=.04045?v/12.92:Math.pow((v+.055)/1.055,2.4));
 return .2126*channels[0]+.7152*channels[1]+.0722*channels[2];
}
function contrast(a,b){
 assert.match(a,/^#[\da-f]{6}$/i,'Missing/invalid foreground '+a);
 assert.match(b,/^#[\da-f]{6}$/i,'Missing/invalid background '+b);
 const l1=brightness(a),l2=brightness(b);
 return (Math.max(l1,l2)+.05)/(Math.min(l1,l2)+.05);
}
test('all 7 palettes maintain WCAG AA contrast for body, secondary, controls and primary buttons',()=>{
 for(const id of themes){
  const p=palette(id);
  for(const [label,fg,bg] of [
   ['main body',p.text,p.panel],
   ['muted body',p.muted,p.panel],
   ['form values',p.text,p.control],
   ['primary button',p.onaccent,p.accent],
   ['selected navbar',p.onaccent,p.accent],
   ['tab accent on panel',p.accent,p.panel2]
  ])assert.ok(contrast(fg,bg)>=4.5,id+' '+label+' '+contrast(fg,bg).toFixed(2));
 }
});
test('all five distinct Luxe accent text colors meet 4.5:1 on their real card surfaces',()=>{
 for(const id of themes){
  const p=palette(id),lux=accentPalette(id);
  for(const name of ['coral','violet','blue','mint','amber']){
   const ink=lux['luxe-'+name];
   const ratio=contrast(ink,p.panel2);
   assert.ok(ratio>=4.5,id+' '+name+' on panel2 '+ratio.toFixed(2));
  }
 }
});
test('all Studio hero inks and overlines are readable on their actual hero backdrop',()=>{
 for(const id of themes){
  const p=studioPalette(id);
  for(const bg of ['studio-bg','studio-bg-deep']){
   for(const [name,ink] of [
    ['hero headline',p['studio-ink']],
    ['hero explanation',p['studio-ink-muted']],
    ['hero overline',p['studio-pop']]
   ]){
    const ratio=contrast(ink,p[bg]);
    assert.ok(ratio>=4.5,id+' '+name+' on '+bg+' '+ratio.toFixed(2));
   }
  }
 }
});
test('the Studio timer card never falls back to pale theme panel2 under white text',()=>{
 const must=[
  '#fitnessRoot #fitSessionPanel .fit-timerbox .fit-secondarytimer{',
  'background:rgba(255,255,255,.09)!important',
  'color:var(--studio-ink)!important',
  '.fit-timerbox .fit-toolbar button.secondary{',
  '-webkit-text-fill-color:var(--studio-ink)!important',
  '#fitMainClock.low{'
 ];
 for(const part of must)assert.ok(guard.includes(part),part);
 assert.ok(guard.includes('--studio-ink-muted'));
});
test('theme contrast guard fixes meal names, dinner options, modal text and iOS form values without overriding primary pills',()=>{
 for(const part of [
  '#mealQuickPanel button.meal-card .meal-description strong',
  '#mealQuickPanel button.meal-card .meal-description small',
  '#nutritionTop .stat strong',
  '#v21Budget .v21-box strong',
  '#fitnessRoot .fit-card .fit-nametop strong',
  '.luxe-dialog .luxe-feature-list span',
  '#v21MealFilters button.secondary',
  '.luxe-theme-tile .luxe-theme-check',
  'input:not([type="checkbox"]):not([type="radio"])',
  '-webkit-text-fill-color:var(--text)!important',
  'select option{'
 ])assert.ok(guard.includes(part),part);
 assert.ok(!guard.includes('#v21MealFilters button,\n'),'do not override filled selected nutrition pills');
 assert.ok(guard.includes('button:disabled'));
 assert.ok(guard.includes(':focus-visible'));
});
test('new contrast layer loads after Studio and is precached for updated offline use',()=>{
 const studioLink=html.indexOf('<link rel="stylesheet" href="./assets/studio-relaunch.css"/>');
 const guardLink=html.indexOf('<link rel="stylesheet" href="./assets/contrast-guard.css"/>');
 assert.ok(studioLink>0&&guardLink>studioLink);
 assert.ok(sw.includes("'./assets/contrast-guard.css'"));
 assert.match(sw,/formarota-solo-v\d+-shell/);
 for(const id of ['night','ocean','light','sand','neon','volt','sunset'])assert.ok(html.includes('<option value="'+id+'">'));
 assert.ok(html.includes('function collectBackup(){return{version:7'));
 assert.ok(html.includes('const FIT_MOVES=['));
 assert.ok(html.includes('id="globalTodayDate"'));
 const gifs=sw.match(/const GIFS=\[([^\]]+)\]/)?.[1]||'';
 assert.equal((gifs.match(/'/g)||[]).length/2,15);
});

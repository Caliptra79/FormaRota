// FormaRota selected brand identity, iOS dark/light legibility and restrained centering.
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const read=p=>fs.readFileSync(path.join(__dirname,'..',p),'utf8');
const css=read('assets/readability-layout.css'),html=read('index.html'),manifest=JSON.parse(read('manifest.webmanifest')),sw=read('sw.js');
function palette(name){
 const sheets=read('assets/theme-minimal-v26.css')+read('assets/hype-themes-v29.css');
 const re=new RegExp('html\\[data-theme="'+name+'"\\]\\{([^}]+)\\}');
 const match=sheets.match(re);
 assert.ok(match,'Missing original color palette '+name);
 return Object.fromEntries([...match[1].matchAll(/--([a-z0-9-]+):\s*(#[0-9a-f]{6})/gi)].map(x=>[x[1],x[2]]));
}
function luminance(hex){
 const chunks=[1,3,5].map(i=>parseInt(hex.slice(i,i+2),16)/255);
 const linear=chunks.map(v=>v<=0.04045?v/12.92:Math.pow((v+0.055)/1.055,2.4));
 return 0.2126*linear[0]+0.7152*linear[1]+0.0722*linear[2];
}
function contrast(a,b){const x=luminance(a),y=luminance(b);return (Math.max(x,y)+0.05)/(Math.min(x,y)+0.05)}
test('all seven palettes meet WCAG AA normal body and muted text contrast',()=>{
 for(const name of ['night','ocean','light','sand','neon','volt','sunset']){
  const p=palette(name);
  assert.ok(contrast(p.text,p.panel)>=4.5,name+' text');
  assert.ok(contrast(p.muted,p.panel)>=4.5,name+' muted text');
  assert.ok(contrast(p.onaccent,p.accent)>=4.5,name+' primary buttons');
 }
});
test('explicit native iOS color scheme follows selected app theme, not phone-wide preference',()=>{
 for(const name of ['night','ocean','neon','volt','sunset'])assert.ok(css.includes('html[data-theme="'+name+'"]'));
 assert.ok(css.includes('color-scheme:dark'));
 assert.ok(css.includes('color-scheme:light'));
 assert.doesNotMatch(css,/@media\s*\(prefers-color-scheme/);
 assert.ok(css.includes('select option{background:var(--control);color:var(--text)}'));
 assert.ok(css.includes('::-webkit-datetime-edit'));
 assert.ok(css.includes('-webkit-text-fill-color:var(--text)'));
});
test('nav, secondary and history edit controls use correct dark or accent label colors',()=>{
 for(const needle of [
  'html[data-theme] .mobile-tabbar button.active{color:var(--accent)!important}',
  'html[data-theme] .context-links button.active,',
  'html[data-theme] .appnav .navbtn.active{color:var(--onaccent)!important}',
  'html[data-theme] button.secondary:not(.active)',
  'html[data-theme] .fit-card .fit-set.done button{color:var(--accent)!important}'
 ])assert.ok(css.includes(needle),needle);
});
test('layout centers summaries without globally centering long-form text, forms or exercise inputs',()=>{
 for(const needle of [
  'main>.route-heading{text-align:center',
  '#homePanel .home-stats .home-stat,',
  '#nutritionTop .stats>.stat,',
  '#homePanel .home-intro>div{text-align:center',
  '#mealQuickPanel>h2,#v21Recents>h2',
  '#v21TimerClock,.fit-timerbox .fit-clock{text-align:center}'
 ])assert.ok(css.includes(needle),needle);
 assert.doesNotMatch(css,/(?:^|\n)\s*(?:body|main|\.panel|p|label|input|textarea)\s*\{[^}]*text-align:center/m);
 assert.match(css,/@media\(max-width:520px\)/);
});
test('app and home screen branding say FormaRota, while installation identity is unchanged',()=>{
 assert.equal(manifest.name,'FormaRota');
 assert.equal(manifest.short_name,'FormaRota');
 assert.equal(manifest.id,'./index.html');
 assert.equal(manifest.start_url,'./index.html#/anasayfa');
 assert.match(html,/<title>FormaRota \| Ana Sayfa<\/title>/);
 assert.ok(html.includes('name="apple-mobile-web-app-title" content="FormaRota"'));
 assert.ok(html.includes('src="./assets/formarota-icon.svg"'));
 assert.ok(html.includes('<h1>FormaRota</h1>'));
 assert.doesNotMatch(html,/name=["']application-version["']/);
});
test('PWA and iOS PNG icons exist at the required sizes',()=>{
 for(const [file,size] of [['icon-192.png',192],['icon-512.png',512],['apple-touch-icon.png',180]]){
  const bytes=fs.readFileSync(path.join(__dirname,'..',file));
  assert.equal(bytes.slice(0,8).toString('hex'),'89504e470d0a1a0a',file);
  assert.equal(bytes.readUInt32BE(16),size,file+' width');
  assert.equal(bytes.readUInt32BE(20),size,file+' height');
  assert.ok(bytes.length>2000,file+' nonempty');
 }
 const vector=read('assets/formarota-icon.svg');
 assert.ok(vector.includes('FormaRota'));
 assert.ok(vector.includes('<circle'));
 assert.ok(vector.includes('stroke="url(#route)"'));
});
test('offline shell includes new brand icons and contrast stylesheet without removing workout assets',()=>{
 for(const src of ['./assets/formarota-icon.svg','./assets/readability-layout.css','./icon-192.png','./icon-512.png','./apple-touch-icon.png']){
  assert.ok(sw.includes("'"+src+"'"),src);
 }
 const gifs=sw.match(/const GIFS=\[([^\]]+)\]/)?.[1]||'';
 assert.equal((gifs.match(/'/g)||[]).length/2,15);
 assert.ok(html.includes('coach-engine-v35.js'));
 assert.ok(html.includes('FormaRotaTurkishFoods||[]'));
});

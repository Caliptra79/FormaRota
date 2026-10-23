const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const read=p=>fs.readFileSync(path.join(__dirname,'..',p),'utf8');
const html=read('index.html'),css=read('assets/final-motion.css'),sw=read('sw.js');
test('final motion tokens are theme-based and consistently short',()=>{
 for(const v of ['--motion-fast:140ms','--motion-base:210ms','--motion-slow:340ms','--motion-progress:580ms','--motion-glow:color-mix(in srgb,var(--accent)'])assert.ok(css.includes(v),v);
 for(const t of ['neon','volt'])assert.ok(css.includes('html[data-theme="'+t+'"]'));
 assert.ok(css.includes('--motion-glow:color-mix(in srgb,var(--accent) 14%,transparent)'));
});
test('page and set feedback never loop or animate on initial static render',()=>{
 assert.ok(html.includes('motionViewChanged&&window.matchMedia'));
 assert.ok(html.includes("row?.classList.add('fr-set-confirm')"));
 assert.ok(css.includes('main>section.fr-motion-enter:not(.hidden)'));
 assert.ok(css.includes('.fit-set.fr-set-confirm'));
 assert.doesNotMatch(css,/animation:\s*[^;]*infinite/);
});
test('reduce motion disables animation and transition for iPhone accessibility',()=>{
 assert.ok(css.includes('@media(prefers-reduced-motion:reduce)'));
 assert.ok(css.includes('animation-duration:.01ms!important'));
 assert.ok(css.includes('transition-duration:.01ms!important'));
 assert.ok(css.includes('scroll-behavior:auto!important'));
});
test('native details, nav, progress and tap feedback have appropriate restrained motion',()=>{
 for(const x of ['details.app-information[open]','details.fr-record-move[open]','.progress span,.bartrack span,.fit-progress span','.mobile-tabbar button.active','button:not(:disabled):active{transform:scale(.985)}'])assert.ok(css.includes(x),x);
 assert.ok(css.includes('@media(hover:hover) and (pointer:fine)'));
});
test('no theme, GIF or backup format was removed for final release',()=>{
 for(const theme of ['night','ocean','light','sand','neon','volt','sunset'])assert.ok(html.includes('value="'+theme+'"'));
 assert.ok(html.includes('function collectBackup(){return{version:7'));
 assert.ok(html.includes('const FIT_MOVES=['));
 assert.ok(html.includes('formarota-icon.svg'));
 assert.ok(sw.includes("'./assets/final-motion.css'"));
 const gifs=sw.match(/const GIFS=\[([^\]]+)\]/)?.[1]||'';
 assert.equal((gifs.match(/'/g)||[]).length/2,15);
});
test('all scripts remain syntactically valid',()=>{for(const x of html.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/g))assert.doesNotThrow(()=>new vm.Script(x[1]))});

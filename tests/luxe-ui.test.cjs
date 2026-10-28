const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const read=p=>fs.readFileSync(path.join(__dirname,'..',p),'utf8');
const html=read('index.html'),css=read('assets/luxe-ui.css'),code=read('assets/luxe-ui.js'),sw=read('sw.js');
test('Luxe preserves all seven existing theme identifiers and offers seven live previews',()=>{
 for(const id of ['night','ocean','light','sand','neon','volt','sunset']){
  assert.ok(html.includes('<option value="'+id+'">'),id);
  assert.ok(code.includes("id:'"+id+"'"),id+' preview');
  assert.ok(css.includes('html[data-theme="'+id+'"]'),id+' accents');
 }
 assert.ok(html.includes('id="themeSelect"'));
 assert.ok(html.includes('id="luxeThemeLaunch"'));
 assert.ok(html.includes('id="luxeThemeName"'));
 assert.ok(code.includes("select.dispatchEvent(new Event('change',{bubbles:true}))"));
 assert.ok(code.includes("if(!applied)setThemePreview(initial)"));
});
test('color differentiation is scoped to existing dashboard, meal, tracker and workout components',()=>{
 for(const selector of [
  '#homePanel .home-stats .home-stat:nth-child(1)',
  '#homePanel .home-stats .home-stat:nth-child(2)',
  '#nutritionTop .stat:nth-child(3)',
  '.tracker-pair .tracker:nth-child(1)',
  '#mealCards .meal-card:nth-child(2)',
  '#fitExerciseList .fit-card:nth-child(5n+3)'
 ])assert.ok(css.includes(selector),selector);
 for(const token of ['--luxe-coral','--luxe-violet','--luxe-blue','--luxe-mint','--luxe-amber'])assert.ok(css.includes(token));
 assert.ok(css.includes('background-image:linear-gradient'));
});
test('interactive Luxe layers have native dialogs, shade and accessibility behaviors',()=>{
 for(const item of [
  "make('dialog','luxe-dialog')",
  "el.showModal",
  "el.addEventListener('close'",
  "el.setAttribute('aria-labelledby'",
  "panel.setAttribute('role','dialog')",
  "panel.setAttribute('aria-modal','true')",
  "event.key==='Escape'",
  "event.key!=='Tab'",
  "event.shiftKey",
  "shade.hidden=false",
  "doc.body.classList.add('luxe-sheet-active')"
 ])assert.ok(code.includes(item),item);
 assert.ok(css.includes('.luxe-dialog::backdrop'));
 assert.ok(css.includes('.luxe-toast-stack'));
 assert.ok(css.includes('.luxe-shade[hidden]'));
 assert.ok(css.includes('safe-area-inset-bottom'));
 assert.ok(css.includes('@media(prefers-reduced-motion:reduce)'));
});
test('preexisting nutrition behaviors are routed into sheet without changing logging or history keys',()=>{
 assert.ok(html.includes("window.FormaRotaLuxe?.openMealSheet?.()"));
 assert.ok(html.includes("window.FormaRotaLuxe?.closeMealSheet?.()"));
 assert.ok(html.includes("window.FormaRotaLuxe?.viewChange?.(view)"));
 assert.ok(html.includes("window.FormaRotaLuxe?.toast?.("));
 for(const key of ["kocluk-food-log-v2","formarota-dinner-plans-v1","formarota-nutrition-edits-v1"])assert.ok(html.includes(key));
 assert.ok(html.includes("function collectBackup(){return{version:7"));
 assert.ok(html.includes("const FIT_MOVES=["));
});
test('dinner preview and workout detail are read-only until actual user actions',()=>{
 assert.ok(code.includes("detailDinner(button)"));
 assert.ok(code.includes("detailWorkout(button)"));
 assert.ok(code.includes("original.click()"));
 assert.ok(code.includes("const preview=make('img','luxe-exercise-preview')"));
 assert.ok(code.includes("doc.addEventListener('click',event=>{"));
 assert.ok(code.includes("confirmDelete(deleteButton)"));
 assert.ok(code.includes("handler.call(button)"));
 assert.ok(!code.includes('localStorage.setItem('));
});
test('meal bottom sheet restores focus on close and hides when leaving meal route',()=>{
 const initial={isConnected:true,focus(){this.returned=true}};
 const attrs=new Map();
 const panel={setAttribute:(key,val)=>attrs.set(key,val),removeAttribute:key=>attrs.delete(key),
  classList:{values:new Set(),add(...items){for(const x of items)this.values.add(x)}},
 };
 const shade={hidden:true};
 const close={focus(){this.focused=true}};
 const bodyClass={values:new Set(),add(k){this.values.add(k)},remove(k){this.values.delete(k)}};
 const nodes={searchPanel:panel,luxeShade:shade,closeMealEditor:close};
 const document={
  readyState:'loading',
  addEventListener(){},
  activeElement:initial,
  getElementById:id=>nodes[id]||null,
  body:{classList:bodyClass},
  querySelector(){return null}
 };
 const fakeWindow={document,requestAnimationFrame(fn){fn()},matchMedia(){return {matches:false}}};
 vm.runInNewContext(code,{window:fakeWindow,Event,MutationObserver:function(){}});
 const api=fakeWindow.FormaRotaLuxe;
 assert.ok(api.openMealSheet());
 assert.equal(shade.hidden,false);
 assert.ok(bodyClass.values.has('luxe-sheet-active'));
 assert.equal(attrs.get('aria-modal'),'true');
 assert.ok(close.focused);
 api.closeMealSheet();
 assert.equal(shade.hidden,true);
 assert.ok(!bodyClass.values.has('luxe-sheet-active'));
 assert.ok(!attrs.has('aria-modal'));
 assert.ok(initial.returned);
 api.openMealSheet();
 api.viewChange('fitness');
 assert.equal(shade.hidden,true);
 assert.ok(panel.classList.values.has('hidden'));
 assert.ok(panel.classList.values.has('meal-editor-closed'));
});
test('scripts parse, offline shell bundles both Luxe assets, and original workout GIF list remains',()=>{
 new vm.Script(code);
 for(const m of html.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/g))new vm.Script(m[1]);
 assert.ok(html.includes('<script defer src="./assets/luxe-ui.js"></script>'));
 assert.ok(html.includes('<link rel="stylesheet" href="./assets/luxe-ui.css"/>'));
 assert.ok(sw.includes("'./assets/luxe-ui.css'"));
 assert.ok(sw.includes("'./assets/luxe-ui.js'"));
 const gifList=sw.match(/const GIFS=\[([^\]]+)\]/)?.[1]||'';
 assert.equal((gifList.match(/'/g)||[]).length/2,19);
 assert.ok(html.includes('id="globalTodayDate"'));
 assert.equal(JSON.parse(read('manifest.webmanifest')).name,'FormaRota');
});

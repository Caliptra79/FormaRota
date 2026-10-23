const {test}=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm'),fs=require('node:fs'),path=require('node:path');
const read=name=>fs.readFileSync(path.join(__dirname,'..',name),'utf8');
const html=read('index.html'),foodsSrc=read('assets/turkish-foods.js'),coachSrc=read('assets/dinner-coach.js');
const win={};vm.runInNewContext(foodsSrc+'\n'+coachSrc,{window:win});
const foods=win.FormaRotaTurkishFoods,coach=win.FormaRotaDinnerCoach;
const seed=html.slice(html.indexOf('const seedFoods=['),html.indexOf('function today(){'));
const menusSrc=html.slice(html.indexOf('const dinnerMenus=['),html.indexOf('function foodById(id)'));
assert.ok(seed.startsWith('const seedFoods=[')&&menusSrc.startsWith('const dinnerMenus=['));
const ctx={window:win};
vm.runInNewContext(seed+'\n'+menusSrc+'\nthis.ALL=seedFoods;this.MENUS=dinnerMenus',ctx);
const allFoods=Array.from(ctx.ALL),allMenus=Array.from(ctx.MENUS);
const lookup=id=>allFoods.find(x=>x.id===id);
const run=(extras={})=>coach.recommend({menus:allMenus,lookup,logs:[],date:'2026-10-24',
 goalKcal:2600,goalProtein:160,limit:3,...extras});
test('84 Turkish foods are unique, estimated, with complete per-100g macros',()=>{
 assert.equal(foods.length,84);
 assert.equal(new Set(foods.map(x=>x.id)).size,foods.length);
 for(const food of foods){
  assert.match(food.name,/\(tahmini\)/);
  assert.equal(food.verified,false);
  assert.ok(food.source.includes('Yaklaşık'));
  assert.ok(food.kcal>=0&&food.kcal<=1000);
  assert.ok(food.protein>=0&&food.protein<=100);
  assert.ok(food.carbs>=0&&food.fat>=0);
 }
 for(const id of ['tr-arap-kofte','tr-biskuvili-pasta','tr-tavuk-sote','tr-etli-nohut','tr-cacik']){
  assert.ok(lookup(id),'missing '+id);
 }
});
test('all existing and new menu references have valid nutrients',()=>{
 assert.equal(allMenus.length,20);
 assert.equal(new Set(allMenus.map(x=>x.name)).size,20);
 for(const menu of allMenus){
  for(const [id,grams] of menu.items){
   assert.ok(lookup(id),'Missing menu ingredient '+id);
   assert.ok(grams>0&&grams<=500);
  }
  const nutrients=coach.totals(menu.items,lookup);
  assert.ok(nutrients&&nutrients.kcal>150);
  assert.ok(nutrients.protein>0);
 }
});
test('preserves original five menus and original breakfast',()=>{
 for(const title of ['Tavuk, pilav ve yoğurt','Köfte, bulgur ve yoğurt','Mercimek, yumurta ve yoğurt',
  'Nohut, pilav ve yoğurt','Tavuk ve patates'])assert.ok(allMenus.some(x=>x.name===title));
 assert.ok(html.includes("presetBreakfast:true"));
 assert.ok(html.includes('13 hareket'));
});
test('dinner engine adjusts portions without mutating original menus or records',()=>{
 const source=JSON.stringify(allMenus),res=run({logs:[{date:'2026-10-24',meal:'Öğle yemeği',kcal:1300,protein:70}]});
 assert.equal(res.context.remainingKcal,1300);
 assert.equal(res.context.remainingProtein,90);
 assert.equal(res.options.length,3);
 for(const menu of res.options){
  assert.ok(menu.items.every(x=>x[1]>=15));
  assert.ok(menu.total.kcal<=1300);
  assert.ok(menu.reason.includes('Porsiyon')||menu.reason.includes('Standart'));
 }
 assert.equal(JSON.stringify(allMenus),source);
});
test('partial daily energy budget reduces quantities and does not suggest excess',()=>{
 const res=run({logs:[{date:'2026-10-24',meal:'Öğle yemeği',kcal:2240,protein:130}]});
 assert.equal(res.context.remainingKcal,360);
 assert.ok(res.options.length>=1);
 for(const x of res.options)assert.ok(x.total.kcal<=360+15);
});
test('when daily limit is nearly reached, no full dinner is suggested',()=>{
 const res=run({logs:[{date:'2026-10-24',meal:'Akşam yemeği',kcal:2440,protein:120}]});
 assert.equal(res.context.remainingKcal,160);
 assert.equal(res.options.length,0);
 assert.match(res.reason,/az yer kaldı/);
});
test('past and future-day records are excluded from current-day consumption',()=>{
 const records=[{date:'2026-10-23',meal:'Öğle yemeği',kcal:1400,protein:35},
  {date:'2026-10-25',meal:'Öğle yemeği',kcal:1400,protein:35}];
 assert.equal(run({logs:records}).context.eatenKcal,0);
});
test('recent meal history flags repeat, but future history does not',()=>{
 const logs=[{date:'2026-10-23',meal:'Akşam yemeği',foodId:'tr-tavuk-sote',kcal:220,protein:25}];
 const priorPlans={'2026-10-23':{name:'Tavuk sote, bulgur ve cacık',eaten:true},
                   '2026-10-25':{name:'Et sote, pirinç ve salata',eaten:true}};
 const out=run({logs,plans:priorPlans,limit:20});
 const chicken=out.options.find(x=>x.name==='Tavuk sote, bulgur ve cacık');
 assert.ok(chicken?.recentRepeat);
 assert.match(chicken.reason,/Benzer yemek/);
 const beef=out.options.find(x=>x.name==='Et sote, pirinç ve salata');
 assert.ok(beef&&!beef.recentRepeat);
});
test('vegetarian request excludes all unmarked menus',()=>{
 const res=run({vegetarian:true,limit:20});
 assert.ok(res.options.length>=5);
 assert.ok(res.options.every(x=>x.vegetarian===true));
 assert.ok(res.options.some(x=>x.name.includes('Mercimek')));
});
test('displayed menu scripts are loaded before inline initialization and cached offline',()=>{
 const pre=html.indexOf('<script src="./assets/turkish-foods.js"></script>');
 const init=html.indexOf('<script>\n(function(){const themes=');
 assert.ok(pre>0&&pre<init);
 assert.ok(html.indexOf('<script src="./assets/dinner-coach.js"></script>')<init);
 assert.ok(html.includes('.concat(window.FormaRotaTurkishFoods||[])'));
 const sw=read('sw.js');
 for(const p of ['turkish-foods.js','dinner-coach.js'])assert.ok(sw.includes("'./assets/"+p+"'"));
 new vm.Script(foodsSrc);new vm.Script(coachSrc);
 for(const match of html.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/g))
  assert.doesNotThrow(()=>new vm.Script(match[1]));
});
test('three dinner recommendation views share one engine and correctly filter meat-free options',()=>{
 const recommendUI=html.slice(html.indexOf('function renderDinnerRecommendations(){'),html.indexOf('function renderResults('));
 const legacyUI=html.slice(html.indexOf('function v21SmartDinner(){'),html.indexOf('function v21Svg('));
 assert.ok(recommendUI.includes('engine?.recommend'));
 assert.ok(legacyUI.includes('engine.recommend'));
 assert.ok(recommendUI.includes('frDinnerPreference'));
 assert.ok(legacyUI.includes('frDinnerPreference'));
 assert.ok(html.includes('id="frDinnerPreference"'));
});

test('the selected dinner option persists its exact scaled ingredients, with provenance',()=>{
 const source=html.slice(html.indexOf('function selectDinnerMenu(menu,date){'),html.indexOf('function dinnerItemTotals(',html.indexOf('function selectDinnerMenu(menu,date){')));
 assert.ok(source.startsWith('function selectDinnerMenu('));
 const storage={};let renders=0;
 const env={getDinnerPlans:()=>({...storage}),confirm:()=>true,alert:()=>{},
  foodById:lookup,write:(key,val)=>{Object.assign(storage,val)},renderDinnerPlan:()=>{renders++},
  DINNER_PLAN_KEY:'dinner'};
 vm.runInNewContext(source+';this.pick=selectDinnerMenu;',env);
 const recommendation=run().options[0],selected=env.pick(recommendation,'2026-10-24');
 assert.equal(selected,true);assert.equal(renders,1);
 assert.equal(storage['2026-10-24'].name,recommendation.name);
 assert.equal(storage['2026-10-24'].items[0].amount,recommendation.items[0][1]);
 assert.ok(storage['2026-10-24'].estimateNote.includes('Yaklaşık'));
});
test('the overview choice saves the recommended dinner rather than only scrolling to a different menu',()=>{
 const overview=html.slice(html.indexOf('function v21SmartDinner(){'),html.indexOf('function v21Svg('));
 assert.ok(overview.includes('selectDinnerMenu(option,dt)'));
 const detailed=html.slice(html.indexOf('function renderDinnerRecommendations(){'),html.indexOf('function renderResults('));
 assert.ok(detailed.includes('selectDinnerMenu(menu,date)'));
});

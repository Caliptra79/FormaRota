'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs'),path=require('node:path');
const src=p=>fs.readFileSync(path.join(__dirname,'..',p),'utf8'),html=src('index.html');
function slice(a,b){const i=html.indexOf(a),j=html.indexOf(b,i+a.length);assert.ok(i>=0&&j>i,a);return html.slice(i,j)}
function units(){const context={window:{}};vm.runInNewContext(src('assets/food-units.js'),context);return context.window.FormaRotaFoodUnits;}
test('liquids are measured in ml, solids and legacy log records in g',()=>{
 const u=units();
 for(const food of [{id:'tr-ayran',name:'Ayran (tahmini)'},{id:'milk',name:'Süt, tam yağlı'},
  {name:'Kefir'},{name:'Maden suyu'},{name:'Kola'},{name:'Meyve suyu'},
  {name:'Iced tea'},{name:'Şalgam'}])assert.equal(u.unit(food),'ml',food.name);
 for(const food of [{name:'Mercimek çorbası'},{name:'Su böreği'},{name:'Sütlaç'},
  {name:'Yoğurt'},{name:'Peynir'},{name:'Tavuk göğsü'},{name:'Zeytinyağı'}])
  assert.equal(u.unit(food),'g',food.name);
 assert.equal(u.unit({name:'Ayran',unit:'g'}),'g','custom override');
 assert.equal(u.loggedUnit({name:'Ayran',amount:200}),'g','historic records stay grams');
 assert.equal(u.loggedUnit({name:'Ayran',amount:200,unit:'ml'}),'ml');
});
test('a legacy per-100g ayran value is marked approximate, certified 100ml label is not',()=>{
 const u=units();
 assert.equal(u.basis({id:'tr-ayran',name:'Ayran'}).approximate,true);
 assert.equal(u.basis({id:'tr-ayran',name:'Ayran'}).text,'100 g (≈ 100 ml)');
 assert.equal(u.basis({name:'Ayran',nutritionBasis:'100ml'}).approximate,false);
 assert.equal(u.basis({name:'Pirinç pilavı'}).text,'100 g');
});
test('Open Food Facts drink uses true per-100ml label when available and validates macros',()=>{
 const context={window:{FormaRotaFoodUnits:units()}};
 vm.runInNewContext(slice('function nutritionMacrosValid(f){','async function search(){')+';this.parse=offProductToFood;',context);
 const drink={code:'test',product_name:'Ayran',nutriments:{
  'energy-kcal_100g':48,'proteins_100g':2.1,'carbohydrates_100g':3,
  'energy-kcal_100ml':45,'proteins_100ml':2,'carbohydrates_100ml':2.5}};
 const value=context.parse(drink);assert.equal(value.unit,'ml');
 assert.equal(value.nutritionBasis,'100ml');assert.equal(value.kcal,45);
 assert.equal(value.protein,2);assert.equal(value.carbs,2.5);
 const noMl=context.parse({product_name:'Ayran',nutriments:{'energy-kcal_100g':38,'proteins_100g':2.1}});
 assert.equal(noMl.unit,'ml');assert.equal(noMl.nutritionBasis,'100g');
 assert.equal(context.parse({product_name:'Ayran',nutriments:{'proteins_100g':2}}),null);
 const solid=context.parse({product_name:'Tavuk',nutriments:{'energy-kcal_100g':165,'proteins_100g':31}});
 assert.equal(solid.unit,'g');assert.equal(solid.kcal,165);
});
test('per-result logging saves ml on drinks and g on foods, without changing calories',()=>{
 const rows=[],nodes={amount:{value:'125'},date:{value:'2026-10-29'},meal:{value:'Öğle yemeği'},status:{textContent:''}};
 const context={window:{FormaRotaFoodUnits:units()},$:k=>nodes[k],nutritionMacrosValid:f=>f.kcal!=null&&f.protein!=null,
  getLogs:()=>rows.slice(),write:(_,value)=>{rows.splice(0,rows.length,...value)},logKey:'logs',fmt:String,
  crypto:{randomUUID:()=>String(rows.length+1)},renderTotals:()=>{}};
 vm.runInNewContext(slice('function addFood(food,chosenAmount){','async function barcodeSearch(){')+';this.add=addFood;',context);
 context.add({id:'tr-ayran',name:'Ayran',kcal:38,protein:2.1,carbs:2.7,fat:1.9},200);
 assert.equal(rows.length,1);assert.equal(rows[0].amount,200);
 assert.equal(rows[0].unit,'ml');assert.equal(rows[0].kcal,76);
 assert.equal(rows[0].protein,4.2);assert.equal(rows[0].approximateVolume,true);
 assert.match(nodes.status.textContent,/yaklaşık/);
 context.add({id:'rice',name:'Pilav',kcal:150,protein:3},180);
 assert.equal(rows[1].unit,'g');assert.equal(rows[1].kcal,270);
 context.add({id:'drink',name:'Ayran',nutritionBasis:'100ml',kcal:40,protein:2},250);
 assert.equal(rows[2].unit,'ml');assert.equal(rows[2].kcal,100);
 assert.equal(rows[2].approximateVolume,false);
});
test('search and barcode result each have their own editable 200 ml or 180 g input',()=>{
 const script=slice("function renderResults(items,root=$('results')){","function localSearch(q){");
 const u=units();const records=[];const fake=tag=>{
  const obj={tag,children:[],attrs:{},style:{},append(...c){this.children.push(...c)},
   setAttribute(k,v){this.attrs[k]=v},textContent:'',value:'',disabled:false,onclick:null};
  return obj;
 };
 const host={innerHTML:'',append(el){records.push(el)}};
 const added=[];const context={window:{FormaRotaFoodUnits:u},document:{createElement:fake},
  $:()=>host,fmt:String,nutritionMacrosValid:()=>true,addFood:(food,amount)=>added.push([food.name,amount])};
 vm.runInNewContext(script+';this.render=renderResults;',context);
 context.render([{id:'tr-ayran',name:'Ayran',kcal:38,protein:2.1},
  {id:'rice',name:'Pilav',kcal:150,protein:3}],host);
 assert.equal(records.length,2);
 const drinkControl=records[0].children[1],solidControl=records[1].children[1];
 assert.match(drinkControl.children[0].textContent,/ml/);
 assert.equal(drinkControl.children[0].children[0].value,'200');
 assert.match(solidControl.children[0].textContent,/g/);
 assert.equal(solidControl.children[0].children[0].value,'180');
 drinkControl.children[0].children[0].value='250';
 drinkControl.children[1].onclick();
 assert.deepEqual(added,[['Ayran','250']]);
});
test('editing and recent cards use logged unit and preserve historic unmarked grams',()=>{
 assert.ok(html.includes("const unit=original.unit==='ml'?'ml':'g'"));
 assert.ok(html.includes("item.unit==='ml'?'ml':'g'"));
 assert.ok(src('assets/oled-home.js').includes("x.unit==='ml'?'ml':'g'"));
 assert.ok(html.includes("unit:$('customUnit').value==='ml'?'ml':'g'"));
 assert.ok(html.includes('id="customUnit"'));
});
test('new module and styles are in the offline cache while the 10 themes and GIFs remain',()=>{
 const sw=src('sw.js'),css=src('assets/food-units.css');
 for(const asset of ['food-units.js','food-units.css']){
  assert.ok(sw.includes("'./assets/"+asset+"'"));
  assert.ok(html.includes('./assets/'+asset));
 }
 assert.ok(css.includes('food-result-controls'));assert.ok(css.includes('font-size:16px'));
 assert.match(sw,/const CACHE='formarota-solo-v\d+-shell'/);
 assert.equal(fs.readdirSync(path.join(__dirname,'../assets')).filter(f=>f.endsWith('.gif')).length,19);
 assert.ok(html.includes('function collectBackup(){return{version:7'));
});

test('suggested dinner menus mark ayran as ml and solids as g, with no change in nutrient bases',()=>{
 const original=slice('function selectDinnerMenu(menu,date){','function dinnerItemTotals(');
 const saved={};const u=units(),foods={
  'tr-ayran':{id:'tr-ayran',name:'Ayran',kcal:38,protein:2.1,carbs:2.7,fat:1.9},
  bulgur:{id:'bulgur',name:'Bulgur',kcal:120,protein:3.5,carbs:23,fat:1.5}};
 const ctx={window:{FormaRotaFoodUnits:u},getDinnerPlans:()=>saved,
  write:(key,val)=>Object.assign(saved,val),foodById:id=>foods[id],
  DINNER_PLAN_KEY:'dinner',renderDinnerPlan:()=>{},confirm:()=>true,alert:()=>{}};
 vm.runInNewContext(original+';this.pick=selectDinnerMenu;',ctx);
 assert.equal(ctx.pick({name:'Bulgur ve ayran',items:[['bulgur',150],['tr-ayran',200]]},'2026-10-29'),true);
 const items=saved['2026-10-29'].items;
 assert.equal(items[0].unit,'g');assert.equal(items[1].unit,'ml');
 assert.equal(items[1].amount,200);assert.equal(items[1].baseKcal,38);
 assert.equal(items[1].nutritionBasis,'100g');
});
test('recipe ingredients use per-item unit, while finished recipe output remains per 100 g',()=>{
 assert.ok(html.includes('id="recipeIngredientAmountLabel"'));
 assert.ok(html.includes("function updateRecipeUnitLabel(){"));
 assert.ok(html.includes("recipeItems.push({foodId:food.id,name:food.name,amount,unit:"));
 assert.ok(html.includes("it.unit==='ml'?'ml':'g'"));
 assert.ok(html.includes("const per100=weight>0"));
});

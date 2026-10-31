'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),
path=require('node:path'),vm=require('node:vm');
const get=p=>fs.readFileSync(path.join(__dirname,'..',p),'utf8');
const html=get('index.html'),sw=get('sw.js');
const js=(code,ctx)=>vm.runInNewContext(code,ctx);
function env(){
 const window={};
 js(get('assets/drink-sugar.js'),{window});
 js(get('assets/food-variety.js'),{window});
 return window;
}
const all=env(),foods=Array.from(all.FormaRotaVarietyFoods);
const find=id=>foods.find(x=>x.id===id);
const tea=find('variety-drink-siyah-cay');

test('expanded offline catalog has 144 unique entries, complete macros, explicit units and source warnings',()=>{
 assert.equal(foods.length,144);
 assert.equal(new Set(foods.map(x=>x.id)).size,144);
 const categories=new Set(foods.map(x=>x.category));
 for(const cat of ['İçecek','Et','Balık','Meyve','Sebze','Kuruyemiş','Hazır yemek','Süt ürünü','Kahvaltı','Atıştırmalık'])
  assert.ok(categories.has(cat),cat);
 for(const f of foods){
  assert.ok(f.name&&f.name.length>2);
  for(const k of ['kcal','protein','carbs','fat'])assert.ok(Number.isFinite(f[k])&&f[k]>=0&&f[k]<=1000,f.id+' '+k);
  assert.equal(f.nutritionBasis,f.unit==='ml'?'100ml':'100g',f.id);
  assert.equal(f.verified,false);
  assert.match(f.source,/yaklaşık/);
 }
});
test('only explicit unsweetened local tea and black coffee offer optional added sugar',()=>{
 const x=all.FormaRotaDrinkSugar;
 assert.equal(x.eligible(tea),true);
 assert.equal(x.eligible(find('variety-drink-turk-kahve')),true);
 assert.equal(x.eligible(find('variety-drink-filtre-kahve')),true);
 for(const id of ['variety-drink-latte','variety-drink-limonata','variety-drink-kefir','variety-drink-sutlu-kahve'])
  assert.equal(x.eligible(find(id)),false,id);
 assert.equal(x.eligible({id:'off-1234',name:'Çay',unit:'ml',nutritionBasis:'100ml',sugarEligible:true}),false);
 assert.equal(x.eligible({id:'custom',name:'Çay',unit:'ml',nutritionBasis:'100ml'}),false);
});
test('one sugar cube is approximately four grams and sixteen kcal; zero is default',()=>{
 const x=all.FormaRotaDrinkSugar;
 assert.equal(x.compute(tea,200,0).kcal,2);
 assert.equal(x.compute(tea,200,1).kcal,18);
 assert.equal(x.compute(tea,200,2).kcal,34);
 assert.equal(x.compute(tea,200,2).carbs,8);
 assert.equal(x.compute(tea,200,2).sugarGrams,8);
 assert.equal(x.compute(find('variety-drink-latte'),200,2),null);
 for(const bad of [-1,7,2.4,'garip'])assert.equal(x.extras(bad),null);
});
test('editing drink volume preserves fixed sugar, and editing sugar only recalculates additions',()=>{
 const x=all.FormaRotaDrinkSugar;
 const old={amount:200,unit:'ml',kcal:34,protein:0,carbs:8,fat:0,sugarCubes:2};
 const newVolume=x.recalculate(old,300,2);
 assert.equal(newVolume.kcal,35);
 assert.equal(newVolume.carbs,8);
 assert.equal(newVolume.sugarCubes,2);
 const newSugar=x.recalculate(old,200,1);
 assert.equal(newSugar.kcal,18);
 assert.equal(newSugar.carbs,4);
 assert.equal(newSugar.sugarCubes,1);
 assert.equal(x.recalculate(old,300,7),null);
});
test('existing meal logger records sugar as part of one drink and preserves base macros for backup',()=>{
 const rows=[],nodes={date:{value:'2026-10-30'},meal:{value:'Ara öğün'},status:{textContent:''},amount:{value:'200'}};
 let draws=0;
 const slice=html.slice(html.indexOf('function addFood(food,chosenAmount){'),html.indexOf('async function barcodeSearch(){'));
 const context={window:{FormaRotaDrinkSugar:all.FormaRotaDrinkSugar,FormaRotaFoodUnits:{unit:f=>f.unit}},
 $:id=>nodes[id],nutritionMacrosValid:f=>f.kcal!=null&&f.protein!=null,
 getLogs:()=>rows.slice(),write:(_,next)=>{rows.splice(0,rows.length,...next)},
 logKey:'logs',crypto:{randomUUID:()=>String(rows.length+1)},fmt:String,
 renderTotals:()=>{draws++}};
 js(slice+';this.save=addFood;',context);
 context.save(tea,200,{sugarCubes:2});
 assert.equal(rows.length,1);
 assert.equal(rows[0].kcal,34);
 assert.equal(rows[0].carbs,8);
 assert.equal(rows[0].unit,'ml');
 assert.equal(rows[0].sugarCubes,2);
 assert.equal(rows[0].sugarGrams,8);
 assert.equal(rows[0].baseKcal,tea.kcal);
 assert.match(rows[0].name,/2 küp şeker/);
 context.save(tea,200,{sugarCubes:0});
 assert.equal(rows.length,2);
 assert.equal(rows[1].kcal,2);
 assert.match(rows[1].name,/şekersiz/);
 context.save(find('variety-drink-latte'),200,{sugarCubes:2});
 assert.equal(rows.length,2,'no sugar added to already sweetened or packaged drinks');
 context.save(find('variety-drink-latte'),200);
 assert.equal(rows[2].kcal,90);
 assert.equal(rows[2].sugarCubes,undefined);
 assert.equal(draws,3);
});
test('UI renders an accessible sugar choice only on unsweetened drinks',()=>{
 const slice=html.slice(html.indexOf("function renderResults(items,root=$('results')){"),html.indexOf('function localSearch(q){'));
 const make=tag=>({
  tag,children:[],className:'',style:{},attrs:{},value:'',textContent:'',disabled:false,
  append(...xs){this.children.push(...xs)},
  setAttribute(k,v){this.attrs[k]=v}
 });
 const added=[],results=[];
 const host={innerHTML:'',append:x=>results.push(x)};
 const ctx={window:{FormaRotaDrinkSugar:all.FormaRotaDrinkSugar,FormaRotaFoodUnits:{unit:f=>f.unit,basis:f=>({text:'100 '+f.unit,approximate:false})}},
  document:{createElement:make},$:()=>host,fmt:String,nutritionMacrosValid:()=>true,
  getCustom:()=>[],addFood:(...args)=>added.push(args)};
 js(slice+';this.render=renderResults;',ctx);
 ctx.render([tea,find('variety-drink-latte')],host);
 assert.equal(results.length,2);
 const controls=results[0].children[1];
 assert.match(controls.className,/with-drink-sugar/);
 const sugarLabel=controls.children.find(x=>x.className==='food-sugar-label');
 assert.ok(sugarLabel,'tea has sugar selector');
 assert.equal(sugarLabel.children[0].tag,'select');
 assert.equal(sugarLabel.children[0].children.length,7);
 sugarLabel.children[0].value='2';
 controls.children.find(x=>x.textContent==='Ekle').onclick();
 assert.equal(added[0][2].sugarCubes,2);
 assert.ok(!results[1].children[1].children.some(x=>x.className==='food-sugar-label'));
});
test('new catalog loads before seed foods and is cached for offline PWA, old fitness unchanged',()=>{
 const catalog='<script src="./assets/food-variety.js"></script>';
 assert.ok(html.indexOf(catalog)>0&&html.indexOf(catalog)<html.indexOf('const seedFoods=['));
 assert.ok(html.includes('.concat(window.FormaRotaVarietyFoods||[])'));
 assert.ok(html.includes('<script src="./assets/drink-sugar.js"></script>'));
 assert.ok(html.includes('<link rel="stylesheet" href="./assets/drink-sugar.css"/>'));
 for(const f of ['drink-sugar.js','drink-sugar.css','food-variety.js'])
  assert.ok(sw.includes("'./assets/"+f+"'"),f);
 assert.match(sw,/formarota-solo-v92-shell/);
 assert.ok(html.includes('function fitStartSession(){if(fitCurrent)return;'));
 assert.ok(html.includes('function collectBackup(){return{version:7'));
});
test('meal editor recalculates optional drink sugar instead of multiplying cubes by volume',()=>{
 const slice=html.slice(html.indexOf('function nutritionEditLog('),html.indexOf('function makeId(){'));
 assert.ok(slice.includes('FormaRotaDrinkSugar.recalculate(curr,grams,newSugar)'));
 assert.ok(slice.includes('next.name=(curr.baseFoodName||curr.name)'));
 assert.ok(slice.includes('oldSugarCubes:curr.sugarCubes||0,newSugarCubes:newSugar'));
 assert.ok(slice.includes('wrap.append(sugarLabel)'));
 assert.ok(slice.includes('const previousLogs=localStorage.getItem(logKey)'));
});

'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const source=p=>fs.readFileSync(path.join(__dirname,'..',p),'utf8');
const foods=require('../assets/restaurant-foods.js');
const menuBy=id=>foods.find(f=>f.id==='restaurant-doyuyo-'+id);
const menuOptions=(()=>{
 const w={};vm.runInNewContext(source('assets/restaurant-foods.js'),{window:w});
 return w.FormaRotaRestaurantMenuOptions;
})();
const menu=menuBy('paprika-parmesan-3lu-menu');
function pieces(){
 const w={localStorage:{getItem:()=>null,setItem:()=>{}}};
 vm.runInNewContext(source('assets/food-pieces.js'),{window:w});
 return w.FormaRotaFoodPieces;
}
const part=pieces();
const cut=(a,b)=>{
 const html=source('index.html'),start=html.indexOf(a),end=html.indexOf(b,start+a.length);
 assert.ok(start>=0&&end>start,'missing '+a);return html.slice(start,end);
};
test('all Doyuyo full menus are one-tap menu quantities, while tenders keep grams/pieces',()=>{
 assert.ok(menu);
 assert.equal(foods.length,21);
 assert.ok(foods.slice(0,8).every(f=>f.portionUnit==='menü'),'full menus come first when searching Doyuyo');
 assert.equal(foods.filter(f=>f.portionUnit==='menü').length,8);
 assert.ok(foods.slice(8).every(f=>f.portionUnit!== 'menü'));
 assert.equal(menuBy('paprika-parmesan').portionUnit,undefined);
 for(const f of foods.slice(0,8)){
  assert.equal(f.unit,'g','underlying nutrition stays per 100 g');
  assert.ok(f.pieceGrams>350&&f.pieceGrams<1000);
  assert.ok(f.name.includes('Menü (tahmini)'));
 }
 assert.equal(part.logLabel({unit:'g',amount:menu.pieceGrams,
  portionUnit:'menü',pieceCount:1,pieceGrams:menu.pieceGrams},String),'1 menü (tahmini)');
 assert.match(part.logLabel({unit:'g',amount:360,pieceCount:2,pieceGrams:180},String),/2 adet/);
});
test('optional sauce and drink are included once in menu calories, with transparent defaults',()=>{
 const base=menuOptions.withExtras(menu,'none','none');
 assert.ok(base);assert.equal(base.kcal,menu.kcal);
 assert.equal(base.name,menu.name);
 const full=menuOptions.withExtras(menu,'ranch','cola');
 assert.ok(full.name.includes('Ranch'));
 assert.ok(full.name.includes('Şekerli kola'));
 assert.ok(full.note.includes('tek menü kaydına dahildir'));
 const oldCalories=menu.kcal*menu.pieceGrams/100,newCalories=full.kcal*menu.pieceGrams/100;
 const sauce=menuOptions.sauces.find(x=>x.id==='ranch');
 const cola=menuOptions.drinks.find(x=>x.id==='cola');
 assert.ok(Math.abs((newCalories-oldCalories)-(sauce.kcal+cola.kcal))<0.05);
 assert.ok(Math.abs((full.protein-menu.protein)*menu.pieceGrams/100-(sauce.protein+cola.protein))<0.05);
 assert.equal(menuOptions.withExtras(menu,'missing','cola'),null);
 assert.equal(menuOptions.withExtras(menuBy('original'),'ranch','cola'),null);
});
test('restaurant menu result defaults to 1 menu and can add configured sauce and beverage in a single click',()=>{
 const created=tag=>({tag,children:[],value:tag==='select'?'none':'',textContent:'',className:'',
  dataset:{},disabled:false,append(...nodes){this.children.push(...nodes)},
  setAttribute(){},onchange:null,onclick:null});
 const host={children:[],innerHTML:'',append(el){this.children.push(el)}};
 const added=[],status={textContent:''};
 const context={window:{FormaRotaFoodPieces:part,FormaRotaRestaurantMenuOptions:menuOptions,
  FormaRotaFoodUnits:{unit:()=> 'g',basis:()=>({text:'100 g'})}},
  document:{createElement:created},$:()=>status,fmt:v=>Number(v).toFixed(1),
  nutritionMacrosValid:()=>true,addFood:(f,amount,opts)=>added.push({f,amount,opts})};
 vm.runInNewContext(cut('function renderResults(items,root=$(\'results\')){','function localSearch(q){')+';this.render=renderResults;',context);
 context.render([menu],host);
 const card=host.children[0],controls=card.children[1];
 const extras=controls.children[0],label=controls.children[1],button=controls.children[2];
 const input=label.children[0],sauce=extras.children[0].children[0],drink=extras.children[1].children[0];
 assert.equal(label.textContent,'Menü sayısı');
 assert.equal(input.value,'1');
 assert.equal(button.textContent,'Menüyü ekle');
 assert.ok(!controls.children.some(n=>n.tag==='select'),'no gram/adet selector on whole menus');
 input.value='1.5';button.onclick();
 assert.equal(added.length,0,'fractional menu must not be logged');
 assert.match(status.textContent,/tam menü/);
 input.value='1';sauce.value='ranch';drink.value='cola';sauce.onchange();button.onclick();
 assert.equal(added.length,1);
 assert.equal(added[0].amount,menu.pieceGrams);
 assert.equal(added[0].opts.quantityMode,'menü');
 assert.equal(added[0].opts.pieceCount,1);
 assert.ok(added[0].f.kcal>menu.kcal);
 const labelText=card.children[0].children.find(x=>x.tag==='p').textContent;
 assert.ok(labelText.includes('1.0 menü'),'menu preview shows per-serving totals');
});
test('meal log stores a one-menu row with total nutrition, editable legacy weight, without changing previous entries',()=>{
 const rows=[],ui={date:{value:'2026-11-07'},meal:{value:'Akşam yemeği'},status:{textContent:''},amount:{value:'180'}};
 const context={window:{FormaRotaFoodPieces:part,FormaRotaFoodUnits:{unit:x=>x.unit||'g'}},
  $:id=>ui[id],nutritionMacrosValid:f=>f.kcal!=null&&f.protein!=null,
  getLogs:()=>rows.slice(),write:(key,data)=>{rows.splice(0,rows.length,...data)},logKey:'food',
  crypto:{randomUUID:()=>String(rows.length+1)},fmt:String,renderTotals:()=>{}};
 vm.runInNewContext(cut('function addFood(food,chosenAmount){','async function barcodeSearch(){')+';this.add=addFood;',context);
 const withDrink=menuOptions.withExtras(menu,'ranch','cola');
 context.add(withDrink,menu.pieceGrams,{quantityMode:'menü',pieceCount:1,pieceGrams:menu.pieceGrams});
 assert.equal(rows.length,1);assert.equal(rows[0].portionUnit,'menü');
 assert.equal(rows[0].unit,'g');assert.equal(rows[0].pieceCount,1);
 assert.equal(rows[0].amount,menu.pieceGrams);
 assert.ok(rows[0].kcal>menu.kcal*menu.pieceGrams/100);
 assert.equal(part.logLabel(rows[0],String),'1 menü (tahmini)');
 context.add(withDrink,menu.pieceGrams*1.5,{quantityMode:'menü',pieceCount:1.5,pieceGrams:menu.pieceGrams});
 assert.equal(rows.length,1,'fractional menu must not be added');
 context.add(withDrink,menu.pieceGrams*2,{quantityMode:'menü',pieceCount:2,pieceGrams:menu.pieceGrams});
 assert.equal(rows.length,2);
 assert.ok(Math.abs(rows[1].kcal-rows[0].kcal*2)<0.01,'two menus double calories and addons');
 context.add(menuBy('original'),52,{quantityMode:'menü',pieceCount:1,pieceGrams:52});
 assert.equal(rows.length,2,'a plain tender may not be logged as a menu');
});
test('the menu UI, edit prompt and offline assets are connected without modifying the backup schema',()=>{
 const html=source('index.html'),sw=source('sw.js');
 assert.match(html,/field\.step=menuEdit\?'1'/);
 assert.ok(html.includes("const menuEdit=pieceEdit&&original.portionUnit==='menü'"));
 assert.ok(html.includes("item.portionUnit==='menü'?'menü'"));
 assert.ok(html.includes("quantityMode:'menü'"));
 assert.ok(html.includes("let menuSelection=()=>food"));
 assert.ok(html.includes("./assets/restaurant-foods.js?fr=110"));
 assert.ok(html.includes("./assets/food-pieces.js?fr=110"));
 assert.ok(html.includes("./assets/restaurant-menu-entry.css?fr=111"));
 assert.ok(html.includes("details.className='restaurant-menu-notes'"));
 assert.ok(sw.includes("'./assets/restaurant-menu-entry.css'"));
 assert.ok(sw.includes("'./assets/restaurant-foods.js?fr=110'"));
 assert.ok(sw.includes("'./assets/food-pieces.js?fr=110'"));
 assert.ok(html.includes('function collectBackup(){return{version:7'));
 assert.match(sw,/formarota-solo-v111-shell/);
});

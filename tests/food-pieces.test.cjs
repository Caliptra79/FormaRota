'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const vm=require('node:vm'),fs=require('node:fs'),path=require('node:path');
const src=p=>fs.readFileSync(path.join(__dirname,'..',p),'utf8'),html=src('index.html');
const slice=(a,b)=>{const i=html.indexOf(a),j=html.indexOf(b,i+a.length);
 assert.ok(i>=0&&j>i,'missing '+a);return html.slice(i,j);};
function pieces(){
 const store=new Map();const localStorage={getItem:k=>store.get(k)||null,
  setItem:(k,v)=>store.set(k,String(v))};
 const ctx={window:{localStorage}};
 vm.runInNewContext(src('assets/food-pieces.js'),ctx);
 return {mod:ctx.window.FormaRotaFoodPieces,store};
}
test('countable foods use an edible grams estimate; drinks do not become pieces',()=>{
 const {mod:p}=pieces();
 assert.equal(p.grams({id:'apple',name:'Elma'}),180);
 assert.equal(p.grams({id:'egg-boiled',name:'Yumurta'}),50);
 assert.equal(p.grams({id:'banana',name:'Muz'}),120);
 assert.equal(p.grams({id:'variety-fruit-kiwi',name:'Kivi'}),75);
 assert.equal(p.grams({id:'rice-cooked',name:'Pilav'}),null);
 assert.equal(p.grams({id:'apple',name:'Elma suyu',unit:'ml'}),null);
 assert.equal(p.toGrams(2,180),360);
 assert.equal(p.toGrams(0.5,180),90);
 assert.equal(p.toGrams(20,180),null);
 assert.equal(p.toGrams('',180),null);
 assert.equal(p.toGrams(-1,180),null);
});
test('per-food gram overrides persist in local storage and are backup-safe',()=>{
 const {mod:p,store}=pieces();
 const apple={id:'apple',name:'Elma'};
 assert.equal(p.save(apple,160),true);
 assert.equal(p.grams(apple),160);
 assert.equal(JSON.parse(store.get(p.KEY)).apple,160);
 assert.equal(p.grams({id:'custom-1',name:'Börek',pieceGrams:85}),85);
 assert.equal(p.save({id:'custom-1',pieceGrams:85},90),true);
 assert.equal(p.grams({id:'custom-1',pieceGrams:85}),90);
 assert.equal(p.validOverrides({apple:170}),true);
 for(const bad of [{apple:-5},{apple:0},[],{'x':Infinity}])assert.equal(p.validOverrides(bad),false);
 assert.equal(p.save(apple,0),false);
});
test('count entry retains grams for calories and snapshots the chosen count',()=>{
 const {mod:p}=pieces();
 const rows=[];
 const nodes={date:{value:'2026-10-31'},meal:{value:'Ara öğün'},
  status:{textContent:''},amount:{value:'180'}};
 const context={window:{FormaRotaFoodPieces:p},$:k=>nodes[k],
  nutritionMacrosValid:f=>f.kcal!=null&&f.protein!=null,
  getLogs:()=>rows.slice(),write:(_,data)=>{rows.splice(0,rows.length,...data)},
  logKey:'food',crypto:{randomUUID:()=>String(rows.length+1)},
  fmt:String,renderTotals:()=>{}};
 vm.runInNewContext(slice('function addFood(food,chosenAmount){','async function barcodeSearch(){')+';this.add=addFood;',context);
 const apple={id:'apple',name:'Elma',kcal:52,protein:0.3,carbs:13.8,fat:0.2};
 context.add(apple,360,{quantityMode:'adet',pieceCount:2,pieceGrams:180});
 assert.equal(rows[0].amount,360);
 assert.equal(rows[0].unit,'g');
 assert.equal(rows[0].pieceCount,2);assert.equal(rows[0].pieceGrams,180);
 assert.equal(rows[0].kcal,187.2);
 assert.match(p.logLabel(rows[0],String),/2 adet/);
 context.add(apple,180,{quantityMode:'adet',pieceCount:2,pieceGrams:180});
 assert.equal(rows.length,1,'invalid conversion cannot be logged');
 context.add({id:'rice-cooked',name:'Pilav',kcal:150,protein:4},100);
 assert.equal(rows[1].amount,100);
 assert.equal(rows[1].pieceCount,undefined);
});
test('UI, edits, custom food, backup and service worker include count mode',()=>{
 assert.ok(html.includes('const pieceChoice=pieceGrams!=null?'));
 assert.ok(html.includes("pieceChoice.value='adet'"));
 assert.ok(html.includes("pieceCount:Number(input.value)"));
 assert.ok(html.includes("!!window.FormaRotaFoodPieces?.logLabel(original,fmt)"));
 assert.ok(html.includes('newPieceCount:chosen'));
 assert.ok(html.includes('customPieceGrams'));
 assert.ok(html.includes('pieceGrams:window.FormaRotaFoodPieces?.overrides?.()||{}'));
 assert.ok(html.includes('if(data.pieceGrams!=null)changes.push('));
 assert.ok(html.includes('validOverrides(data.pieceGrams)'));
 assert.ok(html.includes("./assets/food-pieces.js"));
 assert.ok(html.includes("./assets/food-pieces.css"));
 const sw=src('sw.js');
 assert.ok(sw.includes("'./assets/food-pieces.js'"));
 assert.ok(sw.includes("'./assets/food-pieces.css'"));
 assert.ok(sw.includes("formarota-solo-v93-shell"));
 assert.ok(html.includes('function collectBackup(){return{version:7'));
});

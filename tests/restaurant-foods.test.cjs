'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const src=name=>fs.readFileSync(path.join(__dirname,'..',name),'utf8');
const foods=require('../assets/restaurant-foods.js');
const by=id=>foods.find(f=>f.id==='restaurant-doyuyo-'+id);
test('Doyuyo offline catalog is searchable with product names and aliases',()=>{
 const html=src('index.html'),sw=src('sw.js');
 assert.ok(html.includes('<script src="./assets/restaurant-foods.js"></script>'));
 assert.ok(html.includes('.concat(window.FormaRotaRestaurantFoods||[])'));
 assert.ok(html.includes("startsWith('restaurant-')&&food.note"));
 assert.ok(sw.includes("'./assets/restaurant-foods.js'"));
 assert.equal(foods.length,21);
 assert.equal(new Set(foods.map(x=>x.id)).size,foods.length);
 assert.ok(foods.every(x=>x.restaurant==='Doyuyo'&&x.unit==='g'&&x.nutritionBasis==='100g'));
 assert.ok(foods.every(x=>x.verified===false&&x.referenceUrl?.startsWith('https://')));
 assert.ok(foods.some(f=>f.aliases.some(a=>a.toLocaleLowerCase('tr-TR').includes('paprika parmesan'))));
 new vm.Script(src('assets/restaurant-foods.js'));
});
test('Paprika Parmesan Tenders uses stated per-100g nutrients, not whole menu numbers',()=>{
 const p=by('paprika-parmesan');
 assert.equal(p.kcal,282);assert.equal(p.protein,22.57);
 assert.equal(p.carbs,14.72);assert.equal(p.fat,14.77);
 assert.equal(p.pieceGrams,52);
 assert.ok(p.note.includes('çiğ'));
 assert.ok(!p.name.includes('Menü'));
});
test('menu entries offer whole-menu as an editable piece, keep drink and gourmet sauce separate',()=>{
 for(const kind of ['paprika-parmesan','original','cajun','spicy']){
  const one=by(kind);
  for(const n of [3,4]){
   const menu=by(kind+'-'+n+'lu-menu');
   assert.ok(menu,kind+' '+n);
   assert.ok(menu.pieceGrams>350&&menu.pieceGrams<=1000);
   assert.ok(menu.kcal>160&&menu.kcal<350);
   assert.ok(menu.note.includes('DAHİL DEĞİL'));
   assert.ok(menu.name.includes('tahmini'));
   const estimatedPortionKcal=menu.kcal*menu.pieceGrams/100;
   assert.ok(estimatedPortionKcal>900&&estimatedPortionKcal<1500);
  }
  assert.ok(by(kind+'-4lu-menu').pieceGrams>by(kind+'-3lu-menu').pieceGrams);
 }
});
test('all numeric fields and original records remain read-only',()=>{
 for(const f of foods){
  assert.ok(Object.isFrozen(f));
  for(const metric of ['kcal','protein','carbs','fat'])assert.ok(Number.isFinite(f[metric])&&f[metric]>=0);
  assert.ok(f.id.startsWith('restaurant-'));
  assert.equal(f.source.startsWith('Doyuyo'),true);
 }
 assert.doesNotMatch(src('assets/restaurant-foods.js'),/localStorage|fetch\(/);
 assert.ok(src('index.html').includes("const logKey=\"kocluk-food-log-v2\""));
});

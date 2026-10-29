'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');

const file=p=>fs.readFileSync(path.join(__dirname,'..',p),'utf8');
const html=file('index.html');
const sw=file('sw.js');
function loadDesserts(){
  const window={};
  vm.runInNewContext(file('assets/ready-desserts.js'),{window});
  return window.FormaRotaReadyDesserts;
}

test('nine unique ready-to-eat desserts provide complete per-100-g nutrients',()=>{
  const foods=loadDesserts();
  assert.equal(foods.length,9);
  assert.equal(new Set(Array.from(foods,f=>f.id)).size,foods.length);
  for(const f of foods){
    assert.equal(f.unit,'g');
    assert.equal(f.nutritionBasis,'100g');
    assert.equal(f.category,'Tatlı');
    assert.equal(f.verified,false);
    assert.match(f.source,/yaklaşık/);
    assert.match(f.note,/kuru puding tozu değildir/);
    for(const key of ['kcal','protein','carbs','fat']){
      assert.ok(Number.isFinite(f[key])&&f[key]>=0, f.id+': '+key);
    }
  }
});

test('pudding, supangle, magnolia, and profiterole work in offline local search',()=>{
  const foods=loadDesserts(),window={FormaRotaFoodSearchCache:{find:()=>[]}};
  const start=html.indexOf('function localSearch(q){');
  const end=html.indexOf('function nutritionMacrosValid(f){',start);
  assert.ok(start>=0&&end>start);
  const ctx={window,seedFoods:Array.from(foods),getCustom:()=>[],
    norm:s=>String(s||'').toLocaleLowerCase('tr-TR').normalize('NFD').replace(/[\\u0300-\\u036f]/g,'').trim()};
  vm.runInNewContext(html.slice(start,end)+'\nthis.searchLocal=localSearch;',ctx);
  for(const [query,expected] of [
    ['puding',4],['supangle',1],['keskul',1],['magnolia',1],['profiterol',1]
  ]){
    const found=ctx.searchLocal(query);
    assert.ok(found.length>=expected,query+': '+found.length+' results');
  }
  const chocolate=foods.find(f=>f.id==='dessert-hazir-cikolatali-puding');
  assert.ok(chocolate);
  assert.equal(chocolate.kcal*1.5,162,'150 g chocolate pudding estimates 162 kcal');
});

test('ready-desserts module is loaded before food seed initialization and offline precached',()=>{
  const loader=html.indexOf('<script src="./assets/ready-desserts.js"></script>');
  const seed=html.indexOf('const seedFoods=[');
  assert.ok(loader>0&&seed>loader);
  assert.ok(html.includes('.concat(window.FormaRotaReadyDesserts||[])'));
  assert.ok(html.includes("String(food.id||'').startsWith('dessert-')&&food.note"));
  assert.ok(sw.includes("'./assets/ready-desserts.js'"));
  assert.match(sw,/const CACHE='formarota-solo-v87-shell'/);
  assert.match(sw,/const GIF_CACHE='formarota-solo-v87-gifs'/);
});

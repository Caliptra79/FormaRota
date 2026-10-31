'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const src=p=>fs.readFileSync(path.join(__dirname,'..',p),'utf8');
const html=src('index.html'),sw=src('sw.js');
function foods(){
 const window={};vm.runInNewContext(src('assets/breakfast-sweets.js'),{window});
 return Array.from(window.FormaRotaBreakfastSweets);
}
const list=foods();
const get=id=>list.find(x=>x.id==='sweet-'+id);
function normalize(v){return String(v||'').toLocaleLowerCase('tr-TR').normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim()}
test('23 pancake, crepe, waffle, French toast and toppings use distinct stable IDs',()=>{
 assert.equal(list.length,23);
 assert.equal(new Set(list.map(f=>f.id)).size,23);
 for(const f of list){
  assert.match(f.id,/^sweet-[a-z0-9-]+$/);
  assert.equal(f.unit,'g');assert.equal(f.nutritionBasis,'100g');
  assert.equal(f.verified,false);
  assert.match(f.source,/yaklaşık/);
  assert.ok(f.name&&f.aliases.length&&f.note);
  for(const key of ['kcal','protein','carbs','fat'])
   assert.ok(Number.isFinite(f[key])&&f[key]>=0&&f[key]<=1000,f.id+' '+key);
 }
});
test('basic prepared pancakes, waffles and French toast use USDA reference macros',()=>{
 const bases=[
  ['pankek-sade',227,6.4,28.3,9.7],
  ['waffle-sade',291,7.9,32.9,14.1],
  ['fransiz-tostu',229,7.7,25,10.8]
 ];
 for(const [id,kcal,protein,carbs,fat] of bases){
  const f=get(id);assert.ok(f,id);
  assert.equal(f.kcal,kcal);assert.equal(f.protein,protein);
  assert.equal(f.carbs,carbs);assert.equal(f.fat,fat);
  assert.equal(f.type,'plain');
  assert.match(f.note,/sos.*dahil değildir/);
  assert.match(f.reference,/^https:\/\//);
 }
});
test('mixed and topped variants explain included fillings; standalone sauces are separate',()=>{
 for(const f of list.filter(f=>f.type!=='plain'&&f.type!=='topping')){
  assert.match(f.note,/dahildir/);
 }
 const sauces=list.filter(f=>f.type==='topping');
 assert.equal(sauces.length,3);
 for(const f of sauces){
  assert.equal(f.category,'Tatlı sosu');
  assert.match(f.note,/ayrıca ekleyebilirsin/);
 }
 assert.equal(get('pankek-balli').type,'topped');
 assert.equal(get('krep-cikolatali').type,'filled');
 assert.equal(get('waffle-cikolatali').type,'topped');
});
test('local offline food search finds plain and topped variants by Turkish and English aliases',()=>{
 const a=html.indexOf('function localSearch(q){'),b=html.indexOf('function nutritionMacrosValid(f){',a);
 assert.ok(a>0&&b>a);
 const ctx={window:{FormaRotaFoodSearchCache:{find:()=>[]}},seedFoods:list,
  getCustom:()=>[],norm:normalize};
 vm.runInNewContext(html.slice(a,b)+'\nthis.searchLocal=localSearch;',ctx);
 for(const [query,min] of [
  ['pankek',8],['pancake',2],['krep',4],['waffle',4],
  ['fransız tostu',4],['french toast',4],
  ['çikolatalı waffle',1],['nutellalı krep',1],['akçaağaç şurubu',1]]){
  const found=ctx.searchLocal(query);
  assert.ok(found.length>=min,query+' has '+found.length+' results');
 }
 const aResult=ctx.searchLocal('çikolatalı waffle');
 assert.ok(aResult.some(x=>x.id==='sweet-waffle-cikolatali'));
});
test('portion calories are proportional to grams, with no arbitrary piece conversion',()=>{
 assert.equal(get('pankek-sade').kcal*1.5,340.5);
 assert.equal(get('waffle-sade').kcal/2,145.5);
 const saved=[];
 const nodes={date:{value:'2026-10-31'},meal:{value:'Ara öğün'},status:{textContent:''},amount:{value:'180'}};
 const start=html.indexOf('function addFood(food,chosenAmount){');
 const end=html.indexOf('async function barcodeSearch(){',start);
 assert.ok(start>0&&end>start);
 const ctx={window:{FormaRotaFoodUnits:{unit:x=>x.unit},FormaRotaDrinkSugar:null},
  $:id=>nodes[id],getLogs:()=>saved.slice(),nutritionMacrosValid:()=>true,
  write:(_,rows)=>{saved.splice(0,saved.length,...rows)},logKey:'food',
  crypto:{randomUUID:()=>String(saved.length+1)},fmt:String,renderTotals:()=>{}};
 vm.runInNewContext(html.slice(start,end)+'\nthis.add=addFood;',ctx);
 ctx.add(get('pankek-sade'),150);
 ctx.add(get('akcaagac-surubu'),15);
 assert.equal(saved.length,2);
 assert.equal(saved[0].amount,150);assert.equal(saved[0].unit,'g');
 assert.equal(saved[0].kcal,340.5);
 assert.equal(saved[1].kcal,39);
 assert.equal(saved[0].foodId,'sweet-pankek-sade');
 assert.equal(saved[0].date,'2026-10-31');
 assert.equal(saved[0].sugarCubes,undefined);
});
test('search results display a note to avoid counting filled/sauced options twice',()=>{
 const start=html.indexOf("function renderResults(items,root=$('results')){");
 const end=html.indexOf('function localSearch(q){',start);
 assert.ok(start>0&&end>start);
 const nodes=[];
 const make=tag=>({tag,children:[],className:'',textContent:'',value:'',attrs:{},style:{},
  append(...args){this.children.push(...args)},setAttribute(k,v){this.attrs[k]=v}});
 const host={innerHTML:'',append:e=>nodes.push(e)};
 const ctx={window:{FormaRotaFoodUnits:{unit:()=> 'g',basis:()=>({text:'100 g',approximate:false})}},
  document:{createElement:make},$:()=>host,
  fmt:String,nutritionMacrosValid:()=>true};
 vm.runInNewContext(html.slice(start,end)+'\nthis.draw=renderResults;',ctx);
 ctx.draw([get('pankek-sade'),get('waffle-cikolatali')],host);
 assert.equal(nodes.length,2);
 for(let i=0;i<2;i++){
  const left=nodes[i].children[0];
  const notes=left.children.filter(x=>x.className==='food-unit-estimate');
  assert.equal(notes.length,1);
  assert.equal(notes[0].textContent,i===0?get('pankek-sade').note:get('waffle-cikolatali').note);
 }
});
test('new module loads before food list and is cached for offline PWA, preserving workouts and backup',()=>{
 const loader='<script src="./assets/breakfast-sweets.js"></script>';
 assert.equal(html.split(loader).length-1,1);
 assert.ok(html.indexOf(loader)<html.indexOf('const seedFoods=['));
 assert.ok(html.includes('.concat(window.FormaRotaBreakfastSweets||[])'));
 assert.ok(sw.includes("'./assets/breakfast-sweets.js'"));
 assert.match(sw,/const CACHE='formarota-solo-v92-shell'/);
 assert.match(sw,/const GIF_CACHE='formarota-solo-v92-gifs'/);
 assert.equal(fs.readdirSync(path.join(__dirname,'../assets')).filter(x=>x.endsWith('.gif')).length,19);
 assert.ok(html.includes('function fitStartSession(){if(fitCurrent)return;'));
 assert.ok(html.includes('function collectBackup(){return{version:7'));
});

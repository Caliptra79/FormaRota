'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const src=p=>fs.readFileSync(path.join(__dirname,'..',p),'utf8');
const html=src('index.html'),sw=src('sw.js');
function load(){
 const window={};vm.runInNewContext(src('assets/prepared-foods.js'),{window});
 return Array.from(window.FormaRotaPreparedFoods);
}
function localSearchFixture(){
 const start=html.indexOf('function localSearch(q){'),end=html.indexOf('function nutritionMacrosValid(f){',start);
 assert.ok(start>0&&end>start);
 const ctx={window:{FormaRotaFoodSearchCache:{find:()=>[]}},seedFoods:load(),getCustom:()=>[],
  norm:s=>String(s||'').toLocaleLowerCase('tr-TR').normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim()};
 vm.runInNewContext(html.slice(start,end)+'\nthis.searchLocal=localSearch;',ctx);
 return ctx.searchLocal;
}
test('20 unique prepared foods use 100g nutrition records with correct source transparency',()=>{
 const foods=load();assert.equal(foods.length,20);
 assert.equal(new Set(foods.map(f=>f.id)).size,20);
 assert.equal(foods.filter(f=>f.name.startsWith('Banvit ')).length,10);
 assert.equal(foods.filter(f=>f.name.includes('(tahmini)')).length,10);
 for(const f of foods){
  assert.equal(f.unit,'g');assert.equal(f.nutritionBasis,'100g');
  assert.equal(f.verified,false);assert.equal(f.category,'Hazır yemek');
  assert.ok(f.aliases.length>0&&f.note.length>30);
  for(const key of ['kcal','protein','carbs','fat'])
   assert.ok(Number.isFinite(f[key])&&f[key]>=0&&f[key]<=1000,f.id+' '+key);
  if(f.name.startsWith('Banvit ')){
   assert.match(f.source,/üretici/);assert.match(f.referenceUrl,/^https:\/\/(www\.banvit\.com|www\.migros\.com\.tr)\//);
   assert.match(f.note,/ambalajın güncel etiketini kontrol et/i);
  }else{
   assert.match(f.source,/tahmini/);assert.equal(f.referenceUrl,null);
   assert.match(f.note,/yaklaşık/);
  }
 }
});
test('Banvit Crispy Chicken Pieces and related foods reflect manufacturer declarations per 100 g',()=>{
 const foods=load();
 const find=id=>foods.find(f=>f.id==='prepared-'+id);
 assert.deepEqual([find('banvit-citir-parcalari').kcal,find('banvit-citir-parcalari').protein,
  find('banvit-citir-parcalari').carbs,find('banvit-citir-parcalari').fat],[196,13.7,14.2,9.4]);
 assert.equal(find('banvit-citir-parcalari').kcal*1.5,294,'150g crispy chicken = 294 kcal');
 assert.deepEqual([find('banvit-pilic-nuget').kcal,find('banvit-schnitzel').kcal,
  find('banvit-citir-kanat').kcal,find('banvit-tempura-nuget').kcal],[270,266,228,160]);
 assert.equal(find('banvit-yaprak-doner').protein,22.4);
 assert.equal(find('banvit-pilic-kofte').kcal,218);
});
test('Banvit, typo-friendly search aliases, and frozen ready meals work without network',()=>{
 const search=localSearchFixture();
 for(const [query,expected] of [
  ['banvit çıtır tavuk','prepared-banvit-citir-parcalari'],
  ['banvit citir tavuk','prepared-banvit-citir-parcalari'],
  ['banvit nugget','prepared-banvit-pilic-nuget'],
  ['banvit şinitzel','prepared-banvit-schnitzel'],
  ['tempura','prepared-banvit-tempura-nuget'],
  ['banvit döner','prepared-banvit-yaprak-doner'],
  ['mozzarella sticks','prepared-generic-mozzarella-stick'],
  ['hazır mantı','prepared-generic-hazir-manti'],
  ['balık çubuğu','prepared-generic-balik-pane']
 ]){
  const found=Array.from(search(query));
  assert.ok(found.some(f=>f.id===expected),query+': '+found.map(f=>f.id));
 }
 const all=Array.from(search('banvit'));
 assert.equal(all.length,10);
});
test('PWA precaches the catalog and food search presents product notes without changing user records',()=>{
 const pre=html.indexOf('<script src="./assets/prepared-foods.js"></script>'),
  seeds=html.indexOf('const seedFoods=[');
 assert.ok(pre>0&&pre<seeds);
 assert.match(html,/\.concat\(window\.FormaRotaPreparedFoods\|\|\[\]\)/);
 assert.match(html,/startsWith\('prepared-'\)&&food\.note/);
 assert.match(sw,/'\.\/assets\/prepared-foods\.js'/);
 assert.match(sw,/formarota-solo-v103-shell/);
 assert.match(html,/function collectBackup\(\)\{return\{version:7/);
 assert.match(html,/id="absManualToggle"/);
 assert.match(html,/id="walkKm"/);
 assert.match(html,/id="query"/);
});

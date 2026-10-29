'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const fs=require('node:fs');
const path=require('node:path');
const source=p=>fs.readFileSync(path.join(__dirname,'..',p),'utf8');
const html=source('index.html');
const searchBlock=html.slice(html.indexOf('function localSearch(q){'),html.indexOf('function addFood(food,chosenAmount){'));
assert.ok(searchBlock.startsWith('function localSearch(q){')&&searchBlock.includes('async function search(){'));

function cacheFixture(){
 const data=new Map(),root={},store={
  getItem:key=>data.get(key)||null,setItem:(key,val)=>data.set(key,String(val))
 };
 vm.runInNewContext(source('assets/food-search-cache.js'),{window:root,localStorage:store});
 return {cache:root.FormaRotaFoodSearchCache,data,store};
}
const food=(name='Ayran',code='12345678')=>({
 id:'off-'+code,code,name,kcal:40,protein:2,carbs:3,fat:1,unit:'ml',nutritionBasis:'100ml'
});
const apiProduct=(name='Ayran',code='12345678')=>({
 code,product_name:name,nutriments:{
  'energy-kcal_100ml':40,'proteins_100ml':2,'carbohydrates_100ml':3,'fat_100ml':1,
  'energy-kcal_100g':40,'proteins_100g':2
 }
});
function searchFixture({online=true,fetcher=()=>Promise.resolve({ok:true,json:async()=>({products:[]})})}={}){
 const f=cacheFixture(),renders=[],custom=[],status={textContent:''};
 const nodes={query:{value:'ayran'},source:{value:'all'},status};
 const ctx={
  window:{FormaRotaFoodSearchCache:f.cache,FormaRotaFoodUnits:{
   unit:item=>/ayran/i.test(item.name)?'ml':'g'
  }},
  seedFoods:[{id:'tr-ayran',name:'Ayran',kcal:38,protein:2.1}],
  getCustom:()=>custom,customKey:'custom',write:(_,val)=>{custom.splice(0,custom.length,...val)},
  renderCustomFoods:()=>{},renderRecipeOptions:()=>{},
  norm:s=>String(s).toLocaleLowerCase('tr-TR'),
  $:key=>nodes[key],renderResults:rows=>renders.push(rows.map(x=>({...x}))),
  navigator:{onLine:online},fetch:fetcher,URLSearchParams
 };
 vm.runInNewContext(searchBlock+';this.runSearch=search;this.saveProduct=savePackagedFood;',ctx);
 return {ctx,cache:f.cache,nodes,renders,custom};
}
test('packaged products stay in a bounded offline cache without changing meal records',()=>{
 const f=cacheFixture();
 f.store.setItem('meal-logs','important records');
 const items=Array.from({length:135},(_,i)=>food('Ayran '+i,String(10000000+i)));
 assert.equal(f.cache.saveMany(items),true);
 assert.equal(f.cache.all().length,120);
 assert.equal(f.cache.find('Ayran 134').length,1);
 assert.equal(f.cache.all().some(x=>x.id==='off-10000000'),false);
 assert.equal(f.store.getItem('meal-logs'),'important records');
 const entry=f.cache.find('Ayran 134')[0];
 assert.equal(entry.nutritionBasis,'100ml');
 assert.match(entry.source,/etiket kontrolü/);
 assert.equal(entry.verified,false);
 f.store.setItem('formarota-food-search-cache-v1','invalid json');
 assert.deepEqual(Array.from(f.cache.all()),[]);
});
test('local foods render before the pending network request resolves',async()=>{
 let finish;
 const f=searchFixture({fetcher:()=>new Promise(resolve=>{finish=resolve;})});
 const pending=f.ctx.runSearch();
 assert.equal(f.renders.length,1);
 assert.deepEqual(Array.from(f.renders[0],x=>x.id),['tr-ayran']);
 assert.match(f.nodes.status.textContent,/arka planda/);
 finish({ok:true,json:async()=>({products:[apiProduct()]})});
 await pending;
 assert.equal(f.renders.length,2);
 assert.deepEqual(Array.from(f.renders[1],x=>x.id),['tr-ayran','off-12345678']);
 assert.equal(f.cache.find('Ayran').length,1);
});
test('offline mode shows cached products and never calls Open Food Facts',async()=>{
 let calls=0;
 const f=searchFixture({online:false,fetcher:()=>{calls++;throw Error('Unexpected fetch');}});
 f.cache.saveMany([food('Ayran')]);
 f.nodes.source.value='off';
 await f.ctx.runSearch();
 assert.equal(calls,0);
 assert.deepEqual(Array.from(f.renders[0],x=>x.id),['off-12345678']);
 assert.match(f.nodes.status.textContent,/çevrimdışı/);
 f.nodes.source.value='local';
 await f.ctx.runSearch();
 assert.equal(calls,0);
 assert.deepEqual(Array.from(f.renders[1],x=>x.id),['tr-ayran','off-12345678']);
});
test('old network responses never overwrite a newer search',async()=>{
 const callbacks=[];
 const f=searchFixture({fetcher:()=>new Promise(resolve=>callbacks.push(resolve))});
 const first=f.ctx.runSearch();
 f.nodes.query.value='süt';
 const second=f.ctx.runSearch();
 callbacks[1]({ok:true,json:async()=>({products:[apiProduct('Süt','22222222')]})});
 await second;
 const count=f.renders.length;
 callbacks[0]({ok:true,json:async()=>({products:[apiProduct('Ayran','11111111')]})});
 await first;
 assert.equal(f.renders.length,count);
 assert.equal(f.cache.all().some(x=>x.id==='off-11111111'),false);
 assert.equal(f.cache.find('Süt').length,1);
});
test('save button retains packaged food in the existing backed-up custom food store',()=>{
 const f=searchFixture();
 assert.equal(f.ctx.saveProduct(food()),true);
 assert.equal(f.custom.length,1);
 assert.equal(f.custom[0].unit,'ml');
 assert.equal(f.custom[0].nutritionBasis,'100ml');
 assert.match(f.custom[0].source,/etiket kontrolü/);
 assert.equal(f.ctx.saveProduct(food()),true);
 assert.equal(f.custom.length,1);
 assert.equal(f.ctx.saveProduct({id:'off-bad',name:'Invalid',kcal:null,protein:null}),false);
});
test('offline cache script is precached for PWA, and personal food backup remains unchanged',()=>{
 const sw=source('sw.js');
 assert.ok(html.includes('<script src="./assets/food-search-cache.js"></script>'));
 assert.ok(sw.includes("'./assets/food-search-cache.js'"));
 assert.ok(sw.includes("const CACHE='formarota-solo-v88-shell'"));
 assert.ok(html.includes("function collectBackup(){return{version:7"));
 assert.ok(html.includes('function savePackagedFood(food){'));
 assert.ok(html.includes("foodSearchSerial++;if(foodSearchAbort)foodSearchAbort.abort()"));
});

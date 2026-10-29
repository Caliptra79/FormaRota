/* Offline cache for recently searched Open Food Facts products.
 * This is disposable search data, separate from meal logs and user-created foods.
 * Users can explicitly save products to their backed-up personal food library.
 */
(function(root){
 'use strict';
 const KEY='formarota-food-search-cache-v1',LIMIT=120;
 function norm(s){return String(s||'').toLocaleLowerCase('tr-TR').normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim();}
 function clean(food){
  if(!food||!String(food.id||'').startsWith('off-')||!String(food.name||'').trim())return null;
  const kcal=Number(food.kcal),protein=Number(food.protein);
  if(!Number.isFinite(kcal)||kcal<0||kcal>1000||!Number.isFinite(protein)||protein<0||protein>100)return null;
  const macro=k=>food[k]==null||food[k]===''?null:(Number.isFinite(Number(food[k]))&&Number(food[k])>=0&&Number(food[k])<=1000?Number(food[k]):null);
  return {id:String(food.id).slice(0,100),name:String(food.name).slice(0,160),
   kcal,protein,carbs:macro('carbs'),fat:macro('fat'),
   unit:food.unit==='ml'?'ml':'g',nutritionBasis:food.nutritionBasis==='100ml'?'100ml':'100g',
   kind:'Paketli ürün',source:'Open Food Facts · çevrimdışı arama (etiket kontrolü gerekli)',
   code:String(food.code||'').slice(0,30),verified:false};
 }
 function all(){
  try{
   const list=JSON.parse(localStorage.getItem(KEY)||'[]');
   return Array.isArray(list)?list.slice(-LIMIT).map(clean).filter(Boolean):[];
  }catch{return [];}
 }
 function find(query){
  const terms=norm(query).split(/\s+/).filter(Boolean);
  if(!terms.length)return [];
  return all().filter(x=>terms.every(t=>norm(x.name+' '+x.code).includes(t))).reverse();
 }
 function saveMany(products){
  if(!Array.isArray(products)||!products.length)return true;
  const merged=new Map(all().map(x=>[x.id,x]));
  for(const product of products){
   const item=clean(product);if(!item)continue;
   merged.delete(item.id);merged.set(item.id,item);
  }
  try{localStorage.setItem(KEY,JSON.stringify([...merged.values()].slice(-LIMIT)));return true;}
  catch{return false;}
 }
 root.FormaRotaFoodSearchCache=Object.freeze({all,find,saveMany});
})(window);

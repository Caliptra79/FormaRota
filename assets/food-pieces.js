/* FormaRota: countable foods. All nutrition stays per 100 g.
 * Default pieces are rough edible-portion estimates, not package weights.
 * User overrides are local and included in exported backups.
 */
(function(root){
 'use strict';
 const KEY='formarota-food-piece-grams-v1';
 const DEFAULTS=Object.freeze({
  'egg-boiled':50,'banana':120,'apple':180,'tomato':120,'cucumber':170,
  'olives':5,'almond':1.2,
  'variety-fruit-pear':160,'variety-fruit-orange':130,'variety-fruit-tangerine':90,
  'variety-fruit-strawberry':12,'variety-fruit-grapes':5,
  'variety-fruit-peach':140,'variety-fruit-apricot':35,
  'variety-fruit-pomegranate':160,'variety-fruit-kiwi':75,
  'variety-fruit-plum':55,'variety-fruit-cherry':5,
  'variety-fruit-fig':50,'variety-fruit-date':7,
  'variety-fruit-dried-apricot':8,'variety-fruit-avocado':135,
  'variety-veg-carrot':65,'variety-veg-pepper':130,
  'variety-veg-onion':110,'variety-veg-garlic':4
 });
 const validGrams=value=>Number.isFinite(Number(value))&&
  String(value).trim()!==''&&Number(value)>=0.1&&Number(value)<=1000;
 const validCount=value=>Number.isFinite(Number(value))&&
  String(value).trim()!==''&&Number(value)>0&&Number(value)<=1000;
 function validOverrides(data){
  return !!data&&typeof data==='object'&&!Array.isArray(data)&&
   Object.keys(data).length<=1000&&Object.entries(data).every(([id,g])=>
    typeof id==='string'&&id.length>0&&id.length<=140&&validGrams(g));
 }
 function overrides(){
  try{const data=JSON.parse(root.localStorage?.getItem(KEY)||'{}');
   return validOverrides(data)?data:{};
  }catch{return {};}
 }
 function grams(food){
  if(!food||food.unit==='ml'||food.nutritionBasis==='100ml')return null;
  const id=String(food.id||'');
  const base=DEFAULTS[id]??food.pieceGrams;
  if(!validGrams(base))return null;
  const user=overrides()[id];
  return validGrams(user)?Number(user):Number(base);
 }
 function toGrams(count,pieceGrams){
  if(!validCount(count)||!validGrams(pieceGrams))return null;
  const amount=Math.round(Number(count)*Number(pieceGrams)*1000)/1000;
  return amount>0&&amount<=3000?amount:null;
 }
 function save(food,value){
  if(grams(food)===null||!validGrams(value)||!food?.id)return false;
  const next={...overrides(),[food.id]:Number(value)};
  if(!validOverrides(next))return false;
  try{root.localStorage.setItem(KEY,JSON.stringify(next));return true;}catch{return false;}
 }
 function logLabel(record,format){
  if(record?.unit!=='g'||!validCount(record?.pieceCount)||
   !validGrams(record?.pieceGrams)||toGrams(record.pieceCount,record.pieceGrams)===null)return null;
  const fmt=typeof format==='function'?format:String;
  return fmt(record.pieceCount)+' adet (≈ '+fmt(record.amount)+' g)';
 }
 root.FormaRotaFoodPieces=Object.freeze({KEY,DEFAULTS,grams,validGrams,
  validCount,validOverrides,overrides,toGrams,save,logLabel});
})(window);

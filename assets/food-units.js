/* FormaRota: display units for food entries.
 * Legacy food tables are generally values per 100 g. Do NOT silently
 * convert historic records or claim a measured density for beverages.
 * For legacy per-100-g drink references we use an explicit 1 ml ≈ 1 g
 * approximation; where a 100 ml label is available, use that directly.
 */
(function(root){
 'use strict';
 const DRINK_IDS=new Set(['milk','tr-ayran']);
 const drinkTerms=/(?:^|[^a-zçğıöşü])(?:ayran|kefir|süt|soya sütü|badem sütü|kahve|çay|limonata|gazoz|kola|cola|soda|şalgam|şerbet|boza|milkshake|smoothie|juice|latte|espresso|cappuccino|americano|kombucha|içecek|icecek|drink)(?=$|[^a-zçğıöşü])/i;
 function unit(food){
  if(food?.unit==='ml'||food?.unit==='g')return food.unit;
  if(DRINK_IDS.has(String(food?.id||'')))return 'ml';
  const name=String(food?.name||'').toLocaleLowerCase('tr-TR');
  if(/(?:meyve|portakal|elma|domates|üzüm|nar|vişne) suyu|maden suyu|içme suyu|soğuk çay|ice tea|iced tea|ıced tea/i.test(name))return 'ml';
  if(/^(?:su|water)(?:\s*\(|$)/i.test(name))return 'ml';
  return drinkTerms.test(name)?'ml':'g';
 }
 function basis(food){
  const selected=unit(food);
  if(selected==='ml'&&food?.nutritionBasis==='100ml')return {text:'100 ml',approximate:false};
  if(selected==='ml')return {text:'100 g (≈ 100 ml)',approximate:true};
  return {text:'100 g',approximate:false};
 }
 function loggedUnit(row){return row?.unit==='ml'?'ml':'g';}
 root.FormaRotaFoodUnits=Object.freeze({unit,basis,loggedUnit});
})(window);

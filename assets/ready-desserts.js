/* FormaRota: quick-add prepared desserts, all values per 100 g READY TO EAT.
 * These are representative nutrition references, not verified values for every
 * brand or a dry powder mix. Consult the actual package label when available.
 * Source examples (accessed 2026-10-29):
 * Chocolate pudding, ready cup (108 kcal): https://www.a101.com.tr/kapida/donuk-hazir-yemek-meze/milkten-cikolatali-puding-4x100-g_p-12001750
 * Cocoa pudding, prepared (128 kcal): https://www.droetker.com.tr/urunler/p/puding-kakaolu
 * Vanilla pudding, prepared (120 kcal): https://www.droetker.com.tr/urunler/p/puding-vanilyali
 * Banana pudding, prepared (120 kcal): https://www.droetker.com.tr/urunler/p/puding-muzlu
 * Supangle reference (125 kcal): https://panayirgourmet.com/products/supangle
 * Keşkül reference (141 kcal): https://turkomp.tarimorman.gov.tr/food-keskul-istanbul-632
 * Profiterol ready cup (207 kcal): https://www.migros.com.tr/eker-profiterol-100-g-p-b064b6
 * Banana magnolia (140 kcal): https://www.fastbakery.com.tr/icerik/tatlilar/muzlu-magnolia
 * Banana Crème Olé, prepared (120 kcal): https://www.droetker.com.tr/urunler/p/creme-ole-muz-aromali
 */
(function(root){
 'use strict';
 // id | name | kcal | protein | carbohydrates | fat | search aliases (; separated)
 const rows=[
  ['hazir-cikolatali-puding','Hazır kase çikolatalı puding (tahmini)',108,1,21,2.2,'çikolatalı puding;puding çikolatalı;hazır puding;kase puding'],
  ['kakaolu-puding','Kakaolu puding, sütle hazırlanmış (tahmini)',128,3.6,20,3.6,'kakaolu puding;puding kakao;hazır puding'],
  ['vanilyali-puding','Vanilyalı puding, hazırlanmış (tahmini)',120,3.2,19,3.4,'vanilyalı puding;vanilinli puding;puding vanilyalı'],
  ['muzlu-puding','Muzlu puding, hazırlanmış (tahmini)',120,3.2,19,3.4,'muzlu puding;puding muzlu'],
  ['supangle','Supangle (hazır tatlı, tahmini)',125,3.5,14.9,5.2,'supangle;çikolatalı sütlü tatlı'],
  ['keskul','Keşkül (tahmini)',141,2.5,19.5,5.7,'keşkül;keskul;bademli sütlü tatlı'],
  ['profiterol','Profiterol (hazır kase, tahmini)',207,4.9,26.7,9,'profiterol;çikolata soslu profiterol'],
  ['muzlu-magnolia','Muzlu magnolia (hazır tatlı, tahmini)',140,3.3,18,5.8,'magnolia;magnolya;muzlu magnolia;muzlu magnolya'],
  ['muzlu-creme-ole','Muzlu Crème Olé, hazırlanmış (tahmini)',120,3,19,3.3,'creme ole;crème olé;muzlu krema tatlısı']
 ];
 const note='Pişmiş/yenmeye hazır 100 g için yaklaşık değerdir; kuru puding tozu değildir. Marka, süt ve tarife göre değişebilir. Paket etiketini esas al.';
 const foods=rows.map(([id,name,kcal,protein,carbs,fat,aliases])=>{
  const entry={
   id:'dessert-'+id,name,kcal,protein,carbs,fat,
   aliases:aliases.split(';'),kind:'Hazır tatlı',category:'Tatlı',
   source:'Hazır tatlı · yaklaşık (etiketi kontrol et)',verified:false,
   unit:'g',nutritionBasis:'100g',note
  };
  if(!/^dessert-[a-z0-9-]+$/.test(entry.id)||
     ![kcal,protein,carbs,fat].every(v=>Number.isFinite(v)&&v>=0)||
     kcal>1000||protein>100)throw Error('Geçersiz tatlı verisi: '+id);
  return Object.freeze(entry);
 });
 if(new Set(foods.map(f=>f.id)).size!==foods.length)throw Error('Yinelenen hazır tatlı ID');
 root.FormaRotaReadyDesserts=Object.freeze(foods);
})(window);

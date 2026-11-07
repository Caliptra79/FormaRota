/* FormaRota prepared-food catalog, cached offline.
 * 100 g nutrients for named Banvit products are transcribed from manufacturer
 * product nutrition pages (checked 2026-11-07), NOT independently lab tested.
 * Generic convenience foods are clearly MARKED AS ESTIMATES, not any brand's
 * declared label. Packaging/recipes and added oil may change final totals.
 *
 * Manufacturer references:
 * https://www.banvit.com/urunlerimiz/citir-tavuk-parcalari-700-g
 * https://www.banvit.com/urunlerimiz/banvit-pilic-nuget-700-g
 * https://www.banvit.com/urunlerimiz/banvit-pilic-schnitzel-300-g
 * https://www.migros.com.tr/banvit-citir-pilic-kanat-300-g-p-ce232f
 * https://www.banvit.com/urunlerimiz/banvit-citir-pilic-burger-275-g
 * https://www.banvit.com/urunlerimiz/banvit-citir-pilic-pane-275-g
 * https://www.banvit.com/urunlerimiz/tempura-premium-pilic-nuget
 * https://www.banvit.com/urunlerimiz/banvit-pilic-yaprak-doner-200-g
 * https://www.banvit.com/urunlerimiz/banvit-pilic-kofte-300-g
 * https://www.banvit.com/urunlerimiz/banvit-pilic-burger-300-g
 */
(function(root){
 'use strict';
 const branded=[
  // id | name | kcal | protein | carbs | fat | aliases | URL
  ['banvit-citir-parcalari','Banvit Çıtır Tavuk Parçaları (300/700 g)',196,13.7,14.2,9.4,
   'banvit çıtır tavuk;banvit citir tavuk;banvit çıtır;çıtır tavuk parçaları;crispy chicken pieces',
   'https://www.banvit.com/urunlerimiz/citir-tavuk-parcalari-700-g'],
  ['banvit-pilic-nuget','Banvit Piliç Nuget (300/700 g)',270,10,24.3,14.5,
   'banvit nugget;banvit nuget;tavuk nugget;banvit piliç nugget;banvit chicken nuggets',
   'https://www.banvit.com/urunlerimiz/banvit-pilic-nuget-700-g'],
  ['banvit-schnitzel','Banvit Piliç Schnitzel (300/700 g)',266,10,23.5,14.3,
   'banvit şinitzel;banvit schnitzel;banvit şnitzel;pane tavuk şinitzel',
   'https://www.banvit.com/urunlerimiz/banvit-pilic-schnitzel-300-g'],
  ['banvit-citir-kanat','Banvit Çıtır Piliç Kanat (300 g)',228,12.9,12,13.9,
   'banvit çıtır kanat;banvit citir kanat;çıtır piliç kanat;banvit chicken wings',
   'https://www.migros.com.tr/banvit-citir-pilic-kanat-300-g-p-ce232f'],
  ['banvit-citir-burger','Banvit Çıtır Piliç Burger (275 g)',235,10,24.5,10.4,
   'banvit çıtır burger;banvit citir burger;banvit pane burger',
   'https://www.banvit.com/urunlerimiz/banvit-citir-pilic-burger-275-g'],
  ['banvit-citir-pane','Banvit Çıtır Piliç Pane (275 g)',235,10,24.5,10.4,
   'banvit çıtır piliç pane;banvit pane;banvit citir pane',
   'https://www.banvit.com/urunlerimiz/banvit-citir-pilic-pane-275-g'],
  ['banvit-tempura-nuget','Banvit Tempura Premium Piliç Nuget',160,13.5,11.2,5.7,
   'banvit tempura;premium nugget;tempura nuget;tempura premium piliç nuget',
   'https://www.banvit.com/urunlerimiz/tempura-premium-pilic-nuget'],
  ['banvit-yaprak-doner','Banvit Piliç Yaprak Döner (200/500 g)',205,22.4,0.2,12.7,
   'banvit tavuk döner;banvit yaprak döner;banvit piliç döner;hazır tavuk döner',
   'https://www.banvit.com/urunlerimiz/banvit-pilic-yaprak-doner-200-g'],
  ['banvit-pilic-kofte','Banvit Piliç Köfte (300 g)',218,15,4.6,15.2,
   'banvit tavuk köfte;banvit köfte;hazır piliç köfte',
   'https://www.banvit.com/urunlerimiz/banvit-pilic-kofte-300-g'],
  ['banvit-pilic-burger','Banvit Piliç Burger (300 g)',154,11.5,6.1,8.8,
   'banvit piliç burger;banvit tavuk burger;hazır piliç burger',
   'https://www.banvit.com/urunlerimiz/banvit-pilic-burger-300-g']
 ];
 // Broad reference foods, not exact packaged brands: per 100 g prepared food,
 // without optional dips, bread, and extra oil used for deep frying.
 const estimates=[
  ['generic-pane-tavuk','Hazır pane tavuk şeritleri (tahmini)',240,15,21,10,'hazır tavuk şeritleri;chicken strips;tavuk tender;çıtır tavuk strips'],
  ['generic-cordon-bleu','Hazır tavuk cordon bleu (tahmini)',245,14,18,13,'cordon bleu;şarküteri dolgulu pane tavuk;peynirli pane tavuk'],
  ['generic-balik-pane','Hazır pane balık fileto (tahmini)',220,12,21,10,'fish fingers;balık çubuğu;balık pane;hazır pane balık'],
  ['generic-mozzarella-stick','Dondurulmuş mozzarella çubukları (tahmini)',310,14,25,17,'mozzarella sticks;peynir çubuğu;pane peynir'],
  ['generic-sogan-halkasi','Dondurulmuş soğan halkası, pane (tahmini)',265,4,32,13,'onion rings;soğan halkası;hazır soğan halkası'],
  ['generic-patates-dilim','Dondurulmuş baharatlı patates dilimleri, pişmiş (tahmini)',170,2.5,27,6,'patates wedges;elma dilim patates;dondurulmuş patates dilimi'],
  ['generic-hazir-manti','Paketli mantı, yoğurtsuz pişmiş (tahmini)',205,8,31,5.5,'hazır mantı;dondurulmuş mantı;paketli mantı'],
  ['generic-hazir-lazanya','Hazır etli lazanya, ısıtılmış (tahmini)',175,9,16,8,'hazır lazanya;dondurulmuş lazanya;lasagna'],
  ['generic-hazir-kofte','Dondurulmuş hazır dana köfte, pişmiş (tahmini)',245,17,7,16,'dondurulmuş köfte;hazır köfte;paketli köfte'],
  ['generic-sebzeli-nugget','Hazır sebzeli nugget (tahmini)',210,6,24,10,'sebze nugget;vejetaryen nugget;sebzeli nuget']
 ];
 const manufacturerNote='Üreticinin 100 g besin tablosuna dayalıdır; ambalajın güncel etiketini kontrol et. Sade ürün içindir. Eklenen kızartma yağı, sos ve garnitür ayrıca kaydedilmelidir.';
 const estimateNote='Markalı ürünün etiketi değildir: 100 g için yaklaşık hazır yemek referansıdır. Tarif, marka ve pişirme şekliyle değişebilir; ambalajı esas al. Sos ve ekstra yağ ayrıca sayılır.';
 const make=(row,brand)=>{
  const [key,name,kcal,protein,carbs,fat,alias,sourceUrl]=row;
  const food={
   id:'prepared-'+key,name,kcal,protein,carbs,fat,
   aliases:alias.split(';'),unit:'g',nutritionBasis:'100g',
   kind:brand?'Markalı hazır ürün':'Hazır yemek',category:'Hazır yemek',
   source:brand?'Banvit · üretici ürün tablosu (etiketi kontrol et)':'Hazır yemek · tahmini (etiketi kontrol et)',
   verified:false,referenceUrl:brand?sourceUrl:null,
   note:brand?manufacturerNote:estimateNote
  };
  if(!/^prepared-[a-z0-9-]+$/.test(food.id)||!food.aliases.length||
     ![kcal,protein,carbs,fat].every(n=>Number.isFinite(n)&&n>=0&&n<=1000)||
     Math.abs(kcal-(4*protein+4*carbs+9*fat))>35)
   throw Error('Geçersiz hazır yemek besin tablosu: '+key);
  return Object.freeze(food);
 };
 const foods=[...branded.map(row=>make(row,true)),...estimates.map(row=>make(row,false))];
 if(new Set(foods.map(row=>row.id)).size!==foods.length)throw Error('Yinelenen hazır yemek kodu');
 root.FormaRotaPreparedFoods=Object.freeze(foods);
})(window);

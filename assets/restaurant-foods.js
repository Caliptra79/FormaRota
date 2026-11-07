/* FormaRota restaurant library: Doyuyo menu and ingredient-based estimates.
 * All nutrients are per 100 g of food / 100 ml of beverage.
 * Brand-provided 100 g values are transcribed from current order listings.
 * Composite menu totals are calculated estimates, NOT official menu calories.
 * Sources checked 2026-11-07:
 * https://doyuyo.com/menuler/tenders
 * https://tgoyemek.com/restoranlar/384593
 * https://www.eatbetter.app/tr/marka/doyuyo
 */
(function(root){
'use strict';
const listing='https://tgoyemek.com/restoranlar/384593';
const note='100 g için yayımlanan ürün besin değerine dayalıdır. Şubeye ve reçeteye göre değişebilir. Tavuk gramajı açıklamalarda çiğ ağırlıktır; 100 g besin referansını adet gramajıyla çarpmak yaklaşık sonuç verir.';
const rows=[
 // id | short product name | kcal | protein | carbs | fat | assumed g/piece | alternative searches | note
 ['paprika-parmesan','Paprika Parmesan Tenders',282,22.57,14.72,14.77,52,'paprika parmesan;tenders paprika;parmesanlı tavuk;paprika parmesan tenders','Gluten, süt içerir.'],
 ['original','Original Tenders',269,23.15,12.2,14.23,52,'orijinal tenders;original tenders;çıtır tavuk','Gluten içerir.'],
 ['cajun','Cajun Tenders',282,23.68,11.61,15.64,58,'cajun tavuk;cajun tenders;baharatlı tenders','Gluten içerir.'],
 ['spicy','Acılı Tenders',269,23.34,14.52,13.03,52,'acılı tavuk;acı tenders;spicy tenders','Gluten içerir.'],
 ['fusilli','Pesto & Cheddar Soslu Fusilli',246,6.57,35.23,8.7,36,'pesto cheddar makarna;pesto fusilli;cheddar fusilli','Porsiyon açıklamasında 36 g geçer; ölçüm/pişme durumu belirsiz.'],
];
const round=n=>Math.round(n*100)/100;
const make=(id,name,nutrients,grams,aliases,meta={})=>{
 const [kcal,protein,carbs,fat]=nutrients;
 const f={id:'restaurant-doyuyo-'+id,name:'Doyuyo · '+name,
  kcal:round(kcal),protein:round(protein),carbs:round(carbs),fat:round(fat),
  aliases:['Doyuyo '+name,'Doyuyo','Doyuyo menü',...aliases.split(';').filter(Boolean)],
  unit:'g',nutritionBasis:'100g',pieceGrams:grams||undefined,
  kind:'Restoran ürünü',category:'Fast food / Doyuyo',restaurant:'Doyuyo',
  source:meta.estimate?'Doyuyo · tahmini hesap':'Doyuyo · yayımlanmış 100 g tablo',
  referenceUrl:listing,verified:false,
  note:meta.estimate?meta.note:(note+' '+(meta.note||''))};
 if(!/^restaurant-doyuyo-[a-z0-9-]+$/.test(f.id)||f.name.length>160||
  ![kcal,protein,carbs,fat].every(x=>Number.isFinite(x)&&x>=0&&x<=1000))
  throw Error('Geçersiz restoran besini: '+id);
 return Object.freeze(f);
};
const foods=rows.map(([id,name,k,p,c,f,grams,aliases,extra])=>
 make(id,name,[k,p,c,f],grams,aliases,{note:extra}));
/* Sides from published kcal references; macros are sensible approximations
 * where full manufacturer macro detail was not available.
 */
const sides=[
 ['coleslaw','Coleslaw Salata',122,1.3,10,8.6,100,'coleslaw;lahana salatası'],
 ['fries','Baharatlı Patates Kızartması',315,3.4,41,15,95,'patates;baharatlı patates;patates kızartması'],
 ['ketchup','Ketçap',97,1,23,0.2,20,'ketcap;ketçap;sos'],
 ['mayo','Mayonez',376,1,9,37,20,'mayonez;mayo;sos'],
 ['ranch','Ranch Sos',380,1.5,10,37,30,'ranch;gurme sos'],
 ['bbq','BBQ Sos',168,0.5,41,0.5,30,'barbekü sos;bbq'],
 ['honey-mustard','Ballı Hardal Sos',349,1,22,28,30,'ballı hardal;honey mustard'],
 ['sriracha-mayo','Sriracha Mayo Sos',613,1,8,64,30,'sriracha mayo;acı mayonez']
];
for(const [id,name,k,p,c,f,grams,aliases] of sides)
 foods.push(make(id,name,[k,p,c,f],grams,aliases,{estimate:true,
  note:'100 g enerji değeri yayımlanmış bir referanstan, protein/karbonhidrat/yağ yaklaşık tipik sos/tarif değerlerinden alınmıştır. Gerçek porsiyon farklı olabilir.'}));
const sideLookup=new Map(foods.map(f=>[f.id.replace('restaurant-doyuyo-',''),f]));
const macros=['kcal','protein','carbs','fat'];
const fixed=[['coleslaw',100],['fusilli',36],['fries',95],['ketchup',20],['mayo',20]];
/* Menus intentionally exclude variable gourmet sauce and drink.
 * Those must be added separately to avoid claiming false exact calories.
 * 3/4-piece raw-meat weights from branch listings; gram totals approximate.
 */
for(const [id,label,portion] of [['paprika-parmesan','Paprika Parmesan',56],['original','Original',52],['cajun','Cajun',58],['spicy','Acılı',52]]){
 for(const count of [3,4]){
  const parts=[[id,portion*count],...fixed];
  const weight=parts.reduce((sum,[,grams])=>sum+grams,0);
  const totals=macros.map(k=>parts.reduce((sum,[part,grams])=>
   sum+Number(sideLookup.get(part)[k])*grams/100,0));
  const per100=totals.map(total=>100*total/weight);
  const menu=make(id+'-'+count+'lu-menu',label+' Tenders '+count+"'lü Menü (tahmini; içecek ve gurme sos hariç)",per100,weight,
   label+' tenders menü;'+label+' '+count+'lü;'+label+' menu;'+label+' tenders',
   {estimate:true,note:'Tek tam menü (yaklaşık '+weight+' g) için tavuk '+(portion*count)+
    ' g, coleslaw 100 g, pesto-cheddar fusilli 36 g, patates 95 g, ketçap 20 g, mayonez 20 g hesaba katıldı. '+
    'Gurme sos (30 g) ve içecek DAHİL DEĞİL; ayrı ekle. Porsiyon, pişirme ve soslar son kaloriyi önemli ölçüde değiştirir. '+
    'Makroların bir bölümü tahminidir; resmî menü besin değeri değildir.'});
  foods.push(menu);
 }
}
const ids=new Set();
for(const f of foods){if(ids.has(f.id))throw Error('Duplicate restaurant ID');ids.add(f.id)}
root.FormaRotaRestaurantFoods=Object.freeze(foods);
if(typeof module!=='undefined'&&module.exports)module.exports=Object.freeze(foods);
})(typeof window!=='undefined'?window:globalThis);

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
  ...(meta.menu?{portionUnit:'menü'}:{}),
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
  const menu=make(id+'-'+count+'lu-menu',label+' Tenders '+count+"'lü Menü (tahmini)",per100,weight,
   label+' tenders menü;'+label+' '+count+'lü;'+label+' menu;'+label+' tenders',
   {menu:true,estimate:true,note:'Ana menü (yaklaşık '+weight+' g) için tavuk '+(portion*count)+
    ' g, coleslaw 100 g, pesto-cheddar fusilli 36 g, patates 95 g, ketçap 20 g, mayonez 20 g hesaba katıldı. '+
    'Gurme sos (30 g) ve içecek DAHİL DEĞİL; ayrı ekle. Porsiyon, pişirme ve soslar son kaloriyi önemli ölçüde değiştirir. '+
    'Makroların bir bölümü tahminidir; resmî menü besin değeri değildir.'});
  foods.push(menu);
 }
}
/* Whole-menu shortcuts are explicitly per menu, not "adet" or gram entry.
 * Sauce and beverage selections are optional. Never assume the diner's order.
 * Side nutrition for sauces and beverage references are approximate.
 */
const sauces=Object.freeze([
 {id:'none',name:'Gurme sos ekleme',kcal:0,protein:0,carbs:0,fat:0},
 ...['ranch','bbq','honey-mustard','sriracha-mayo'].map(id=>{
  const f=sideLookup.get(id);
  return Object.freeze({id,name:f.name.replace(/^Doyuyo · /,'')+' (30 g, tahmini)',
   kcal:f.kcal*0.3,protein:f.protein*0.3,carbs:f.carbs*0.3,fat:f.fat*0.3});
 })
].map(x=>Object.freeze(x)));
const drinks=Object.freeze([
 {id:'none',name:'İçecek ekleme',kcal:0,protein:0,carbs:0,fat:0},
 {id:'water',name:'Su (330 ml)',kcal:0,protein:0,carbs:0,fat:0},
 {id:'cola',name:'Şekerli kola (250 ml, tahmini)',kcal:105,protein:0,carbs:26.5,fat:0},
 {id:'zero',name:'Şekersiz kola (250 ml, tahmini)',kcal:1,protein:0,carbs:0,fat:0},
 {id:'ayran',name:'Ayran (200 ml, tahmini)',kcal:76,protein:4.2,carbs:5.4,fat:3.8}
].map(x=>Object.freeze(x)));
function withExtras(food,sauceId='none',drinkId='none'){
 if(food?.portionUnit!=='menü'||!Number.isFinite(Number(food.pieceGrams))||Number(food.pieceGrams)<=0)return null;
 const sauce=sauces.find(x=>x.id===sauceId),drink=drinks.find(x=>x.id===drinkId);
 if(!sauce||!drink)return null;
 const updated={...food};
 // Add-ons represent one serving per menu, expressed against its fixed base
 // weight to keep the existing per-100g food log calculations consistent.
 for(const key of macros)updated[key]=round(Number(food[key])+(sauce[key]+drink[key])*100/food.pieceGrams);
 const suffix=[sauce.id!=='none'?sauce.name.replace(/ \(.*$/,''):null,
  drink.id!=='none'?drink.name.replace(/ \(.*$/,''):null].filter(Boolean);
 updated.name=food.name+(suffix.length?' · '+suffix.join(' + '):'');
 updated.note=food.note+(suffix.length?' Seçtiğin sos/içecek de bu tek menü kaydına dahildir.':
  ' Seçili sos ve içecek yok; bu ikisi kalori hesabına eklenmez.');
 return updated;
}
foods.sort((a,b)=>Number(b.portionUnit==='menü')-Number(a.portionUnit==='menü'));
const ids=new Set();
for(const f of foods){if(ids.has(f.id))throw Error('Duplicate restaurant ID');ids.add(f.id)}
root.FormaRotaRestaurantFoods=Object.freeze(foods);
root.FormaRotaRestaurantMenuOptions=Object.freeze({sauces,drinks,withExtras});
if(typeof module!=='undefined'&&module.exports)module.exports=Object.freeze(foods);
})(typeof window!=='undefined'?window:globalThis);

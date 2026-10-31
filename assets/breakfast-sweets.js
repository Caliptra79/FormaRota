/* FormaRota | Pancakes, crepes, waffles and related breakfast sweets.
 * Entries are per 100 g READY TO EAT, NEVER dry batter or one arbitrary piece.
 * Plain entries exclude sauces; named toppings and fillings are INCLUDED
 * in their respective composite recipe estimate. A separate sauce entry
 * should only be logged when it has NOT already been counted in a composite.
 * Baseline references:
 * pancake prepared recipe, USDA SR: https://www.cooks.com/rec/nutrition?nwal=18293
 * waffle plain, USDA FDC 175039: https://whatyoueat.io/foods/175039
 * French toast, USDA FDC 174998: https://whatyoueat.io/foods/174998
 * maple syrup USDA: https://thrivenutrition.app/foods/maple-syrup/
 * All variations are illustrative estimates, not manufacturer-verified labels.
 */
(function(root){
 'use strict';
 const items=[
 {
  "id": "sweet-pankek-sade",
  "name": "Pankek, sade",
  "kcal": 227,
  "protein": 6.4,
  "carbs": 28.3,
  "fat": 9.7,
  "aliases": [
   "pankek",
   "pancake",
   "american pancake"
  ],
  "kind": "Pankek, krep ve waffle",
  "category": "Kahvaltılık tatlı",
  "type": "plain",
  "nutritionBasis": "100g",
  "unit": "g",
  "source": "Yerel tatlı · yaklaşık",
  "verified": false,
  "reference": "https://www.cooks.com/rec/nutrition?nwal=18293",
  "note": "100 g pişmiş sade ürün; sos veya ilave üst malzeme dahil değildir."
 },
 {
  "id": "sweet-pankek-muzlu",
  "name": "Muzlu pankek (tahmini)",
  "kcal": 215,
  "protein": 6,
  "carbs": 32,
  "fat": 7.2,
  "aliases": [
   "muzlu pankek",
   "banana pancake"
  ],
  "kind": "Pankek, krep ve waffle",
  "category": "Kahvaltılık tatlı",
  "type": "mixed",
  "nutritionBasis": "100g",
  "unit": "g",
  "source": "Yerel tatlı · yaklaşık",
  "verified": false,
  "note": "100 g hazırlanmış ürün için tahmini değer; adı geçen malzeme/dolgu/sos bu değere dahildir. Markaya ve tarife göre değişir."
 },
 {
  "id": "sweet-pankek-yulafli",
  "name": "Yulaflı pankek (tahmini)",
  "kcal": 225,
  "protein": 8,
  "carbs": 30,
  "fat": 8,
  "aliases": [
   "yulaf pankek",
   "fit pankek",
   "oat pancake"
  ],
  "kind": "Pankek, krep ve waffle",
  "category": "Kahvaltılık tatlı",
  "type": "mixed",
  "nutritionBasis": "100g",
  "unit": "g",
  "source": "Yerel tatlı · yaklaşık",
  "verified": false,
  "note": "100 g hazırlanmış ürün için tahmini değer; adı geçen malzeme/dolgu/sos bu değere dahildir. Markaya ve tarife göre değişir."
 },
 {
  "id": "sweet-pankek-proteinli",
  "name": "Protein pankek (tahmini)",
  "kcal": 205,
  "protein": 15,
  "carbs": 21,
  "fat": 7,
  "aliases": [
   "protein pankek",
   "proteinli pankek"
  ],
  "kind": "Pankek, krep ve waffle",
  "category": "Kahvaltılık tatlı",
  "type": "mixed",
  "nutritionBasis": "100g",
  "unit": "g",
  "source": "Yerel tatlı · yaklaşık",
  "verified": false,
  "note": "100 g hazırlanmış ürün için tahmini değer; adı geçen malzeme/dolgu/sos bu değere dahildir. Markaya ve tarife göre değişir."
 },
 {
  "id": "sweet-pankek-kakaolu",
  "name": "Kakaolu pankek (tahmini)",
  "kcal": 245,
  "protein": 7,
  "carbs": 30,
  "fat": 11,
  "aliases": [
   "kakaolu pankek",
   "çikolatalı pankek hamuru"
  ],
  "kind": "Pankek, krep ve waffle",
  "category": "Kahvaltılık tatlı",
  "type": "mixed",
  "nutritionBasis": "100g",
  "unit": "g",
  "source": "Yerel tatlı · yaklaşık",
  "verified": false,
  "note": "100 g hazırlanmış ürün için tahmini değer; adı geçen malzeme/dolgu/sos bu değere dahildir. Markaya ve tarife göre değişir."
 },
 {
  "id": "sweet-pankek-damla-cikolata",
  "name": "Damla çikolatalı pankek (tahmini)",
  "kcal": 280,
  "protein": 7,
  "carbs": 34,
  "fat": 13,
  "aliases": [
   "çikolata parçalı pankek",
   "chocolate chip pancake"
  ],
  "kind": "Pankek, krep ve waffle",
  "category": "Kahvaltılık tatlı",
  "type": "mixed",
  "nutritionBasis": "100g",
  "unit": "g",
  "source": "Yerel tatlı · yaklaşık",
  "verified": false,
  "note": "100 g hazırlanmış ürün için tahmini değer; adı geçen malzeme/dolgu/sos bu değere dahildir. Markaya ve tarife göre değişir."
 },
 {
  "id": "sweet-pankek-balli",
  "name": "Ballı pankek (bal dahil, tahmini)",
  "kcal": 285,
  "protein": 6,
  "carbs": 44,
  "fat": 9.5,
  "aliases": [
   "bal soslu pankek",
   "honey pancake"
  ],
  "kind": "Pankek, krep ve waffle",
  "category": "Kahvaltılık tatlı",
  "type": "topped",
  "nutritionBasis": "100g",
  "unit": "g",
  "source": "Yerel tatlı · yaklaşık",
  "verified": false,
  "note": "100 g hazırlanmış ürün için tahmini değer; adı geçen malzeme/dolgu/sos bu değere dahildir. Markaya ve tarife göre değişir."
 },
 {
  "id": "sweet-pankek-cilekli",
  "name": "Çilekli pankek (çilek dahil, tahmini)",
  "kcal": 214,
  "protein": 6,
  "carbs": 30,
  "fat": 8,
  "aliases": [
   "çilekli pankek",
   "strawberry pancake"
  ],
  "kind": "Pankek, krep ve waffle",
  "category": "Kahvaltılık tatlı",
  "type": "topped",
  "nutritionBasis": "100g",
  "unit": "g",
  "source": "Yerel tatlı · yaklaşık",
  "verified": false,
  "note": "100 g hazırlanmış ürün için tahmini değer; adı geçen malzeme/dolgu/sos bu değere dahildir. Markaya ve tarife göre değişir."
 },
 {
  "id": "sweet-krep-sade",
  "name": "Krep, sade (tahmini)",
  "kcal": 218,
  "protein": 7,
  "carbs": 25,
  "fat": 10,
  "aliases": [
   "krep",
   "crepe",
   "sade krep"
  ],
  "kind": "Pankek, krep ve waffle",
  "category": "Kahvaltılık tatlı",
  "type": "plain",
  "nutritionBasis": "100g",
  "unit": "g",
  "source": "Yerel tatlı · yaklaşık",
  "verified": false,
  "note": "100 g pişmiş sade ürün; sos veya ilave üst malzeme dahil değildir."
 },
 {
  "id": "sweet-krep-cikolatali",
  "name": "Çikolatalı krep (dolgu dahil, tahmini)",
  "kcal": 300,
  "protein": 7,
  "carbs": 38,
  "fat": 13.3,
  "aliases": [
   "çikolatalı krep",
   "nutellalı krep",
   "chocolate crepe"
  ],
  "kind": "Pankek, krep ve waffle",
  "category": "Kahvaltılık tatlı",
  "type": "filled",
  "nutritionBasis": "100g",
  "unit": "g",
  "source": "Yerel tatlı · yaklaşık",
  "verified": false,
  "note": "100 g hazırlanmış ürün için tahmini değer; adı geçen malzeme/dolgu/sos bu değere dahildir. Markaya ve tarife göre değişir."
 },
 {
  "id": "sweet-krep-muzlu",
  "name": "Muzlu krep (muz dahil, tahmini)",
  "kcal": 235,
  "protein": 6,
  "carbs": 34,
  "fat": 8.2,
  "aliases": [
   "muzlu krep",
   "banana crepe"
  ],
  "kind": "Pankek, krep ve waffle",
  "category": "Kahvaltılık tatlı",
  "type": "filled",
  "nutritionBasis": "100g",
  "unit": "g",
  "source": "Yerel tatlı · yaklaşık",
  "verified": false,
  "note": "100 g hazırlanmış ürün için tahmini değer; adı geçen malzeme/dolgu/sos bu değere dahildir. Markaya ve tarife göre değişir."
 },
 {
  "id": "sweet-krep-muz-cikolata",
  "name": "Muzlu çikolatalı krep (tahmini)",
  "kcal": 292,
  "protein": 6,
  "carbs": 40,
  "fat": 12,
  "aliases": [
   "muz çikolata krep",
   "muzlu nutellalı krep"
  ],
  "kind": "Pankek, krep ve waffle",
  "category": "Kahvaltılık tatlı",
  "type": "filled",
  "nutritionBasis": "100g",
  "unit": "g",
  "source": "Yerel tatlı · yaklaşık",
  "verified": false,
  "note": "100 g hazırlanmış ürün için tahmini değer; adı geçen malzeme/dolgu/sos bu değere dahildir. Markaya ve tarife göre değişir."
 },
 {
  "id": "sweet-waffle-sade",
  "name": "Waffle, sade",
  "kcal": 291,
  "protein": 7.9,
  "carbs": 32.9,
  "fat": 14.1,
  "aliases": [
   "waffle",
   "vafıl",
   "sade waffle"
  ],
  "kind": "Pankek, krep ve waffle",
  "category": "Kahvaltılık tatlı",
  "type": "plain",
  "nutritionBasis": "100g",
  "unit": "g",
  "source": "Yerel tatlı · yaklaşık",
  "verified": false,
  "reference": "https://whatyoueat.io/foods/175039",
  "note": "100 g pişmiş sade ürün; sos veya ilave üst malzeme dahil değildir."
 },
 {
  "id": "sweet-waffle-cikolatali",
  "name": "Çikolatalı waffle (sos dahil, tahmini)",
  "kcal": 355,
  "protein": 7.5,
  "carbs": 42,
  "fat": 17.5,
  "aliases": [
   "çikolatalı waffle",
   "nutellalı waffle"
  ],
  "kind": "Pankek, krep ve waffle",
  "category": "Kahvaltılık tatlı",
  "type": "topped",
  "nutritionBasis": "100g",
  "unit": "g",
  "source": "Yerel tatlı · yaklaşık",
  "verified": false,
  "note": "100 g hazırlanmış ürün için tahmini değer; adı geçen malzeme/dolgu/sos bu değere dahildir. Markaya ve tarife göre değişir."
 },
 {
  "id": "sweet-waffle-meyveli",
  "name": "Meyveli waffle (meyve dahil, tahmini)",
  "kcal": 295,
  "protein": 7,
  "carbs": 39,
  "fat": 12.3,
  "aliases": [
   "meyveli waffle",
   "çilekli waffle"
  ],
  "kind": "Pankek, krep ve waffle",
  "category": "Kahvaltılık tatlı",
  "type": "topped",
  "nutritionBasis": "100g",
  "unit": "g",
  "source": "Yerel tatlı · yaklaşık",
  "verified": false,
  "note": "100 g hazırlanmış ürün için tahmini değer; adı geçen malzeme/dolgu/sos bu değere dahildir. Markaya ve tarife göre değişir."
 },
 {
  "id": "sweet-waffle-muz-cikolata",
  "name": "Muzlu çikolatalı waffle (tahmini)",
  "kcal": 330,
  "protein": 7,
  "carbs": 41,
  "fat": 15.3,
  "aliases": [
   "muzlu waffle",
   "muz çikolata waffle"
  ],
  "kind": "Pankek, krep ve waffle",
  "category": "Kahvaltılık tatlı",
  "type": "topped",
  "nutritionBasis": "100g",
  "unit": "g",
  "source": "Yerel tatlı · yaklaşık",
  "verified": false,
  "note": "100 g hazırlanmış ürün için tahmini değer; adı geçen malzeme/dolgu/sos bu değere dahildir. Markaya ve tarife göre değişir."
 },
 {
  "id": "sweet-fransiz-tostu",
  "name": "Fransız tostu, sade",
  "kcal": 229,
  "protein": 7.7,
  "carbs": 25,
  "fat": 10.8,
  "aliases": [
   "french toast",
   "yumurtalı tatlı ekmek",
   "fransız tostu"
  ],
  "kind": "Pankek, krep ve waffle",
  "category": "Kahvaltılık tatlı",
  "type": "plain",
  "nutritionBasis": "100g",
  "unit": "g",
  "source": "Yerel tatlı · yaklaşık",
  "verified": false,
  "reference": "https://whatyoueat.io/foods/174998",
  "note": "100 g pişmiş sade ürün; sos veya ilave üst malzeme dahil değildir."
 },
 {
  "id": "sweet-fransiz-tostu-tarcin",
  "name": "Tarçınlı Fransız tostu (tahmini)",
  "kcal": 241,
  "protein": 7.7,
  "carbs": 28,
  "fat": 10.9,
  "aliases": [
   "tarçınlı french toast",
   "tarçınlı ekmek tatlısı"
  ],
  "kind": "Pankek, krep ve waffle",
  "category": "Kahvaltılık tatlı",
  "type": "mixed",
  "nutritionBasis": "100g",
  "unit": "g",
  "source": "Yerel tatlı · yaklaşık",
  "verified": false,
  "note": "100 g hazırlanmış ürün için tahmini değer; adı geçen malzeme/dolgu/sos bu değere dahildir. Markaya ve tarife göre değişir."
 },
 {
  "id": "sweet-fransiz-tostu-cikolata",
  "name": "Çikolatalı Fransız tostu (tahmini)",
  "kcal": 305,
  "protein": 7.7,
  "carbs": 37,
  "fat": 14,
  "aliases": [
   "çikolatalı french toast"
  ],
  "kind": "Pankek, krep ve waffle",
  "category": "Kahvaltılık tatlı",
  "type": "topped",
  "nutritionBasis": "100g",
  "unit": "g",
  "source": "Yerel tatlı · yaklaşık",
  "verified": false,
  "note": "100 g hazırlanmış ürün için tahmini değer; adı geçen malzeme/dolgu/sos bu değere dahildir. Markaya ve tarife göre değişir."
 },
 {
  "id": "sweet-fransiz-tostu-muz",
  "name": "Muzlu Fransız tostu (tahmini)",
  "kcal": 246,
  "protein": 7.7,
  "carbs": 34,
  "fat": 8.8,
  "aliases": [
   "muzlu french toast"
  ],
  "kind": "Pankek, krep ve waffle",
  "category": "Kahvaltılık tatlı",
  "type": "topped",
  "nutritionBasis": "100g",
  "unit": "g",
  "source": "Yerel tatlı · yaklaşık",
  "verified": false,
  "note": "100 g hazırlanmış ürün için tahmini değer; adı geçen malzeme/dolgu/sos bu değere dahildir. Markaya ve tarife göre değişir."
 },
 {
  "id": "sweet-akcaagac-surubu",
  "name": "Akçaağaç şurubu",
  "kcal": 260,
  "protein": 0,
  "carbs": 67,
  "fat": 0.1,
  "aliases": [
   "maple syrup",
   "akçaağaç şurubu",
   "pankek şurubu"
  ],
  "kind": "Pankek, krep ve waffle",
  "category": "Tatlı sosu",
  "type": "topping",
  "nutritionBasis": "100g",
  "unit": "g",
  "source": "Yerel tatlı · yaklaşık",
  "verified": false,
  "reference": "https://thrivenutrition.app/foods/maple-syrup/",
  "note": "100 g sos/krema. Sade pankek veya waffle üzerine ayrıca ekleyebilirsin."
 },
 {
  "id": "sweet-cikolata-sosu",
  "name": "Çikolata sosu (tahmini)",
  "kcal": 275,
  "protein": 2,
  "carbs": 60,
  "fat": 3,
  "aliases": [
   "çikolata sosu",
   "tatlı sosu",
   "waffle sosu"
  ],
  "kind": "Pankek, krep ve waffle",
  "category": "Tatlı sosu",
  "type": "topping",
  "nutritionBasis": "100g",
  "unit": "g",
  "source": "Yerel tatlı · yaklaşık",
  "verified": false,
  "note": "100 g sos/krema. Sade pankek veya waffle üzerine ayrıca ekleyebilirsin."
 },
 {
  "id": "sweet-findik-kremasi",
  "name": "Kakaolu fındık kreması (tahmini)",
  "kcal": 539,
  "protein": 6.3,
  "carbs": 57.5,
  "fat": 30.9,
  "aliases": [
   "fındık kreması",
   "nutella",
   "çikolata kreması"
  ],
  "kind": "Pankek, krep ve waffle",
  "category": "Tatlı sosu",
  "type": "topping",
  "nutritionBasis": "100g",
  "unit": "g",
  "source": "Yerel tatlı · yaklaşık",
  "verified": false,
  "note": "100 g sos/krema. Sade pankek veya waffle üzerine ayrıca ekleyebilirsin."
 }
];
 for(const entry of items){
  if(!/^sweet-[a-z0-9-]+$/.test(entry.id)||
   !['g'].includes(entry.unit)||entry.nutritionBasis!=='100g'||
   !Array.isArray(entry.aliases)||entry.aliases.length===0||
   ![entry.kcal,entry.protein,entry.carbs,entry.fat].every(x=>Number.isFinite(x)&&x>=0&&x<=1000)){
   throw Error('Invalid breakfast sweet: '+entry.id);
  }
  Object.freeze(entry.aliases);Object.freeze(entry);
 }
 if(new Set(items.map(x=>x.id)).size!==items.length)throw Error('Duplicate sweet ID');
 root.FormaRotaBreakfastSweets=Object.freeze(items);
})(window);

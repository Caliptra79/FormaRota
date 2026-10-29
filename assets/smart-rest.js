/* FormaRota / hareket bazlı, kişiselleştirilebilir dinlenme önerileri.
 * IUSCA 2021: çok eklemli hareketler için genellikle >=120 sn,
 * tek eklemli hareketler için yaklaşık 60-90 sn başlangıç süresi.
 * Bunlar otomatik zorunlu sınırlar değil; performansına göre uzatılabilir.
 * https://journal.iusca.org/index.php/Journal/article/download/81/140
 * Uses existing formarota-rest-by-exercise-v1 and kocluk-fitness-config-v1.
 */
(function(root){
 'use strict';
 const RESTS=Object.freeze({
  lat:120,row:120,incline:150,pec:90,lateral:90,rear:90,
  push:90,overhead:90,zottman:90,legpress:180,extension:90,
  legcurl:90,calf:90
 });
 const STORAGE_KEY='formarota-rest-by-exercise-v1';
 const valid=x=>typeof x==='number'&&Number.isFinite(x)&&x>=15&&x<=600;
 function resolve(id,personal,globalSeconds){
  const map=personal&&typeof personal==='object'&&!Array.isArray(personal)?personal:{};
  const own=Number(map[id]);
  if(Object.prototype.hasOwnProperty.call(map,id)&&valid(own))return {seconds:own,source:'personal'};
  // The original global default was 90s. If a user customized it,
  // their explicit preference takes precedence over new suggested defaults.
  const general=Number(globalSeconds);
  if(valid(general)&&general!==90)return {seconds:general,source:'global'};
  return {seconds:RESTS[id]||90,source:'suggested'};
 }
 function get(id,generalSeconds){
  let saved={};
  try{const raw=root.localStorage?.getItem(STORAGE_KEY);saved=raw?JSON.parse(raw):{};}
  catch{}
  return resolve(id,saved,generalSeconds);
 }
 function format(seconds){return Math.floor(seconds/60)+':'+String(seconds%60).padStart(2,'0')}
 root.FormaRotaSmartRest=Object.freeze({RESTS,STORAGE_KEY,resolve,get,format});
})(window);

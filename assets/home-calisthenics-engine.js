/* FormaRota home full-body + calisthenics core; independent of Gym and Solo ABS.
 * Designed as scalable beginner movements; 2 sets to start, then 3 if tolerated.
 * Distinct localStorage keys and explicit per-set records. No attendance inferred.
 */
(function(root){
'use strict';
const MOVES=Object.freeze([
 {id:'incline-pushup',tr:'Eğimli şınav',group:'Göğüs · triceps',kind:'reps',low:8,high:12,
  tool:'Sağlam ve sabit yüksek yüzey',tip:'Ellerini sabit bir yüzeye yerleştir, gövdeni düz tut. Daha alçak yüzeye yalnızca iyi formla geç.'},
 {id:'band-row',tr:'Direnç bandıyla row',group:'Sırt',kind:'reps',low:8,high:12,
  tool:'Uzun loop band',tip:'Omuzları kulaklardan uzak tut, kürek kemiklerini geriye çek.'},
 {id:'band-pulldown',tr:'Direnç bandıyla lat pulldown',group:'Kanatlar',kind:'reps',low:8,high:12,
  tool:'Uzun band + güvenli yüksek ankraj',tip:'Bandı sağlam biçimde sabitle. Ankrajın kopabileceği doğrultuda durma.'},
 {id:'squat',tr:'Kontrollü squat',group:'Ön bacak · kalça',kind:'reps',low:10,high:15,
  tool:'Vücut ağırlığı',tip:'Gerektiğinde sandalyeye otur-kalk varyasyonuyla başla, dizleri rahat hareket aralığında tut.'},
 {id:'band-rdl',tr:'Bantla Romanian deadlift',group:'Arka bacak · kalça',kind:'reps',low:8,high:12,
  tool:'Uzun loop band',tip:'Kalçayı geriye gönder, beli doğal konumda tut, hareketi kalçadan başlat.'},
 {id:'band-shoulder',tr:'Bantla shoulder press',group:'Omuz',kind:'reps',low:8,high:12,
  tool:'Uzun band',tip:'Kaburgaları öne çıkarma; ağrısız hareket aralığında ilerle.'},
 {id:'band-lateral',tr:'Bantla lateral raise',group:'Yan omuz',kind:'reps',low:12,high:15,
  tool:'Hafif band',tip:'Kolları omuz hizasına kadar kontrollü kaldır, ağırlığı savurma.'},
 {id:'band-curl',tr:'Bantla biceps curl',group:'Biceps',kind:'reps',low:10,high:15,
  tool:'Band + sap (isteğe bağlı)',tip:'Dirsekleri gövdene yakın tut, dönüşte bandın çekmesine izin verme.'},
 {id:'band-triceps',tr:'Bantla triceps pushdown',group:'Triceps',kind:'reps',low:10,high:15,
  tool:'Band + güvenli yüksek ankraj',tip:'Dirseklerini sabit tut ve bağlantıyı her sette kontrol et.'},
 {id:'glute-bridge',tr:'Glute bridge',group:'Kalça',kind:'reps',low:10,high:15,
  tool:'Mat',tip:'Kalçayı kontrollü kaldır, beli aşırı çukurlaştırma.'},
 {id:'dead-bug',tr:'Dead bug',group:'Kalistenik core · anti-extension',kind:'reps',low:6,high:10,
  tool:'Mat',tip:'Her iki taraf toplam 12–20 tekrar. Karşı kol-bacak uzarken beli kontrollü tut; küçük hareket aralığıyla başla.'},
 {id:'pallof-press',tr:'Bantla Pallof press',group:'Kalistenik core · anti-rotation',kind:'reps',low:8,high:12,
  tool:'Hafif band + güvenli göğüs hizası ankraj',tip:'Her iki tarafı eşit çalış. Gövdeni döndürmeden bandı öne uzat.'},
 {id:'tuck-hollow',tr:'Dizler bükülü hollow hold',group:'Kalistenik core · statik',kind:'seconds',low:10,high:25,
  tool:'Mat',tip:'Dizler bükülü kalsın, belini yerden koparmadan 10–25 sn tut. Bel ağrısı veya form kaybında dur.'}
].map(x=>Object.freeze(x)));
const TYPES=new Set(MOVES.map(x=>x.id));
const iso=s=>typeof s==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(s)&&!Number.isNaN(Date.parse(s+'T12:00:00Z'));
const value=n=>n!==null&&n!==undefined&&String(n).trim()!==''&&Number.isInteger(Number(n))?Number(n):null;
function validSet(move,row){
 if(!move||!row||row.done!==true)return false;
 const n=value(move.kind==='seconds'?row.seconds:row.reps);
 return n!==null&&n>=1&&n<=(move.kind==='seconds'?120:150);
}
function create(date,id,sets=2){
 if(!iso(date)||typeof id!=='string'||!id||![2,3].includes(sets))throw Error('Geçersiz ev antrenmanı');
 return {id,date,program:'home-calisthenics-v1',status:'running',startedAt:new Date().toISOString(),
  targetSets:sets,items:Object.fromEntries(MOVES.map(x=>[x.id,Array(sets).fill(null)]))};
}
function count(row){return MOVES.reduce((n,m)=>n+(Array.isArray(row?.items?.[m.id])?row.items[m.id].filter(x=>validSet(m,x)).length:0),0);}
function complete(row){return row&&[2,3].includes(row.targetSets)&&MOVES.every(m=>Array.isArray(row.items?.[m.id])&&row.items[m.id].length===row.targetSets&&row.items[m.id].every(x=>validSet(m,x)));}
function finished(row){return row?.status==='finished'&&iso(row.date)&&complete(row);}
function validateBackup(obj){
 if(!obj||typeof obj!=='object'||Array.isArray(obj))return false;
 if(obj.current!==undefined&&obj.current!==null&&(!obj.current||typeof obj.current!=='object'||Array.isArray(obj.current)))return false;
 if(obj.history!==undefined&&(!Array.isArray(obj.history)||obj.history.length>10000))return false;
 const records=[...(obj.history||[]),...(obj.current?[obj.current]:[])];
 return records.every(r=>r&&iso(r.date)&&typeof r.id==='string'&&r.id.length>0&&r.id.length<257&&
  r.program==='home-calisthenics-v1'&&['running','finished','stopped'].includes(r.status)&&[2,3].includes(r.targetSets)&&
  r.items&&typeof r.items==='object'&&!Array.isArray(r.items)&&Object.keys(r.items).length===TYPES.size&&
  Object.keys(r.items).every(k=>TYPES.has(k))&&MOVES.every(m=>Array.isArray(r.items[m.id])&&r.items[m.id].length===r.targetSets&&
   r.items[m.id].every(x=>x===null||(typeof x==='object'&&!Array.isArray(x)&&validSet(m,x))))&&
  (r.status!=='finished'||complete(r)));
}
const api=Object.freeze({MOVES,validSet,create,count,complete,finished,validateBackup});
if(typeof module!=='undefined'&&module.exports)module.exports=api;
root.FormaRotaHomeEngine=api;
})(typeof window!=='undefined'?window:globalThis);

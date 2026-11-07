/* FormaRota / James Grage kaynakli bant antrenmani: ayrik, offline, acik set kayitli.
 * Teknik notlar Undersun kaynaklarindan uyarlanmis ozgun Turkce ozetlerdir;
 * birebir video altyazisi veya James Grage tarafindan onayli program degildir.
 */
(function(root){
'use strict';
const GUIDE='https://www.undersunfitness.com/blog/awesome-15-minute-resistance-bands-workout';
const PROGRESS='https://www.undersunfitness.com/blog/resistance-bands-when-and-how-to-increase-resistance';
const VIDEO='https://www.youtube.com/watch?v=W3t7r5_MGUw';
const GRAGE_INTERVIEW='https://fithub.com.tr/grage-makinelere-karsi/';
const BAND_LEVELS=Object.freeze(['none','10','20','30','40']);
const GRIPS=Object.freeze(['relaxed','normal','short']);
const FORMS=Object.freeze(['good','unsure','poor']);
const move=(id,tr,group,tip,mistake,source=GUIDE,band='10',low=8,high=12)=>Object.freeze({
 id,tr,group,tip,mistake,source,band,low,high
});
const MOVES=Object.freeze([
 move('band-squat','Bantla squat','Bacak · kalça','Bandin ustune saglam bas, kalcayi kontrollu geriye gonder ve tum ayagi yerde tut.','Dizleri ice dusurme, belini yuvarlama ve kalkarken bandin seni yana cekmesine izin verme.',VIDEO+'&t=57s'),
 move('bent-row','Bent-over row','Sirt','Kalca menteşesiyle one egil, govdeyi sabit tut ve dirsekleri kalcaya dogru cek.','Belden silkelenme; omuzlari kulaklara cekme veya bandi birakip geri sektirme.',VIDEO+'&t=455s'),
 move('wrap-chest','Wraparound chest press','Göğüs','Bandı sırtın arkasından geçir, omuzları dengeli tut; kolları kontrollü öne it.','Omuzları öne fırlatma, bandı koltuk altından kaydırma veya beli aşırı çukurlaştırma.','https://torokhtiy.com/blogs/guides/resistance-band-chest-exercises'),
 move('shoulder-press','Standing band shoulder press','Omuz','Banda saglam bas, karin bolgesini siki tut ve elleri kontrollu yukariya it.','Belini fazla cukurlastirma, kaburgalari ileri firlatma.',VIDEO+'&t=170s'),
 move('biceps-curl','Standing band biceps curl','Biceps','Dirsekler govde yaninda; kaldiris ve donusu esit kontrollu yap.','Govdeyi geriye savurarak kaldirma; donuste bandi aniden birakma.',VIDEO+'&t=340s'),
 move('overhead-triceps','Overhead triceps extension','Triceps','Dirsekler sabit, bant gerginligi surekli olacak sekilde yavas ac-kapat.','Dirsekleri yanlara savurma, boynu zorlayacak baglanti kurma.',VIDEO+'&t=619s'),
 move('calf-raise','Band calf raise','Baldır','Ayağın üzerine dengeli yüksel; tepede kısa dur ve yavaş in.','Yaylanma ve bilekleri içeri/dışarı devirme.',GRAGE_INTERVIEW,'10',10,15),
 move('band-crunch','Crunch – Karın (bantsız)','Karın','Bant kullanmadan kısa ve kontrollü bir karın sıkıştırması yap; boynu rahat tut. James’in videosundaki core bitiriş bölümünü genel referans olarak izle.','Boynunu çekerek kaldırma, belini aniden zorlayarak sallanma.',VIDEO+'&t=843s','none',10,15),
 move('front-lunge','Bantla front lunge','Bacak · kalça','Küçük ve dengeli adımla başla; öndeki ayağın tümünü yerde tut.','Öndeki dizi içe kaçırma, hızlı inip dengenin bozulmasına izin verme.',GRAGE_INTERVIEW),
 move('one-arm-row','Single-arm band row','Sirt','Bant sabitken dirsegi kalcaya dogru cek; iki tarafi esit calis.','Govdeyi cekis yonune dondurme veya omuzu yukariya sikistirma.',GUIDE),
 move('band-rdl','Bantla Romanian deadlift','Arka bacak · kalça','Bandın ortasına bas, dizleri hafif bük, kalçayı geriye gönder; sırt nötr kalırken kontrollü doğrul.','Hareketi squat gibi yapma, beli yuvarlama veya kalkışın sonunda geriye yaslanma.','https://www.stridefitapp.com/exercises/band-romanian-deadlift'),
 move('pallof','Pallof press','Core · denge','Bandi gogus hizasinda saglam sabitle, iki elinle ileri uzat; iki yonde de calis.','Govdenin ankraja dogru donmesine izin verme.',GUIDE,'10',8,12),
 move('staggered-curl','Staggered-stance curl','Biceps','Bir ayak hafif önde; sabit duruşla dirsekleri yerinde tut.','Kalça ve sırtı sallayarak bandı çekme.',GRAGE_INTERVIEW)
]);
const IDS=new Map(MOVES.map(m=>[m.id,m]));
const PLANS=Object.freeze({
 A:Object.freeze(['band-squat','bent-row','wrap-chest','shoulder-press','biceps-curl','overhead-triceps','calf-raise','band-crunch']),
 B:Object.freeze(['front-lunge','band-rdl','one-arm-row','wrap-chest','shoulder-press','staggered-curl','overhead-triceps','band-crunch'])
});
const iso=s=>typeof s==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(s)&&!Number.isNaN(Date.parse(s+'T12:00:00Z'));
const number=x=>x!==null&&x!==undefined&&String(x).trim()!==''&&Number.isInteger(Number(x))?Number(x):null;
function validSet(m,s){
 if(!m||!s||s.done!==true)return false;
 const reps=number(s.reps),rir=number(s.rir);
 return reps!==null&&reps>=1&&reps<=60&&rir!==null&&rir>=0&&rir<=5&&
  BAND_LEVELS.includes(s.band)&&GRIPS.includes(s.grip)&&FORMS.includes(s.form)&&
  (s.band!=='none'||m.band==='none');
}
function movesOf(s){return PLANS[s?.variant]?.map(id=>IDS.get(id))||[];}
function count(s){return movesOf(s).reduce((n,m)=>n+(Array.isArray(s?.items?.[m.id])?s.items[m.id].filter(x=>validSet(m,x)).length:0),0);}
function complete(s){
 return s&&[2,3].includes(s.targetSets)&&movesOf(s).length>0&&
  movesOf(s).every(m=>Array.isArray(s.items?.[m.id])&&s.items[m.id].length===s.targetSets&&
   s.items[m.id].every(x=>validSet(m,x)));
}
function finished(s){return s?.status==='finished'&&iso(s.date)&&complete(s);}
function list(h){return Array.isArray(h)?h.filter(finished).slice().sort((a,b)=>String(a.endedAt||a.date).localeCompare(String(b.endedAt||b.date))):[];}
function stage(h){
 const a=list(h),clean=a.filter(s=>movesOf(s).every(m=>s.items[m.id].every(x=>x.form==='good'&&x.rir>=1))).length;
 return a.length>=30&&clean>=18?4:a.length>=12&&clean>=6?3:a.length>=4?2:1;
}
function create(date,history=[]){
 if(!iso(date))throw Error('Gecersiz antrenman tarihi');
 const a=list(history),variant=a.length%2?'B':'A',targetSets=a.length>=4?3:2;
 return {id:'band-'+date+'-'+Date.now().toString(36),date,program:'james-band-v1',
  variant,stage:stage(history),targetSets,status:'running',startedAt:new Date().toISOString(),
  items:Object.fromEntries(PLANS[variant].map(id=>[id,Array(targetSets).fill(null)]))};
}
function recommend(id,h){
 const m=IDS.get(id);if(!m)return null;
 const records=list(h).filter(s=>Array.isArray(s.items[id])).slice(-2);
 const last=records.at(-1),sets=last?.items[id]||[];
 const safe=sets.length===last?.targetSets&&sets.every(x=>validSet(m,x));
 const band=safe?sets.at(-1).band:m.band;
 const grip=safe?sets.at(-1).grip:'normal';
 const good=safe&&sets.every(x=>x.form==='good'&&x.rir>=2);
 const achieved=good&&sets.every(x=>x.reps>=m.high);
 const cleanTwice=achieved&&records.length===2&&records.every(s=>
  s.items[id]?.length===s.targetSets&&s.items[id].every(x=>
   validSet(m,x)&&x.band===band&&x.form==='good'&&x.rir>=3&&x.reps>=m.high));
 const nextBand=BAND_LEVELS[BAND_LEVELS.indexOf(band)+1];
 let aim=m.low;
 if(safe)aim=Math.max(m.low,Math.min(m.high,Math.min(...sets.map(x=>x.reps))+(good&&!achieved?1:0)));
 let advice='Ilk seans: hafif gerilimle dene. Sonunda 2–3 temiz tekrar gucun kalsin.';
 if(last&&!good)advice='Form veya efor uygun degildi: ayni bandi koru, gerekirse bandi daha uzun tutup gerilimi azalt.';
 else if(good&&!achieved)advice='Ayni bant ve tutusla once tum setlerde ust tekrar sinirina ulas.';
 else if(achieved&&!cleanTwice)advice='Ust sinira ulastin. Bir temiz seans daha tekrar ederek dogrula.';
 else if(cleanTwice)advice=band==='none'?'Tekrarlari daha kontrollu yap; daha zor varyasyona ancak hazir olunca gec.':
  'Ayni bantta tutusu kademeli kisaltabilirsin. '+(nextBand?'Daha sert '+nextBand+' kg bandi ancak kisa deneme setinde form korunuyorsa sec.':'40 kg bandin ustune otomatik gecis yok.');
 return {band,grip,aim,advice,previous:last?last.date+' · '+sets.map(x=>x.reps).join('/')+' tekrar':null,canTryBand:cleanTwice&&nextBand?nextBand:null};
}
function validateBackup(data){
 if(!data||typeof data!=='object'||Array.isArray(data))return false;
 if(data.history!==undefined&&(!Array.isArray(data.history)||data.history.length>10000))return false;
 if(data.current!==undefined&&data.current!==null&&(!data.current||typeof data.current!=='object'||Array.isArray(data.current)))return false;
 return [...(data.history||[]),...(data.current?[data.current]:[])].every(s=>
  s&&s.program==='james-band-v1'&&iso(s.date)&&typeof s.id==='string'&&s.id.length<128&&
  ['A','B'].includes(s.variant)&&[2,3].includes(s.targetSets)&&
  ['running','finished','stopped'].includes(s.status)&&Number.isInteger(s.stage)&&s.stage>=1&&s.stage<=4&&
  s.items&&typeof s.items==='object'&&!Array.isArray(s.items)&&
  Object.keys(s.items).length===PLANS[s.variant].length&&
  Object.keys(s.items).every(k=>PLANS[s.variant].includes(k))&&
  movesOf(s).every(m=>Array.isArray(s.items[m.id])&&s.items[m.id].length===s.targetSets&&
   s.items[m.id].every(x=>x===null||validSet(m,x)))&&
  (s.status!=='finished'||complete(s)));
}
const api=Object.freeze({MOVES,PLANS,BAND_LEVELS,GRIPS,FORMS,GUIDE,PROGRESS,validSet,movesOf,count,complete,finished,stage,create,recommend,validateBackup});
if(typeof module!=='undefined'&&module.exports)module.exports=api;
root.FormaRotaBandEngine=api;
})(typeof window!=='undefined'?window:globalThis);

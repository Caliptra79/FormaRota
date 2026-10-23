/* FormaRota coach: distinct-day comparisons and proportional steps. Read-only for records. */
(function(global){
'use strict';
const safeArray=x=>Array.isArray(x)?x:[];
const number=x=>Number.isFinite(Number(x))?Number(x):0;
const validDate=x=>typeof x==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(x);
const round=x=>Math.round(x*10)/10;
const FULL_MOVES=['lat','row','incline','pec','lateral','rear','push','overhead','zottman','legpress','extension','legcurl','calf'];
const FRESH_DAYS=28;
// A precautionary coaching threshold; not a physiological or equipment-specific limit.
const MAX_STEP_SHARE=0.10;
function actualDate(value){
 if(!validDate(value))return null;
 const d=new Date(value+'T12:00:00');
 return !Number.isNaN(d.getTime())&&d.toISOString().slice(0,10)===value?d:null;
}
function daysBetween(from,to){
 const a=actualDate(from),b=actualDate(to);
 return a&&b?Math.round((b.getTime()-a.getTime())/86400000):NaN;
}
function todayISO(){
 const d=new Date();
 return [d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-');
}
function isValidSet(x){
 if(!x||x.done!==true)return false;
 if(x.weight==null||String(x.weight).trim()===''||x.reps==null||String(x.reps).trim()==='')return false;
 const weight=Number(x.weight),reps=Number(x.reps);
 return Number.isFinite(weight)&&weight>=0&&weight<=1500&&Number.isInteger(reps)&&reps>=1&&reps<=100;
}
function countedSets(session){
 return Object.values(session?.items||{}).reduce((sum,items)=>sum+safeArray(items).filter(x=>x?.done===true).length,0);
}
function validSets(session){
 return Object.values(session?.items||{}).reduce((sum,items)=>sum+safeArray(items).filter(isValidSet).length,0);
}
function fullWorkout(session){
 return session?.status==='finished'&&FULL_MOVES.every(id=>{
  const sets=session.items?.[id];
  return Array.isArray(sets)&&sets.length===3&&sets.every(isValidSet);
 });
}
function setBrief(entry){return entry?entry.sets.map(s=>labelKg(s.kg)+' × '+s.reps).join(' / '):null;}

const labelKg=x=>round(x).toLocaleString('tr-TR',{maximumFractionDigits:1})+' kg';
function range(repString){
 const matches=String(repString||'').match(/\d+/g)||[];
 return {min:Number(matches[0]||8),max:Number(matches[1]||matches[0]||12)};
}
function chosenVariant(move,variants){
 const arr=safeArray(move.options);
 const idx=Number(variants?.[move.id]||0);
 return arr[idx]?.name||move.name;
}
function records(history,move,variant){
 const list=[];
 safeArray(history).forEach((session,index)=>{
  if(!['finished','stopped'].includes(session?.status)||!actualDate(session.date))return;
  const raw=safeArray(session.items?.[move.id]);
  const attempted=raw.filter(x=>x?.done===true&&(typeof x.name==='string'&&x.name?x.name:move.name)===variant);
  if(!attempted.length)return; // Never judge a skipped exercise as a failed attempt.
  const correct=attempted.filter(isValidSet);
  list.push({
   date:session.date,
   sortKey:session.date+'T'+String(session.endedAt||session.startedAt||'').slice(11,23)+'-'+String(index).padStart(6,'0'),
   sets:correct.map(x=>({kg:Number(x.weight),reps:Number(x.reps)})),
   full:session.status==='finished'&&raw.length===3&&attempted.length===3&&correct.length===3,
   invalid:correct.length!==attempted.length,
   sessionStatus:session.status,variant
  });
 });
 return list.sort((a,b)=>a.sortKey.localeCompare(b.sortKey));
}
function assess(move,variant,history,increment,asOfDate){
 const asOf=actualDate(asOfDate)?asOfDate:todayISO();
 const all=records(history,move,variant).filter(x=>x.date<=asOf);
 const complete=all.filter(x=>x.full);
 // An exercise done twice on the same day is one independent training-day observation.
 // Keep the last completed attempt from each distinct day for progression comparisons.
 const perDay=[];
 for(const entry of complete){
  if(perDay.length&&perDay[perDay.length-1].date===entry.date)perDay[perDay.length-1]=entry;
  else perDay.push(entry);
 }
 const last=perDay.at(-1),prior=perDay.at(-2),latest=all.at(-1);
 const reps=range(move.reps);
 const result={moveId:move.id,variant,completed:perDay.length,fullSessions:complete.length,records:all.length,range:reps,
  lastWeight:last?Math.max(...last.sets.map(x=>x.kg)):null,lastDate:last?.date||null,
  lastReps:last?.sets.map(x=>x.reps)||[],direction:'unknown',status:'initial',short:'',detail:'',
  volume:null,asOfDate:asOf,freshnessDays:FRESH_DAYS,maxStepShare:MAX_STEP_SHARE,
  basis:{previous:prior?{date:prior.date,sets:prior.sets.map(x=>({...x}))}:null,
         latest:last?{date:last.date,sets:last.sets.map(x=>({...x}))}:null},
  evidence:'Kayıt henüz yeterli değil'};
 if(latest)result.volume=round(latest.sets.reduce((sum,x)=>sum+x.kg*x.reps,0));
 if(latest?.invalid){
  result.status='invalid';result.short='Eksik veya geçersiz set verisi var; ağırlık artışı önerilmiyor.';
  result.detail='Son ilgili hareketteki kilogram/tekrar kayıtlarından biri boş veya geçersiz. Eski kayıt korunur; düzeltip yeni geçerli seans oluştur.';
  result.evidence='Veri doğrulanamadı';return result;
 }
 if(!last){
  result.short='Karşılaştırma için önce 3 geçerli set tamamla.';
  result.detail='Henüz aynı hareket alternatifinde tamamlanmış 3 geçerli set içeren antrenman yok.';
  return result;
 }
 if(latest&&!latest.full){
  result.status='caution';result.short='Son ilgili hareket denemesi yarım kaldı; ağırlık artışını ertele.';
  result.detail='Son ilgili hareketin setleri tamamlanmadı. Bu harekette yeni tam seans kaydetmeden artış önerilmiyor.';
  result.evidence='Son ilgili deneme tamamlanmadı';return result;
 }
 const age=daysBetween(last.date,asOf);
 if(age>FRESH_DAYS){
  result.status='reassess';result.short='Son kayıt eski; önce çalışma ağırlığını güncel bir seansta değerlendir.';
  result.detail='Son tamamlanmış ilgili hareket kaydı '+age+' gün önce. '+FRESH_DAYS+' günden eski veriyle ağırlık artışı önerilmez.';
  result.evidence='Son kayıt '+age+' gün önce';return result;
 }
 if(!prior){
  result.status='collect';result.short='Ağırlık önerisi için bir tam seans daha kaydet.';
  result.detail='Aynı harekette en az iki karşılaştırılabilir tam seans gerekir.';
  result.evidence=perDay.length+' ayrı günde tamamlanmış hareket kaydı';return result;
 }
 const gap=daysBetween(prior.date,last.date);
 if(gap>FRESH_DAYS){
  result.status='reassess';result.short='İki karşılaştırma arasında uzun ara var; önce performansı yeniden doğrula.';
  result.detail='Karşılaştırılan seanslar arasında '+gap+' gün var. Artış için aralarında en fazla '+FRESH_DAYS+' gün olan iki güncel tam seans gerekli.';
  result.evidence=gap+' günlük seans aralığı';return result;
 }
 const a=prior.sets,b=last.sets;
 const sameInSession=sets=>sets.every(x=>Math.abs(x.kg-sets[0].kg)<0.0001);
 const sameLoad=sameInSession(a)&&sameInSession(b)&&Math.abs(a[0].kg-b[0].kg)<0.0001;
 const allMax=[...a,...b].every(x=>x.reps>=reps.max);
 const lastBelow=b.some(x=>x.reps<reps.min);
 const vA=a.reduce((n,x)=>n+x.kg*x.reps,0),vB=b.reduce((n,x)=>n+x.kg*x.reps,0);
 result.direction=vB>vA+0.1?'up':vB<vA-0.1?'down':'flat';
 result.evidence='İki güncel ve karşılaştırılabilir seans';
 if(lastBelow){
  result.status='hold';result.short='Tekrar alt sınırına ulaşmadan ağırlık artırma.';
  result.detail='Son tam seansta en az bir set '+reps.min+' tekrarın altında. Öncelik tekrar ve teknik tutarlılığı.';
 }else if(move.id==='calf'&&a[0]?.kg===0&&b[0]?.kg===0){
  result.status='bodyweight';result.short='Tekrarlarını ve hareket kaliteni takip et.';
  result.detail='Vücut ağırlığı calf raise için kilogram artışı otomatik önerilmez.';
 }else if(sameLoad&&allMax&&a[0].kg>0){
  const step=[1,2.5,5].includes(Number(increment))?Number(increment):2.5;
  const percent=round(step/a[0].kg*100);
  result.proposedIncrement=step;
  result.proposedPercent=percent;
  if(step/a[0].kg>MAX_STEP_SHARE+0.0000001){
   result.status='step_large';
   result.short=labelKg(a[0].kg)+' için '+labelKg(step)+' artış fazla büyük ('+'%'+percent+'); şimdilik aynı yükte devam et.';
   result.detail='Seçili artış, mevcut çalışma yükünün %'+percent+' kadarına denk geliyor. Koçun temkinli %10 eşiğini aşıyor. Ekipmanda daha küçük artış mümkünse ayardan seç; değilse aynı ağırlıkta kontrollü tekrarları sürdür.';
   result.evidence='Üst tekrar hedefi tamam; seçilen ağırlık kademesi büyük';
  }else{
   result.status='increase';result.short=labelKg(a[0].kg)+' → '+labelKg(a[0].kg+step)+' artışını değerlendirebilirsin.';
   result.detail='Aynı yükle iki farklı ve güncel antrenman gününde tüm setler üst tekrar sınırında veya üzerinde. Artış yaklaşık %'+percent+'. Ekipmandaki kademe, ağrı, hareket formu ve gerçek zorlanma ayrıca değerlendirilmelidir.';
  }
 }else{
  result.status='hold';result.short='Aynı çalışma ağırlığında kontrollü tekrarları sürdür.';
  result.detail=a[0].kg===0?'Makinede 0 kg görünüyor. Gerçek çalışma yükü bilinmediğinden artış hesaplanmaz.':sameLoad?'Tüm setler iki seansta da üst tekrar sınırına henüz ulaşmadı.':'Setlerdeki kilogramlar karşılaştırılabilir değil; sabit yükle yeni kayıt oluştur.';
 }
 return result;
}
function weekStart(date){
 const d=new Date(date+'T12:00:00');d.setDate(d.getDate()-(d.getDay()+6)%7);
 return [d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-');
}
function shift(date,offset){
 const d=new Date(date+'T12:00:00');d.setDate(d.getDate()+offset);
 return [d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-');
}
function weekly(history,weekDate,frequency,selected){
 const start=weekStart(weekDate),days=Array.from({length:7},(_,i)=>shift(start,i));
 const sessions=safeArray(history).filter(x=>['finished','stopped'].includes(x?.status)&&days.includes(x.date));
 const completed=sessions.filter(fullWorkout),partial=sessions.filter(x=>!fullWorkout(x));
 const unique=new Set(completed.map(x=>x.date));
 const perDay=Object.fromEntries(days.map(d=>[d,completed.filter(x=>x.date===d).length]));
 const attended=Object.fromEntries(days.map(d=>[d,sessions.filter(x=>x.date===d).length]));
 const target=Number(frequency)===3?3:2;
 const daysChosen=[...new Set(safeArray(selected).filter(d=>days.includes(d)&&d!==days[2]))];
 const planReady=daysChosen.length===target;
 const suggested=(target===3?[0,3,5]:[0,4]).map(i=>days[i]);
 return {start,days,finished:unique.size,fullSessions:completed.length,partial:partial.length,
  totalSessions:sessions.length,sets:sessions.reduce((sum,x)=>sum+countedSets(x),0),
  validSets:sessions.reduce((sum,x)=>sum+validSets(x),0),target,
  planned:daysChosen.length?daysChosen:suggested,
  custom:daysChosen.length>0,planReady,plannedCount:daysChosen.length,perDay,attended};
}
function reschedule(w,todayDate){
 if(!w||!w.planReady||!validDate(todayDate)||!w.days.includes(todayDate))return {missed:[],replacement:null};
 const missed=w.planned.filter(date=>date<todayDate&&!w.attended?.[date]);
 if(!missed.length)return {missed:[],replacement:null};
 const used=[...w.planned.filter(date=>date>=todayDate),...Object.keys(w.attended||w.perDay).filter(d=>(w.attended||w.perDay)[d]>0),w.days[2]];
 const candidate=w.days.find(date=>{
  if(date<todayDate||date===w.days[2]||w.planned.includes(date)||w.attended?.[date])return false;
  const t=new Date(date+'T12:00:00').getTime();
  return used.every(other=>Math.abs(t-new Date(other+'T12:00:00').getTime())>=2*86400000);
 });
 return {missed,replacement:candidate||null};
}
function analysis(move,variant,history,increment){
 const assessment=assess(move,variant,history,increment);
 // Use the same last two distinct training days as the coach's progression evidence.
 const prev=assessment.basis?.previous,last=assessment.basis?.latest;
 const total=last?last.sets.reduce((sum,x)=>sum+x.kg*x.reps,0):null;
 const prior=prev?prev.sets.reduce((sum,x)=>sum+x.kg*x.reps,0):null;
 const change=total!==null&&prior!==null?round(total-prior):null;
 return {...assessment,volume:total===null?null:round(total),volumeChange:change};
}
function report(history,moves,weekDate,frequency,variants,increment,selected){
 const w=weekly(history,weekDate,frequency,selected),messages=[];
 if(!w.finished){
  messages.push(w.partial?'Bu hafta '+w.partial+' eksik/yarım seans kaydedildi; tam 39 setlik Full Body yok.':'Bu hafta tamamlanmış Full Body kaydı yok.');
 }else if(w.finished<w.target)messages.push(w.finished+'/'+w.target+' farklı günde tam Full Body kaydı var.');
 else messages.push(w.target+' günlük Full Body hedefi karşılandı.');
 if(w.fullSessions>w.finished)messages.push('Aynı güne ait '+(w.fullSessions-w.finished)+' ek tam seans, haftalık gün hedefini artırmaz.');
 if(w.partial&&w.finished)messages.push(w.partial+' eksik/yarım seans ayrıca kaydedildi.');
 const data=safeArray(history).filter(x=>validDate(x?.date)&&x.date<=w.days[6]);
 const thisWeek=data.filter(x=>['finished','stopped'].includes(x?.status)&&w.days.includes(x.date));
 const assessments=[];
 if(w.finished){
  for(const move of safeArray(moves)){
   const lastPerformed=thisWeek.flatMap(s=>safeArray(s.items?.[move.id])
    .filter(x=>x?.done===true).map(x=>({date:s.date,name:x.name||move.name})))
    .sort((a,b)=>a.date.localeCompare(b.date)).at(-1);
   if(!lastPerformed)continue;
   assessments.push(assess(move,lastPerformed.name,data,increment,w.days[6]));
  }
 }
 const caution=assessments.find(x=>['invalid','caution','reassess','step_large'].includes(x.status));
 const hold=assessments.find(x=>x.status==='hold'&&x.detail.includes('alt sınır'));
 const increase=assessments.find(x=>x.status==='increase');
 if(caution)messages.push(caution.variant+': '+caution.short);
 else if(hold)messages.push(hold.variant+': '+hold.short);
 else if(increase)messages.push(increase.variant+': '+increase.short);
 if(messages.length<3&&w.totalSessions)messages.push('Bu hafta '+w.sets+' işaretlenmiş set kaydettin; '+w.validSets+' setin sayısal verisi geçerli.');
 return {...w,messages:messages.slice(0,3)};
}
global.FormaRotaCoachEngine={range,chosenVariant,records,assess,analysis,weekly,reschedule,report,weekStart,shift,labelKg,fullWorkout,validSets,isValidSet,daysBetween,FRESH_DAYS,MAX_STEP_SHARE};
})(window);

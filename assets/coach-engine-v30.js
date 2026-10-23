/* FormaRota v30 · local, explainable training coach. No existing data is mutated. */
(function(global){
'use strict';
const safeArray=x=>Array.isArray(x)?x:[];
const number=x=>Number.isFinite(Number(x))?Number(x):0;
const validDate=x=>typeof x==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(x);
const round=x=>Math.round(x*10)/10;
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
  if(session?.status!=='finished'||!validDate(session.date))return;
  const raw=safeArray(session.items?.[move.id]);
  const done=raw.filter(x=>x?.done&&Number.isFinite(Number(x.reps))&&Number(x.reps)>0&&Number.isFinite(Number(x.weight))&&Number(x.weight)>=0);
  const matching=done.filter(x=>(typeof x.name==='string'&&x.name?x.name:move.name)===variant);
  if(!matching.length)return;
  list.push({
   date:session.date,sortKey:String(session.endedAt||session.startedAt||session.date)+'-'+String(index).padStart(6,'0'),
   sets:matching.map(s=>({kg:Number(s.weight),reps:Number(s.reps)})),
   full:matching.length===3&&raw.length>=3&&raw.every(x=>x?.done),
   variant
  });
 });
 return list.sort((a,b)=>a.sortKey.localeCompare(b.sortKey));
}
function assess(move,variant,history,increment){
 const all=records(history,move,variant),complete=all.filter(x=>x.full),last=complete.at(-1),prior=complete.at(-2),reps=range(move.reps);
 const latest=all.at(-1)||null;
 const result={moveId:move.id,variant,completed:complete.length,records:all.length,range:reps,
  lastWeight:last?Math.max(...last.sets.map(x=>x.kg)):null,lastDate:last?.date||null,
  lastReps:last?.sets.map(x=>x.reps)||[],direction:'unknown',status:'initial',short:'',detail:'',volume:null};
 if(latest)result.volume=round(latest.sets.reduce((sum,s)=>sum+s.kg*s.reps,0));
 if(!last){result.short='İlk üç setini tamamlayınca öneri oluşacak.';result.detail='Henüz karşılaştırılabilir, tamamlanmış 3 setlik antrenman yok.';return result}
 if(!prior){result.status='collect';result.short='Bir tamamlanmış antrenman daha kaydet.';result.detail='Ağırlık artışı önermek için aynı hareket seçeneğinde en az iki tamamlanmış seans gerekiyor.';return result}
 const a=prior.sets,b=last.sets;
 const sameInSession=sets=>sets.every(x=>Math.abs(x.kg-sets[0].kg)<0.0001);
 const sameLoad=sameInSession(a)&&sameInSession(b)&&Math.abs(a[0].kg-b[0].kg)<0.0001;
 const allMax=[...a,...b].every(s=>s.reps>=reps.max);
 const lastBelow=b.some(s=>s.reps<reps.min);
 const priorVolume=a.reduce((sum,x)=>sum+x.kg*x.reps,0);
 const lastVolume=b.reduce((sum,x)=>sum+x.kg*x.reps,0);
 result.direction=lastVolume>priorVolume+0.1?'up':lastVolume<priorVolume-0.1?'down':'flat';
 if(lastBelow){
  result.status='hold';result.short='Ağırlığı artırma; tekrar aralığını tamamlamaya odaklan.';
  result.detail='Son seanstaki en az bir set hedef tekrar alt sınırının altında. Önce kontrollü tekrarlar ve uygun teknik.';
 }else if(a[0]?.kg===0&&b[0]?.kg===0){
  result.status='bodyweight';result.short='Tekrarları ve hareket kalitesini takip et.';
  result.detail='Vücut ağırlığıyla yapılan hareketlerde otomatik kilogram artışı önerilmez.';
 }else if(sameLoad&&allMax){
  const step=[1,2.5,5].includes(Number(increment))?Number(increment):2.5;
  result.status='increase';result.short=labelKg(a[0].kg)+' → '+labelKg(a[0].kg+step)+' artışını değerlendirebilirsin.';
  result.detail='Son iki tamamlanmış antrenmanda tüm setler üst tekrar sınırına ulaştı. Form uygunsa ve ekipmanda bu kademe varsa dene; otomatik uygulanmaz.';
 }else{
  result.status='hold';result.short='Aynı yükte istikrarlı, kontrollü tekrarları sürdür.';
  result.detail=sameLoad?'Her iki seanstaki tüm setler henüz üst tekrar sınırına ulaşmadı.':'Son seanslardaki yükler farklı. Artış önermeden önce sabit yükte karşılaştırılabilir kayıt oluştur.';
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
 const finished=safeArray(history).filter(s=>s?.status==='finished'&&days.includes(s.date));
 const perDay=Object.fromEntries(days.map(date=>[date,finished.filter(s=>s.date===date).length]));
 const countSets=finished.reduce((sum,session)=>sum+Object.values(session.items||{}).reduce((total,x)=>total+safeArray(x).filter(y=>y?.done).length,0),0);
 const target=Number(frequency)===3?3:2;
 const selectedDates=safeArray(selected).filter(x=>days.includes(x)&&x!==days[2]);
 const suggested=(target===3?[0,3,5]:[0,4]).map(x=>days[x]);
 const plan=selectedDates.length?selectedDates:suggested;
 return {start,days,finished:finished.length,sets:countSets,target,planned:plan,custom:selectedDates.length>0,perDay};
}
function reschedule(w,todayDate){
 if(!w||!w.custom||!validDate(todayDate)||!w.days.includes(todayDate))return {missed:[],replacement:null};
 const missed=w.planned.filter(date=>date<todayDate&&!w.perDay[date]);
 if(!missed.length)return {missed:[],replacement:null};
 const used=[...w.planned.filter(date=>date>=todayDate),...Object.keys(w.perDay).filter(d=>w.perDay[d]>0),w.days[2]];
 const candidate=w.days.find(date=>{
  if(date<todayDate||date===w.days[2]||w.planned.includes(date)||w.perDay[date])return false;
  const t=new Date(date+'T12:00:00').getTime();
  return used.every(other=>Math.abs(t-new Date(other+'T12:00:00').getTime())>=2*86400000);
 });
 return {missed,replacement:candidate||null};
}
function analysis(move,variant,history,increment){
 const assessment=assess(move,variant,history,increment);
 const entries=records(history,move,variant).filter(x=>x.full);
 const prev=entries.at(-2),last=entries.at(-1);
 const total=last?last.sets.reduce((sum,x)=>sum+x.kg*x.reps,0):null;
 const prior=prev?prev.sets.reduce((sum,x)=>sum+x.kg*x.reps,0):null;
 const change=total!==null&&prior!==null?round(total-prior):null;
 return {...assessment,volume:total===null?null:round(total),volumeChange:change};
}
function report(history,moves,weekDate,frequency,variants,increment,selected){
 const w=weekly(history,weekDate,frequency,selected);
 const messages=[];
 if(w.finished===0)messages.push('Bu hafta tamamlanmış Full Body kaydı yok. İlk seansını kaydettiğinde değerlendirme başlayacak.');
 else if(w.finished<w.target)messages.push(w.finished+'/'+w.target+' Full Body tamamlandı. Uygun bir sonraki haftada planına yeniden devam edebilirsin.');
 else messages.push('Bu haftaki '+w.target+' Full Body hedefini tamamladın.');
 const historyThroughWeek=safeArray(history).filter(session=>validDate(session?.date)&&session.date<=w.days[6]);
 const eligible=w.finished>0?safeArray(moves).map(move=>assess(move,chosenVariant(move,variants),historyThroughWeek,increment)):[];
 const rising=eligible.find(x=>x.status==='increase'),caution=eligible.find(x=>x.status==='hold'&&x.detail.includes('alt sınırının'));
 if(rising)messages.push(rising.variant+': '+rising.short);
 if(caution)messages.push(caution.variant+': tekrar hedefinin altında kalan setlere odaklan.');
 if(messages.length<3&&w.finished>0)messages.push('Bu hafta '+w.sets+' tamamlanmış set kaydettin. Öneriler yalnızca kayıtlı setlere dayanır.');
 return {...w,messages:messages.slice(0,3)};
}
global.FormaRotaCoachEngine={range,chosenVariant,records,assess,analysis,weekly,reschedule,report,weekStart,shift,labelKg};
})(window);

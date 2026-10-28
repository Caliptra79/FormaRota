/* FormaRota: immutable performance and recovery analysis.
   Read-only: no localStorage, DOM, server access or implicit record transformations. */
(function(root){
'use strict';
const arr=x=>Array.isArray(x)?x:[];
const validDate=x=>typeof x==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(x)&&
 !Number.isNaN(Date.parse(x+'T12:00:00Z'))&&new Date(x+'T12:00:00Z').toISOString().slice(0,10)===x;
const diff=(a,b)=>(Date.parse(b+'T12:00:00Z')-Date.parse(a+'T12:00:00Z'))/86400000;
const round=x=>Math.round(x*10)/10;
function performance({history=[],move,variant,asOf,coach}={}){
 if(!move||!move.id||typeof variant!=='string'||!variant||!validDate(asOf)||!coach?.records)
  return {entries:[],latest:null,previous:null,changes:null,reason:'Geçerli hareket ve tarih gerekli.'};
 const days=[];
 for(const record of coach.records(history,move,variant)){
  if(!record.full||!validDate(record.date)||record.date>asOf||record.sets.length!==3)continue;
  const sets=record.sets.map(s=>({kg:Number(s.kg),reps:Number(s.reps)}));
  if(sets.some(s=>!Number.isFinite(s.kg)||s.kg<0||!Number.isInteger(s.reps)||s.reps<1))continue;
  const volume=round(sets.reduce((n,s)=>n+s.kg*s.reps,0));
  const totalReps=sets.reduce((n,s)=>n+s.reps,0);
  const maxKg=Math.max(...sets.map(s=>s.kg));
  // Epley estimated 1RM only for plausible 1–10 repetition resistance sets.
  // Never claim a true maximum and never infer bodyweight or unlogged limb counts.
  const candidates=sets.filter(s=>s.kg>0&&s.reps>=1&&s.reps<=10)
   .map(s=>s.kg*(1+s.reps/30));
  const e1rm=candidates.length?round(Math.max(...candidates)):null;
  const entry={date:record.date,variant,sets,totalReps,maxKg,volume,e1rm};
  if(days.length&&days[days.length-1].date===entry.date)days[days.length-1]=entry;
  else days.push(entry);
 }
 const latest=days.at(-1)||null,previous=days.at(-2)||null;
 const changes=previous&&latest?{
  maxKg:round(latest.maxKg-previous.maxKg),
  totalReps:latest.totalReps-previous.totalReps,
  volume:round(latest.volume-previous.volume),
  e1rm:previous.e1rm!=null&&latest.e1rm!=null?round(latest.e1rm-previous.e1rm):null
 }:null;
 return {entries:days,latest,previous,changes,
  reason:days.length?'Aynı günün yalnızca son geçerli tam hareket kaydı karşılaştırılır.':'Bu alternatif için tamamlanmış üç geçerli set kaydı bulunmuyor.'};
}
function lastPerformances({history=[],moves=[],asOf,coach}={}){
 let declineCount=0,comparable=0;
 for(const move of arr(moves)){
  const names=(arr(move.options).length?move.options:[{name:move.name}]).map(x=>x.name).filter(Boolean);
  for(const variant of names){
   const series=performance({history,move,variant,asOf,coach}).entries;
   if(series.length<3)continue;
   const [a,b,c]=series.slice(-3),same=a.maxKg>0&&[a,b,c].every(x=>
    x.sets.every(s=>Math.abs(s.kg-a.maxKg)<0.0001));
   if(!same||diff(a.date,b.date)>28||diff(b.date,c.date)>28||diff(c.date,asOf)>7)continue;
   comparable++;
   if(a.totalReps>b.totalReps&&b.totalReps>c.totalReps)declineCount++;
  }
 }
 return {comparable,declineCount};
}
function recovery({asOf,fullHistory=[],absHistory=[],sleepLog={},moves=[],coach,painReported=false}={}){
 if(!validDate(asOf))return {status:'insufficient',headline:'Veri yetersiz',reasons:['Geçerli tarih bulunamadı.'],allowIncrease:false};
 const sessions=[...arr(fullHistory),...arr(absHistory)].filter(x=>x&&validDate(x.date)&&
  ['finished','stopped'].includes(x.status)&&diff(x.date,asOf)>=0&&diff(x.date,asOf)<=7);
 const dates=[...new Set(sessions.map(x=>x.date))].sort();
 const latestDate=dates.at(-1)||null,daysSince=latestDate?diff(latestDate,asOf):null;
 const validSleep=Object.entries(sleepLog&&typeof sleepLog==='object'&&!Array.isArray(sleepLog)?sleepLog:{})
  .filter(([date,x])=>validDate(date)&&diff(date,asOf)>=0&&diff(date,asOf)<=3&&x&&typeof x==='object')
  .map(([date,x])=>({date,hours:x.hours==null?null:Number(x.hours),energy:x.energy==null?null:Number(x.energy)}))
  .sort((a,b)=>b.date.localeCompare(a.date));
 // Only explicit valid observations; missing data never becomes zero sleep or low energy.
 const hours=validSleep.find(x=>x.hours!=null&&Number.isFinite(x.hours)&&x.hours>=0.5&&x.hours<=16);
 const energy=validSleep.find(x=>x.energy!=null&&Number.isInteger(x.energy)&&x.energy>=1&&x.energy<=5);
 const lowSleep=!!hours&&hours.hours<6,lowEnergy=!!energy&&energy.energy<=2;
 const foundation=root.FormaRotaTrainerFoundation;
 const worked={};
 if(foundation?.MUSCLES){
  for(const [history,kind] of [[fullHistory,'full'],[absHistory,'abs']]){
   for(const entry of arr(history)){
    if(!entry||!validDate(entry.date)||!['finished','stopped'].includes(entry.status)||
       diff(entry.date,asOf)<0||diff(entry.date,asOf)>7)continue;
    const ids=kind==='full'?foundation.FULL_IDS:foundation.ABS_IDS;
    for(const id of ids){
     const rows=entry.items?.[id];if(!Array.isArray(rows))continue;
     const valid=rows.slice(0,3).some(s=>kind==='full'?foundation.validFullSet(s):foundation.validAbsSet(s,id));
     if(!valid)continue;
     if(!worked[entry.date])worked[entry.date]=new Set();
     worked[entry.date].add(foundation.MUSCLES[id].primary);
    }
   }
  }
 }
 const workedDays=Object.keys(worked).sort(),recent=workedDays.slice(-2);
 const overlapping=recent.length===2&&diff(recent[0],recent[1])<=1&&diff(recent[1],asOf)<=2
  ?[...worked[recent[0]]].filter(m=>worked[recent[1]].has(m)):[];
 const frequent=overlapping.length>0;
 const drops=coach?.records?lastPerformances({history:fullHistory,moves,asOf,coach}):{comparable:0,declineCount:0};
 const reasons=[],signals=[];
 if(lowSleep){reasons.push('Son kayıtlı uyku '+hours.hours+' saat (6 saatin altında).');signals.push('sleep');}
 if(lowEnergy){reasons.push('Son kayıtlı enerji düzeyi '+energy.energy+'/5.');signals.push('energy');}
 if(frequent){reasons.push('Son iki yakın antrenman gününde '+overlapping.slice(0,3).join(', ')+' kas grupları yeniden çalıştırılmış.');signals.push('muscle-interval');}
 if(drops.declineCount){reasons.push(drops.declineCount+' harekette aynı ağırlıkta son üç farklı günde toplam tekrar azalmış.');signals.push('performance');}
 if(painReported)reasons.unshift('Ağrı veya sakatlık belirtisi olduğunu işaretledin.');
 let status='normal',headline='Ek uyarı saptanmadı';
 if(painReported){status='pain';headline='Ağrı/sakatlık belirtisi: artış önerisi uygulanmamalı';}
 else if(signals.length>=2){status='caution';headline='Yüksek yorgunluk olasılığı';}
 else if(signals.length===1){status='watch';headline='Toparlanmayı gözden geçir';}
 else if(!dates.length&&!hours&&!energy){status='insufficient';headline='Henüz yeterli veri yok';}
 if(!reasons.length)reasons.push(status==='insufficient'?
  'Yakın tarihli antrenman, uyku veya enerji kaydı yok.':'Kaydedilen verilerde belirgin yorgunluk işareti görülmedi; bu, tam toparlandığın anlamına gelmez.');
 const advice=status==='pain'?'Ağrılı hareketi zorlama; yeni veya süren ağrıda sağlık profesyoneline danış.':
  status==='caution'?'Gerekiyorsa dinlenmeyi veya daha hafif bir seansı düşün; ağırlık artışını ertele.':
  status==='watch'?'Ağırlık artırmadan önce uykunu, zorlanmanı ve tekniğini kontrol et.':
  status==='insufficient'?'Veri oluştukça değerlendirme yapılabilir; kesin toparlanma yorumu çıkarılamaz.':
  'Ağrı, teknik bozulma veya belirgin zorlanma varsa artış önerilerini uygulama.';
 return {status,headline,reasons,advice,allowIncrease:!['pain','caution'].includes(status),
  signals,latestWorkoutDate:latestDate,sleepDays:validSleep.length,
  performanceDeclines:drops.declineCount,
  disclaimer:'Bu kayıt temelli bir olasılık değerlendirmesidir; kas toparlanması ölçümü, tanı veya kesin performans tahmini değildir.'};
}
const api=Object.freeze({performance,recovery,lastPerformances,validDate});
if(typeof module!=='undefined'&&module.exports)module.exports=api;
root.FormaRotaTrainerInsights=api;
})(typeof window!=='undefined'?window:globalThis);

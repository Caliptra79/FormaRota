/* FormaRota: additive, read-only trainer foundations.
   Historical records remain unchanged; no DOM or storage dependencies. */
(function(root){
'use strict';
const FULL_IDS=Object.freeze(['lat','row','incline','pec','lateral','rear','push','overhead','zottman','legpress','extension','legcurl','calf']);
const ABS_IDS=Object.freeze(['floor-crunch','reverse-crunch','heel-touch','plank']);
const MUSCLES=Object.freeze({
 lat:{primary:'Sırt',secondary:['Biceps']},row:{primary:'Sırt',secondary:['Biceps','Arka omuz']},
 incline:{primary:'Göğüs',secondary:['Triceps','Ön omuz']},pec:{primary:'Göğüs',secondary:['Ön omuz']},
 lateral:{primary:'Yan omuz',secondary:[]},rear:{primary:'Arka omuz',secondary:['Sırt']},
 push:{primary:'Triceps',secondary:[]},overhead:{primary:'Triceps',secondary:[]},
 zottman:{primary:'Biceps',secondary:[]},legpress:{primary:'Ön bacak',secondary:['Kalça']},
 extension:{primary:'Ön bacak',secondary:[]},legcurl:{primary:'Arka bacak',secondary:[]},
 calf:{primary:'Baldır',secondary:[]},
 'floor-crunch':{primary:'Karın',secondary:[]},'reverse-crunch':{primary:'Karın',secondary:[]},
 'heel-touch':{primary:'Oblik',secondary:['Karın']},plank:{primary:'Core',secondary:['Karın']}
});
function validFullSet(x){return !!x&&x.done===true&&x.weight!==null&&x.weight!==undefined&&String(x.weight).trim()!==''&&x.reps!==null&&x.reps!==undefined&&String(x.reps).trim()!==''&&Number.isFinite(Number(x.weight))&&Number(x.weight)>=0&&Number(x.weight)<=1500&&Number.isInteger(Number(x.reps))&&Number(x.reps)>=1&&Number(x.reps)<=100;}
function validAbsSet(x,id){if(!x||x.done!==true)return false;const val=id==='plank'?x.seconds:x.reps;return val!==null&&val!==undefined&&String(val).trim()!==''&&Number.isInteger(Number(val))&&Number(val)>=1&&Number(val)<=(id==='plank'?7200:150);}
function validDate(x){if(typeof x!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(x))return false;const d=new Date(x+'T12:00:00Z');return !Number.isNaN(d.getTime())&&d.toISOString().slice(0,10)===x;}
function weeklyVolume({fullHistory=[],absHistory=[],start,end}={}){
 if(!validDate(start)||!validDate(end)||end<start)throw Error('Geçerli hafta tarihleri gerekli');
 const byMuscle={},days={},seen={};let physicalSets=0,secondaryCredits=0;
 const add=(id,date,kind)=>{const muscle=MUSCLES[id];if(!muscle)return;const k=muscle.primary;const record=byMuscle[k]||(byMuscle[k]={primarySets:0,secondarySets:0,days:0});
 record.primarySets++;physicalSets++;const dayKey=k+'|'+date;if(!seen[dayKey]){seen[dayKey]=true;record.days++;}
 for(const secondary of muscle.secondary){const v=byMuscle[secondary]||(byMuscle[secondary]={primarySets:0,secondarySets:0,days:0});v.secondarySets++;secondaryCredits++;}
 days[date]=(days[date]||0)+1;};
 for(const [history,ids,kind] of [[fullHistory,FULL_IDS,'full'],[absHistory,ABS_IDS,'abs']]){
  if(!Array.isArray(history))continue;
  for(const session of history){
   if(!session||!validDate(session.date)||session.date<start||session.date>end||!['finished','stopped'].includes(session.status))continue;
   for(const id of ids){const rows=session.items?.[id];if(!Array.isArray(rows))continue;
    rows.slice(0,3).forEach(s=>{if((kind==='full'?validFullSet(s):validAbsSet(s,id)))add(id,session.date,kind);});
   }
  }
 }
 return {start,end,physicalSets,secondaryCredits,byMuscle,days,interpretation:'Bunlar kaydedilen geçerli setlerdir; kas gelişimi veya toparlanma ölçümü değildir. Yardımcı katkılar ayrı tutulur.'};
}
function doubleProgression({moveId,variant,history=[],range=[8,12],step=2.5,asOf,minimumDays=2}={}){
 if(!FULL_IDS.includes(moveId)||!Array.isArray(history)||!Array.isArray(range)||range.length!==2||!Number.isInteger(range[0])||!Number.isInteger(range[1])||range[0]<1||range[1]>100||range[0]>=range[1]||![1,2.5,5].includes(step)||!validDate(asOf))
  return {status:'invalid',reason:'Hareket, tekrar aralığı, artış kademesi veya tarih geçersiz.'};
 const results=[];
 history.forEach((session,index)=>{
  if(!session||!validDate(session.date)||session.date>asOf||!['finished','stopped'].includes(session.status))return;
  const rows=session.items?.[moveId];if(!Array.isArray(rows))return;
  const selected=rows.filter(s=>s?.done===true&&(s.name||variant)===variant);
  if(!selected.length)return;
  results.push({date:session.date,index,at:session.endedAt||session.startedAt||'',valid:selected.length===3&&selected.every(validFullSet)&&session.status==='finished',invalid:selected.some(s=>!validFullSet(s)),partial:session.status!=='finished'||selected.length!==3,sets:selected});
 });
 results.sort((a,b)=>a.date.localeCompare(b.date)||a.at.localeCompare(b.at)||a.index-b.index);
 const latest=results.at(-1);
 if(!latest)return {status:'insufficient',reason:'Henüz yeterli veri yok; önce üç geçerli set kaydet.'};
 if(latest.invalid||latest.partial)return {status:'caution',reason:'Son antrenman eksik veya geçersiz. Ağırlık artışı önerilmiyor.',lastDate:latest.date};
 const unique=[];for(const entry of results.filter(x=>x.valid)){if(unique.at(-1)?.date===entry.date)unique[unique.length-1]=entry;else unique.push(entry);}
 const last=unique.at(-1),prior=unique.at(-2);
 const age=(a,b)=>(Date.parse(b+'T12:00:00Z')-Date.parse(a+'T12:00:00Z'))/86400000;
 if(age(last.date,asOf)>28||prior&&age(prior.date,last.date)>28)return {status:'stale',reason:'Veriler güncel değil; yeni tam antrenman kaydı gerekli.'};
 if(unique.length<minimumDays)return {status:'insufficient',reason:'En az iki farklı günde tam hareket kaydı gerekli.'};
 const max=range[1],min=range[0],atMax=entry=>entry.sets.every(x=>Number(x.reps)>=max);
 const sameWeight=entry=>entry.sets.every(x=>Number(x.weight)===Number(entry.sets[0].weight));
 const kg=Number(last.sets[0].weight),same=kg>0&&sameWeight(last)&&sameWeight(prior)&&Number(prior.sets[0].weight)===kg;
 const basis={previous:{date:prior.date,sets:prior.sets.map(s=>({weight:Number(s.weight),reps:Number(s.reps)}))},latest:{date:last.date,sets:last.sets.map(s=>({weight:Number(s.weight),reps:Number(s.reps)}))}};
 if(last.sets.some(s=>Number(s.reps)<min))return {status:'hold',reason:'En az bir set alt tekrar sınırının altında. Mevcut yükü koruyup formu değerlendir.',basis};
 if(moveId==='calf'&&kg===0)return {status:'hold',reason:'Vücut ağırlığı hareketinde kilogram artışı hesaplanmıyor.',basis};
 if(same&&atMax(prior)&&atMax(last)){
  if(step/kg>0.10)return {status:'hold',reason:'Seçili ekipman kademesi mevcut ağırlığın %10’undan fazla; artış önerilmiyor.',basis};
  return {status:'consider_increase',currentKg:kg,suggestedKg:kg+step,nextTargetReps:min,basis,requiresApproval:true,reason:'İki ayrı tam antrenman gününde bütün setler üst tekrara ulaştı. Form, yorgunluk ve ekipman uygunluğunu kontrol ederek artışı değerlendirebilirsin.'};
 }
 return {status:'hold',currentKg:kg,basis,reason:'Üst tekrar sınırına henüz iki ayrı günde ulaşılmadı. Aynı ağırlıkla kontrollü tekrar gelişimini sürdür.'};
}
const api=Object.freeze({FULL_IDS,ABS_IDS,MUSCLES,validFullSet,validAbsSet,validDate,weeklyVolume,doubleProgression});
if(typeof module!=='undefined'&&module.exports)module.exports=api;
root.FormaRotaTrainerFoundation=api;
})(typeof window!=='undefined'?window:globalThis);

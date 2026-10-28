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
const STEPS=Object.freeze([0.5,1,2.5,5]);
function validateSettings(settings){
 if(!settings||typeof settings!=='object'||Array.isArray(settings))return false;
 const keys=Object.keys(settings);if(keys.length>40)return false;
 return keys.every(key=>{
  const separator=key.indexOf('|'),id=key.slice(0,separator),variant=key.slice(separator+1),v=settings[key];
  return separator>0&&FULL_IDS.includes(id)&&variant.length>0&&variant.length<=100&&
   v&&typeof v==='object'&&!Array.isArray(v)&&Object.keys(v).every(k=>['min','max','step'].includes(k))&&
   Number.isInteger(v.min)&&Number.isInteger(v.max)&&v.min>=1&&v.max<=100&&v.min<v.max&&STEPS.includes(v.step);
 });
}
function resolveSetting(move,variant,settings,globalStep){
 const parsed=(String(move?.reps||'8–12').match(/\\d+/g)||[]).map(Number);
 const defaultMin=parsed[0]||8,defaultMax=parsed[1]||12;
 const dumbbell=/dumbbell|dambıl|dambill/i.test(variant||'')||['lateral','zottman'].includes(move?.id);
 const fallbackStep=dumbbell?1:STEPS.includes(globalStep)?globalStep:2.5;
 const key=move?.id+'|'+variant;
 const custom=validateSettings(settings)?settings[key]:null;
 return {min:custom?.min??defaultMin,max:custom?.max??defaultMax,step:custom?.step??fallbackStep,key,custom:!!custom};
}
const api=Object.freeze({FULL_IDS,ABS_IDS,MUSCLES,validFullSet,validAbsSet,validDate,weeklyVolume,STEPS,validateSettings,resolveSetting});
if(typeof module!=='undefined'&&module.exports)module.exports=api;
root.FormaRotaTrainerFoundation=api;
})(typeof window!=='undefined'?window:globalThis);

/* FormaRota Studio Plus — pure progress and seven-day summaries.
   No external network, no writes, no new persistent keys. */
(function(scope){
 'use strict';
 const n=v=>{
  if(v===null||v===undefined||v==='')return null;
  const x=Number(v);
  return Number.isFinite(x)?x:null;
 };
 const validISO=s=>typeof s==='string'&&/^\d{4}-\d\d-\d\d$/.test(s)&&!Number.isNaN(Date.parse(s+'T12:00:00Z'));
 const integer=(v,min,max)=>Number.isInteger(n(v))&&n(v)>=min&&n(v)<=max;
 const localISO=d=>[d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-');
 const mondayOf=asOf=>{
  const d=new Date(asOf.getFullYear(),asOf.getMonth(),asOf.getDate(),12);
  d.setDate(d.getDate()-(d.getDay()+6)%7);
  return d;
 };
 const daysOfWeek=asOf=>{
  const mon=mondayOf(asOf);
  return Array.from({length:7},(_,i)=>{
   const d=new Date(mon.getFullYear(),mon.getMonth(),mon.getDate()+i,12);
   return localISO(d);
  });
 };
 function fullSession(session,moveIds){
  if(!session||session.status!=='finished'||!validISO(session.date)||!Array.isArray(moveIds)||moveIds.length!==13)return false;
  return moveIds.every(id=>{
   const sets=session.items?.[id];
   return Array.isArray(sets)&&sets.length===3&&sets.every(row=>
    row?.done===true && n(row.weight)!==null&&n(row.weight)>=0&&n(row.weight)<=1500 &&
    integer(row.reps,1,100)
   );
  });
 }
 function progress(current,goal){
  const value=Math.max(0,n(current)??0);
  const target=n(goal);
  if(target===null||target<=0)return {value,goal:0,pct:0,remaining:null,valid:false};
  return {value,goal:target,pct:Math.min(100,Math.max(0,Math.round(100*value/target))),
   remaining:Math.max(0,target-value),valid:true};
 }
 function workoutSets(session,moveIds){
  if(!session||!Array.isArray(moveIds))return 0;
  return moveIds.reduce((count,id)=>count+(Array.isArray(session.items?.[id])?
   session.items[id].filter(row=>row?.done===true&&n(row.weight)!==null&&n(row.weight)>=0&&n(row.weight)<=1500&&integer(row.reps,1,100)).length:0),0);
 }
 function week({asOf=new Date(),logs=[],sessions=[],weights=[],water={},walk={},moveIds=[]}={}){
  const selected=daysOfWeek(asOf);
  const today=localISO(asOf);
  const visible=selected.filter(date=>date<=today);
  const daySet=new Set(visible);
  const recordRows=Array.isArray(logs)?logs.filter(row=>daySet.has(row?.date)):[];
  const allSessions=Array.isArray(sessions)?sessions:[];
  const fullDates=new Set(allSessions.filter(row=>daySet.has(row?.date)&&fullSession(row,moveIds)).map(row=>row.date));
  const daily=selected.map(date=>{
   const meals=recordRows.filter(row=>row.date===date);
   const isFuture=date>today;
   const waterMl=Math.max(0,n(water?.[date])??0);
   const walkKm=Math.max(0,n(walk?.[date])??0);
   return {date,future:isFuture,loggedMeals:meals.length,fullWorkout:fullDates.has(date),
    waterMl,walkKm,active:!isFuture&&(meals.length>0||fullDates.has(date)||waterMl>0||walkKm>0)};
  });
  const registered=new Set(recordRows.map(row=>row.date));
  // A logged day may contain only a snack. Never call this a complete day's intake.
  const sum=key=>recordRows.reduce((total,row)=>total+Math.max(0,n(row[key])??0),0);
  const activeCount=registered.size;
  const weightRows=(Array.isArray(weights)?weights:[]).filter(row=>
   validISO(row?.date)&&daySet.has(row.date)&&n(row.kg)!==null&&n(row.kg)>0&&n(row.kg)<650)
   .slice().sort((a,b)=>a.date.localeCompare(b.date));
  // Multiple weights on the same date are not independent days.
  const uniqueWeights=[];
  for(const row of weightRows){
   if(uniqueWeights.length&&uniqueWeights[uniqueWeights.length-1].date===row.date)uniqueWeights[uniqueWeights.length-1]=row;
   else uniqueWeights.push(row);
  }
  const difference=uniqueWeights.length>=2?Math.round((n(uniqueWeights.at(-1).kg)-n(uniqueWeights[0].kg))*10)/10:null;
  let streak=0;
  for(let i=visible.length-1;i>=0;i--){
   if(!daily[i].active)break;
   streak++;
  }
  return {
   dates:selected,daily,daysRecorded:activeCount,daysActive:daily.filter(x=>x.active).length,
   fullWorkoutDays:fullDates.size,
   avgKcal:activeCount?Math.round(sum('kcal')/activeCount):null,
   avgProtein:activeCount?Math.round(sum('protein')/activeCount*10)/10:null,
   waterTotal:Math.round(daily.filter(x=>!x.future).reduce((t,x)=>t+x.waterMl,0)),
   walkTotal:Math.round(daily.filter(x=>!x.future).reduce((t,x)=>t+x.walkKm,0)*10)/10,
   weightDelta:difference,weightPoints:uniqueWeights.length,
   streak,
   // Observed activity streak is not a streak of hitting calorie goals.
   award:fullDates.size>=2?'Antrenman istikrarı':streak>=3?'Üç günlük takip':null
  };
 }
 const api=Object.freeze({progress,fullSession,workoutSets,week,daysOfWeek,localISO});
 if(typeof module!=='undefined'&&module.exports)module.exports=api;
 scope.FormaRotaStudioPlusMetrics=api;
})(typeof window!=='undefined'?window:globalThis);

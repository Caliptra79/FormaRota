/* FormaRota ABS — pure session rules, no storage or DOM dependencies.
   Every ABS session is independent of the existing Full Body 13×3 schema. */
(function(scope){
 'use strict';
 const MOVES=Object.freeze([
  Object.freeze({id:'floor-crunch',name:'Floor Crunch',tr:'Yarım Mekik',group:'Üst karın',kind:'reps',suggested:'12–15 tekrar',defaultValue:12,source:'https://fitnessprogramer.com/exercise/floor-crunch/',gif:'./assets/abs-floor-crunch.gif',tip:'Kürek kemiklerini kontrollü kaldır, boynunu çekme.'}),
  Object.freeze({id:'reverse-crunch',name:'Reverse Crunch',tr:'Ters Mekik',group:'Alt karın',kind:'reps',suggested:'12–15 tekrar',defaultValue:12,source:'https://fitnessprogramer.com/exercise/reverse-crunch/',gif:'./assets/abs-reverse-crunch.gif',tip:'Kalçanı hafifçe kaldır; hareketi savurarak yapma.'}),
  Object.freeze({id:'heel-touch',name:'Heel Touch',tr:'Topuklara Dokunma',group:'Yan karın (oblik)',kind:'reps',suggested:'20 toplam (10+10)',defaultValue:20,source:'https://fitnessprogramer.com/exercise/heel-touch/',gif:'./assets/abs-heel-touch.gif',tip:'Sağ ve sol dönüşleri toplam say, belini zorlamadan ilerle.'}),
  Object.freeze({id:'plank',name:'Forearm Plank',tr:'Düz Plank',group:'Core',kind:'seconds',suggested:'Doğru formla mümkün olduğunca uzun',defaultValue:0,source:'https://fitnessprogramer.com/exercise/plank/',gif:'./assets/abs-plank.gif',tip:'Belini çökertmeden, nefes tutmadan form bozulana kadar sürdür.'})
 ]);
 const ids=MOVES.map(x=>x.id);
 const iso=s=>typeof s==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(s)&&!Number.isNaN(Date.parse(s+'T12:00:00Z'));
 const number=v=>(v!==null&&v!==undefined&&String(v).trim()!==''&&Number.isFinite(Number(v))?Number(v):null);
 function validSet(move,set){
  if(!move||!set||set.done!==true)return false;
  const value=number(move.kind==='seconds'?set.seconds:set.reps);
  return value!==null&&Number.isInteger(value)&&value>=1&&value<=(move.kind==='seconds'?7200:150);
 }
 function count(session){
  return MOVES.reduce((n,move)=>n+(Array.isArray(session?.items?.[move.id])?
   session.items[move.id].slice(0,3).filter(set=>validSet(move,set)).length:0),0);
 }
 function complete(session){
  return Boolean(session&&MOVES.every(move=>
   Array.isArray(session.items?.[move.id])&&session.items[move.id].length===3&&
   session.items[move.id].every(set=>validSet(move,set))));
 }
 function finished(session){
  return Boolean(session&&session.status==='finished'&&iso(session.date)&&complete(session));
 }
 function session(date,id,startedAt){
  if(!iso(date)||typeof id!=='string'||!id||typeof startedAt!=='string')throw Error('Geçersiz ABS oturumu');
  return {id,date,startedAt,status:'running',
   items:Object.fromEntries(ids.map(move=>[move,[null,null,null]])),
   watch:{elapsedMs:0,startedAt:null}};
 }
 function sameDay(history,date){
  return Array.isArray(history)?history.filter(x=>x?.date===date&&iso(x.date)):[];
 }
 function todaySummary(absHistory,fullHistory,date){
  const abs=sameDay(absHistory,date),full=sameDay(fullHistory,date);
  const absCompleted=abs.filter(finished).length;
  const fullCompleted=full.filter(x=>x?.status==='finished').length;
  return {absCompleted,fullCompleted,absPartial:abs.filter(x=>x?.status==='stopped').length,
   any:absCompleted>0||fullCompleted>0,
   labels:[...(fullCompleted?['Full Body']:[]),...(absCompleted?['ABS']:[])]};
 }
 function completedDates(history){
  return new Set((Array.isArray(history)?history:[]).filter(finished).map(x=>x.date));
 }
 function weekCount(history,dates){
  const selected=new Set(Array.isArray(dates)?dates:[]);
  return [...completedDates(history)].filter(x=>selected.has(x)).length;
 }
 function validateBackup(input){
  if(!input||typeof input!=='object'||Array.isArray(input))return false;
  if(input.selected!==undefined&&!['abs','fullbody'].includes(input.selected))return false;
  if(input.history!==undefined&&(!Array.isArray(input.history)||input.history.length>10000))return false;
  if(input.current!==undefined&&input.current!==null&&(typeof input.current!=='object'||Array.isArray(input.current)))return false;
  const sessions=[...(input.history||[]),...(input.current?[input.current]:[])];
  return sessions.every(x=>x&&typeof x==='object'&&iso(x.date)&&typeof x.id==='string'&&x.id.length<=256&&
   ['running','paused','finished','stopped'].includes(x.status)&&
   x.items&&typeof x.items==='object'&&!Array.isArray(x.items)&&
   MOVES.every(move=>Array.isArray(x.items[move.id])&&x.items[move.id].length===3&&
    x.items[move.id].every(set=>set===null||(typeof set==='object'&&!Array.isArray(set)&&
     (set.done===false||validSet(move,set)))))&&
   (x.status!=='finished'||complete(x)));
 }
 const api=Object.freeze({MOVES,validSet,count,complete,finished,session,sameDay,todaySummary,completedDates,weekCount,validateBackup});
 if(typeof module!=='undefined'&&module.exports)module.exports=api;
 scope.FormaRotaABSEngine=api;
})(typeof window!=='undefined'?window:globalThis);

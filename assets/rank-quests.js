/* FormaRota Rank 2: read-only weekly missions and milestones.
 * No XP is minted here: existing rank / backup rules remain unchanged.
 */
(function(root){
'use strict';
const HOME=['incline-pushup','band-row','band-pulldown','squat','band-rdl','band-shoulder','band-lateral','band-curl','band-triceps','glute-bridge','dead-bug','pallof-press','tuck-hollow'];
const ABS=['floor-crunch','reverse-crunch','heel-touch','plank'];
const BAND_PLANS={A:['band-squat','bent-row','wrap-chest','shoulder-press','biceps-curl','overhead-triceps','calf-raise','band-crunch'],B:['front-lunge','band-rdl','one-arm-row','wrap-chest','shoulder-press','staggered-curl','overhead-triceps','band-crunch']};
const iso=s=>typeof s==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(s)&&!Number.isNaN(Date.parse(s+'T12:00:00Z'));
function dateOf(row){for(const k of ['date','endedAt','completedAt','finishedAt']){const s=row?.[k];if(typeof s==='string'&&iso(s.slice(0,10)))return s.slice(0,10)}return null}
function shift(d,n){const t=new Date(d+'T12:00:00Z');t.setUTCDate(t.getUTCDate()+n);return t.toISOString().slice(0,10)}
function week(d){const t=new Date(d+'T12:00:00Z');return shift(d,-((t.getUTCDay()+6)%7))}
function today(){const t=new Date();return [t.getFullYear(),String(t.getMonth()+1).padStart(2,'0'),String(t.getDate()).padStart(2,'0')].join('-')}
function finishedGym(r){return r?.status==='finished'&&r.items&&typeof r.items==='object'&&Object.keys(r.items).length>=13&&
 Object.values(r.items).filter(x=>Array.isArray(x)&&x.length===3&&x.every(s=>s?.done===true)).length>=13}
function finishedAbs(r){return r?.status==='finished'&&ABS.every(id=>Array.isArray(r.items?.[id])&&r.items[id].length===3&&
 r.items[id].every(s=>s?.done===true&&Number.isInteger(Number(s.reps??s.seconds))&&Number(s.reps??s.seconds)>0))}
function finishedHome(r){return r?.status==='finished'&&r.program==='home-calisthenics-v1'&&[2,3].includes(r.targetSets)&&
 HOME.every(id=>Array.isArray(r.items?.[id])&&r.items[id].length===r.targetSets&&
 r.items[id].every(s=>s?.done===true&&Number.isInteger(Number(s.reps??s.seconds))&&Number(s.reps??s.seconds)>0))}
function finishedBand(r){
 const ids=BAND_PLANS[r?.variant];
 if(r?.program!=='james-band-v1'||r.status!=='finished'||!ids||![2,3].includes(r.targetSets))return false;
 if(!r.items||typeof r.items!=='object'||Array.isArray(r.items)||Object.keys(r.items).length!==8)return false;
 return ids.every(id=>Array.isArray(r.items[id])&&r.items[id].length===r.targetSets&&r.items[id].every(s=>
  s?.done===true&&Number.isInteger(Number(s.reps))&&Number(s.reps)>=1&&Number(s.reps)<=60&&
  Number.isInteger(Number(s.rir))&&Number(s.rir)>=0&&Number(s.rir)<=5&&
  ['none','10','20','30','40'].includes(s.band)&&
  (id==='band-crunch'?s.band==='none':s.band!=='none')&&
  ['relaxed','normal','short'].includes(s.grip)&&['good','unsure','poor'].includes(s.form)
 ));
}
function calcPRs(rows,limit){
 const sessions=(Array.isArray(rows)?rows:[]).filter(r=>{const d=dateOf(r);return d&&d<=limit&&finishedGym(r)}).sort((a,b)=>
 (dateOf(a)||'').localeCompare(dateOf(b)||'')||String(a.endedAt||a.id||'').localeCompare(String(b.endedAt||b.id||'')));
 const best=new Map(),counted=new Set();let prs=0;
 for(const row of sessions){const d=dateOf(row);
  for(const [id,sets] of Object.entries(row.items)){
   if(!Array.isArray(sets)||sets.length!==3||!sets.every(s=>s?.done===true&&
    Number.isFinite(Number(s.weight))&&Number(s.weight)>0&&Number(s.weight)<=1500&&
    Number.isInteger(Number(s.reps))&&Number(s.reps)>=8&&Number(s.reps)<=35))continue;
   const variant=sets[0].name||id;
   if(!sets.every(s=>(s.name||id)===variant))continue;
   const key=id+':'+variant,volume=sets.reduce((v,s)=>v+Number(s.weight)*Number(s.reps),0);
   const old=best.get(key),daily=key+'@'+d;
   if(old!==undefined&&volume>old+0.01&&!counted.has(daily)){prs++;counted.add(daily)}
   best.set(key,Math.max(old??0,volume));
  }
 }
 return prs;
}
function analyze(input={},date=today()){
 if(!iso(date))throw Error('Invalid current date');
 const days=new Map(),at=d=>{if(!days.has(d))days.set(d,{food:false,walk:false,workout:false,active:false});return days.get(d)};
 const valid=d=>iso(d)&&d<=date;
 for(const item of (Array.isArray(input.foods)?input.foods:[]))if(valid(item?.date)&&Number(item.amount)>0)at(item.date).food=true;
 const walks=input.walks&&typeof input.walks==='object'&&!Array.isArray(input.walks)?input.walks:{};
 for(const [d,k] of Object.entries(walks))if(valid(d)&&Number.isFinite(Number(k))&&Number(k)>=5)at(d).walk=true;
 const types=[['full',input.full,finishedGym],['abs',input.abs,finishedAbs],['home',input.home,finishedHome],['band',input.band,finishedBand]];
 let homeCompleted=0;
 for(const [kind,records,finished] of types)for(const row of (Array.isArray(records)?records:[])){
  const d=dateOf(row);if(!valid(d)||!finished(row))continue;
  at(d).workout=true;if(kind==='home')homeCompleted++;
 }
 const weeks=new Map();
 for(const [d,r] of days){r.active=r.food||r.walk||r.workout;
  const k=week(d);if(!weeks.has(k))weeks.set(k,{walk:0,workout:0,food:0,active:0});
  const w=weeks.get(k);for(const metric of ['walk','workout','food','active'])if(r[metric])w[metric]++;
 }
 const milestones=[['walk',3,'3 gün 5 km yürüyüş'],['workout',2,'2 ayrı gün antrenman'],['food',4,'4 gün beslenme kaydı'],['active',5,'5 aktif gün']];
 const current=weeks.get(week(date))||{walk:0,workout:0,food:0,active:0};
 const missions=milestones.map(([id,target,label])=>({id,label,target,value:Math.min(target,current[id]),done:current[id]>=target}));
 const perfectWeeks=[...weeks.values()].filter(w=>milestones.every(([id,target])=>w[id]>=target)).length;
 const walking=[...days.entries()].filter(([,v])=>v.walk).map(([d])=>d).sort();
 let longestStreak=0,streak=0,previous=null;
 for(const d of walking){streak=previous&&shift(previous,1)===d?streak+1:1;
  longestStreak=Math.max(longestStreak,streak);previous=d;
 }
 const currentStreak=previous&&(previous===date||previous===shift(date,-1))?streak:0;
 return {week:week(date),missions,stats:{homeCompleted,longestStreak,currentStreak,
  prCount:calcPRs(input.full,date),perfectWeeks},complete:missions.filter(m=>m.done).length};
}
const api=Object.freeze({analyze,finishedHome,finishedGym,finishedAbs,finishedBand,calcPRs});
if(typeof module!=='undefined'&&module.exports)module.exports=api;
root.FormaRotaRankQuests=api;
})(typeof window!=='undefined'?window:globalThis);

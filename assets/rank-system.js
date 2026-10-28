/* FormaRota Rank — offline, read-only XP derived from existing records. */
(()=>{'use strict';
const tiers=[['Bronze',0,'🥉'],['Silver',1000,'🥈'],['Gold',3000,'🥇'],['Platinum',6000,'💠'],['Diamond',10000,'💎'],['Master',16000,'👑'],['FormaRota Legend',25000,'🏆']];
const read=(key,fallback)=>{try{return JSON.parse(localStorage.getItem(key))??fallback}catch{return fallback}};
const iso=d=>typeof d==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(d);
function day(row){for(const key of ['date','endedAt','completedAt','finishedAt']){const v=row?.[key];if(typeof v==='string'&&iso(v.slice(0,10)))return v.slice(0,10)}return ''}
function week(s){const a=s.split('-').map(Number),d=new Date(a[0],a[1]-1, a[2],12);d.setDate(d.getDate()-((d.getDay()+6)%7));return [d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-')}
function tally(){
 const days=new Map(),entry=d=>{if(!days.has(d))days.set(d,{food:[],walk:0,water:0,full:0,abs:0});return days.get(d)};
 const foods=read('kocluk-food-log-v2',[]);if(Array.isArray(foods))foods.forEach(x=>{if(iso(x?.date)&&Number(x.amount)>0)entry(x.date).food.push(x)});
 for(const [key,col] of [['formarota-walks-v1','walk'],['formarota-water-v1','water']]){const obj=read(key,{});if(obj&&typeof obj==='object'&&!Array.isArray(obj))for(const [d,n] of Object.entries(obj))if(iso(d))entry(d)[col]=Math.max(0,Number(n)||0)}
 for(const [key,col] of [['kocluk-fitness-history-v1','full'],['formarota-abs-history-v1','abs']]){const rows=read(key,[]);if(Array.isArray(rows))rows.forEach(x=>{const d=day(x);if(d&&x.status==='finished')entry(d)[col]++})}
 const weeks=new Map();days.forEach((v,d)=>{const w=week(d);if(!weeks.has(w))weeks.set(w,[]);weeks.get(w).push(v)});
 const categories={Fitness:0,Beslenme:0,Aktivite:0,Düzenlilik:0};
 const kcalGoal=Number(document.getElementById('goalKcal')?.value)||0,proteinGoal=Number(document.getElementById('goalProtein')?.value)||0;
 weeks.forEach(rows=>{let full=0,abs=0,active=0;for(const r of rows){
  if(r.food.length||r.full||r.abs||r.walk)active++;
  if(r.food.length){categories.Beslenme+=25;const meals=new Set(r.food.map(x=>x.meal)),k=r.food.reduce((n,x)=>n+(Number(x.kcal)||0),0),p=r.food.reduce((n,x)=>n+(Number(x.protein)||0),0);
   if(meals.size>=3&&kcalGoal>0&&proteinGoal>0&&k>=.85*kcalGoal&&k<=1.15*kcalGoal&&p>=.9*proteinGoal)categories.Beslenme+=15}
  if(r.walk>=5)categories.Aktivite+=25;
  if(r.water>=2500)categories.Aktivite+=10;
  if(r.full&&full<3){categories.Fitness+=80;full++}
  if(r.abs&&abs<3){categories.Fitness+=35;abs++}
 }if(active>=5)categories.Düzenlilik+=60});
 const xp=Object.values(categories).reduce((a,b)=>a+b,0);let t=tiers[0],next=null;
 for(const tier of tiers){if(xp>=tier[1])t=tier;else{next=tier;break}}
 const span=(next?next[1]-t[1]:15000)/3,off=xp-t[1],stage=off>=2*span?2:off>=span?1:0;
 const start=t[1]+stage*span,end=t[1]+(stage+1)*span;
 return {xp,categories,title:t[0]+' '+['III','II','I'][stage],icon:t[2],remaining:Math.max(0,Math.ceil(end-xp)),percent:Math.max(0,Math.min(100,100*(xp-start)/(end-start)))};
}
function render(){
 const home=document.getElementById('frRankHome'),detail=document.getElementById('frRankFull');if(!home||!detail)return;
 const x=tally(),base='<div class="fr-rank-row"><span class="fr-rank-icon">'+x.icon+'</span><div><small>FORMA ROTA RANK</small><strong>'+x.title+'</strong><small>'+x.xp.toLocaleString('tr-TR')+' XP · Sonraki seviye için '+x.remaining.toLocaleString('tr-TR')+' XP</small></div></div><div class="fr-rank-track"><span style="width:'+x.percent+'%"></span></div>';
 home.innerHTML=base+'<small>Gelişimde ayrıntıları gör →</small>';
 detail.innerHTML=base+'<div class="fr-rank-grid">'+Object.entries(x.categories).map(([k,v])=>'<div><small>'+k+'</small><strong>'+v+' XP</strong></div>').join('')+'</div>';
}
function init(){const h=document.getElementById('frRankHome');if(!h)return;
 const open=()=>{if(typeof showView==='function')showView('progress');document.getElementById('frRankProgress')?.scrollIntoView({block:'start',behavior:'smooth'})};
 h.addEventListener('click',open);h.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();open()}});
 document.addEventListener('click',()=>setTimeout(render,120),true);document.addEventListener('change',()=>setTimeout(render,120),true);window.addEventListener('storage',render);document.addEventListener('visibilitychange',()=>{if(!document.hidden)render()});render();
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
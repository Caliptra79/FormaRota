/* FormaRota Rank — offline, read-only XP derived from existing records. */
(()=>{'use strict';
const tiers=[['Bronze',0,'🥉'],['Silver',1000,'🥈'],['Gold',3000,'🥇'],['Platinum',6000,'💠'],['Diamond',10000,'💎'],['Master',16000,'👑'],['FormaRota Legend',25000,'🏆']];
const read=(key,fallback)=>{try{return JSON.parse(localStorage.getItem(key))??fallback}catch{return fallback}};
const iso=d=>typeof d==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(d);
function day(row){for(const key of ['date','endedAt','completedAt','finishedAt']){const v=row?.[key];if(typeof v==='string'&&iso(v.slice(0,10)))return v.slice(0,10)}return ''}
function week(s){const a=s.split('-').map(Number),d=new Date(a[0],a[1]-1, a[2],12);d.setDate(d.getDate()-((d.getDay()+6)%7));return [d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-')}
const waterTarget=()=>{const n=Number(localStorage.getItem('formarota-water-goal-v1'));return n>=250&&n<=7000?n:2500};
const XP_GOALS_KEY='formarota-rank-goals-snapshot-v1';
function snapshotGoals(){let g=read(XP_GOALS_KEY,null);if(!g||!(Number(g.kcal)>0)||!(Number(g.protein)>0)){g={kcal:Number(document.getElementById('goalKcal')?.value)||2600,protein:Number(document.getElementById('goalProtein')?.value)||160};try{localStorage.setItem(XP_GOALS_KEY,JSON.stringify(g))}catch(e){}}return g}
function isCompleted(row,type){if(!row||row.status!=='finished')return false;if(type==='full')return row.items&&typeof row.items==='object'&&Object.keys(row.items).length>=13&&Object.values(row.items).reduce((n,sets)=>n+(Array.isArray(sets)?sets.filter(v=>v&&v.done===true).length:0),0)>=39;return true}
function tally(){
 const days=new Map(),entry=d=>{if(!days.has(d))days.set(d,{food:[],walk:0,water:0,full:0,abs:0});return days.get(d)};
 const foods=read('kocluk-food-log-v2',[]);if(Array.isArray(foods))foods.forEach(x=>{if(iso(x?.date)&&Number(x.amount)>0)entry(x.date).food.push(x)});
 for(const [key,col] of [['formarota-walks-v1','walk'],['formarota-water-v1','water']]){const obj=read(key,{});if(obj&&typeof obj==='object'&&!Array.isArray(obj))for(const [d,n] of Object.entries(obj))if(iso(d))entry(d)[col]=Math.max(0,Number(n)||0)}
 for(const [key,col] of [['kocluk-fitness-history-v1','full'],['formarota-abs-history-v1','abs']]){const rows=read(key,[]);if(Array.isArray(rows))rows.forEach(x=>{const d=day(x);if(d&&isCompleted(x,col))entry(d)[col]++})}
 const weeks=new Map();days.forEach((v,d)=>{const w=week(d);if(!weeks.has(w))weeks.set(w,[]);weeks.get(w).push(v)});
 const categories={Fitness:0,Beslenme:0,Aktivite:0,Düzenlilik:0};
 const goals=snapshotGoals(),kcalGoal=goals.kcal,proteinGoal=goals.protein;
 weeks.forEach(rows=>{let full=0,abs=0,active=0;for(const r of rows){
  if(r.food.length||r.full||r.abs||r.walk)active++;
  if(r.food.length){categories.Beslenme+=25;const meals=new Set(r.food.map(x=>x.meal)),k=r.food.reduce((n,x)=>n+(Number(x.kcal)||0),0),p=r.food.reduce((n,x)=>n+(Number(x.protein)||0),0);
   if(meals.size>=3&&kcalGoal>0&&proteinGoal>0&&k>=.85*kcalGoal&&k<=1.15*kcalGoal&&p>=.9*proteinGoal)categories.Beslenme+=15}
  if(r.walk>=5)categories.Aktivite+=25;
  if(r.water>=waterTarget())categories.Aktivite+=10;
  if(r.full&&full<3){categories.Fitness+=80;full++}
  if(r.abs&&abs<3){categories.Fitness+=35;abs++}
 }if(active>=5)categories.Düzenlilik+=60});
 const xp=Object.values(categories).reduce((a,b)=>a+b,0);let t=tiers[0],next=null;
 for(const tier of tiers){if(xp>=tier[1])t=tier;else{next=tier;break}}
 const span=(next?next[1]-t[1]:15000)/3,off=xp-t[1],stage=off>=2*span?2:off>=span?1:0;
 const start=t[1]+stage*span,end=t[1]+(stage+1)*span;
 return {xp,categories,title:t[0]+' '+['III','II','I'][stage],icon:t[2],remaining:Math.max(0,Math.ceil(end-xp)),percent:Math.max(0,Math.min(100,100*(xp-start)/(end-start)))};
}

/* Celebrate actual XP milestones only, not first launch or repeated rendering. */
const RANK_LAST_XP='formarota-rank-last-seen-xp-v1';
let celebrationBusy=false;
function milestone(xp){
 let last={value:0,label:'Bronze III',icon:'🥉'};
 for(let i=0;i<tiers.length;i++){
  const tier=tiers[i],next=tiers[i+1],width=(next?next[1]-tier[1]:15000)/3;
  for(let j=0;j<3;j++){const threshold=tier[1]+j*width;if(xp>=threshold)last={value:threshold,label:tier[0]+' '+['III','II','I'][j],icon:tier[2],tierIndex:i,stage:j}}
 }
 return last;
}
function ensureCelebrationStyle(){
 if(document.getElementById('fr-rank-celebration-style'))return;
 const st=document.createElement('style');st.id='fr-rank-celebration-style';
 st.textContent=`
 .fr-level-overlay{position:fixed;inset:0;z-index:90000;display:grid;place-items:center;background:rgba(5,11,19,.76);backdrop-filter:blur(12px);padding:20px;opacity:0;transition:opacity .28s ease}
 .fr-level-overlay.is-visible{opacity:1}
 .fr-level-dialog{position:relative;isolation:isolate;overflow:hidden;width:min(100%,380px);padding:32px 24px;text-align:center;border:1px solid color-mix(in srgb,var(--accent) 66%,var(--border));border-radius:28px;background:radial-gradient(circle at 50% 16%,color-mix(in srgb,var(--accent) 23%,var(--panel)),var(--panel) 67%);color:var(--text);box-shadow:0 25px 90px #0008}
 .fr-level-ring{position:absolute;width:230px;height:230px;border:2px solid color-mix(in srgb,var(--accent) 55%,transparent);border-radius:50%;top:19px;left:calc(50% - 115px);pointer-events:none}
 .fr-level-emblem{position:relative;display:block;font-size:80px;line-height:1.4;filter:drop-shadow(0 9px 20px color-mix(in srgb,var(--accent) 55%,transparent))}
 .fr-level-eyebrow{position:relative;font-weight:800;font-size:.78rem;letter-spacing:.18em;color:var(--accent)}
 .fr-level-dialog h2{position:relative;font-size:2rem;margin:8px 0 6px}
 .fr-level-dialog p{position:relative;color:var(--muted);margin:0 0 23px}
 .fr-level-dismiss{position:relative;min-width:145px}
 .fr-level-spark{position:absolute;top:40%;left:50%;height:7px;width:7px;border-radius:2px;background:var(--accent);pointer-events:none}
 .fr-level-overlay.is-visible .fr-level-ring{animation:fr-level-pulse 1.25s ease-out both}
 .fr-level-overlay.is-visible .fr-level-emblem{animation:fr-level-pop .85s cubic-bezier(.14,1.4,.3,1) both}
 .fr-level-overlay.is-visible .fr-level-spark{animation:fr-level-spark .95s ease-out both;animation-delay:var(--delay)}
 @keyframes fr-level-pop{0%{transform:scale(.4) rotate(-12deg);opacity:0}68%{transform:scale(1.17) rotate(4deg);opacity:1}100%{transform:scale(1) rotate(0)}}
 @keyframes fr-level-pulse{0%{transform:scale(.35);opacity:.9}100%{transform:scale(1.6);opacity:0}}
 @keyframes fr-level-spark{0%{opacity:0;transform:translate(0,0) scale(.3)}25%{opacity:1}100%{opacity:0;transform:rotate(var(--angle)) translateX(var(--distance)) scale(.2)}}
 @media(prefers-reduced-motion:reduce){.fr-level-overlay,.fr-level-overlay *{transition:none!important;animation:none!important}}
 `;
 document.head.appendChild(st);
}
function celebrate(current,previous){
 if(celebrationBusy||document.hidden)return;
 celebrationBusy=true;ensureCelebrationStyle();
 const major=current.tierIndex!==previous.tierIndex;
 const overlay=document.createElement('div');overlay.className='fr-level-overlay';overlay.setAttribute('role','dialog');overlay.setAttribute('aria-modal','true');overlay.setAttribute('aria-label','FormaRota seviye atlama kutlaması');
 const panel=document.createElement('div');panel.className='fr-level-dialog';
 const eyebrow=document.createElement('div');eyebrow.className='fr-level-eyebrow';eyebrow.textContent=major?'YENİ RANK AÇILDI':'SEVİYE ATLADIN';
 const ring=document.createElement('div');ring.className='fr-level-ring';
 const emblem=document.createElement('span');emblem.className='fr-level-emblem';emblem.textContent=current.icon;
 const title=document.createElement('h2');title.textContent=current.label;
 const subtitle=document.createElement('p');subtitle.textContent='FormaRota yolculuğunda yeni bir kilometre taşı!';
 const button=document.createElement('button');button.className='fr-level-dismiss';button.type='button';button.textContent='Devam et';
 panel.append(ring,eyebrow,emblem,title,subtitle,button);
 for(let i=0;i<16;i++){const dot=document.createElement('span');dot.className='fr-level-spark';dot.style.setProperty('--angle',i*22.5+'deg');dot.style.setProperty('--distance',105+(i%4)*16+'px');dot.style.setProperty('--delay',i%4*60+'ms');panel.appendChild(dot)}
 overlay.appendChild(panel);document.body.appendChild(overlay);const focus=document.activeElement;
 const finish=()=>{overlay.classList.remove('is-visible');setTimeout(()=>{overlay.remove();celebrationBusy=false;if(focus&&focus.isConnected&&typeof focus.focus==='function')focus.focus({preventScroll:true})},300)};
 button.addEventListener('click',finish,{once:true});overlay.addEventListener('click',e=>{if(e.target===overlay)finish()});const key=e=>{if(e.key==='Escape'){document.removeEventListener('keydown',key);finish()}};document.addEventListener('keydown',key);
 requestAnimationFrame(()=>{overlay.classList.add('is-visible');button.focus({preventScroll:true})});
}
function checkRankUp(xp){
 const now=milestone(xp),saved=localStorage.getItem(RANK_LAST_XP);
 if(saved===null){localStorage.setItem(RANK_LAST_XP,String(xp));return}
 const old=Math.max(0,Number(saved)||0);
 if(old===xp)return;
 localStorage.setItem(RANK_LAST_XP,String(xp));
 const previous=milestone(old);
 if(now.value>previous.value)celebrate(now,previous);
}

/* Achievements and four weekly progress charts, computed from existing offline records. */
const ACHIEVEMENTS=[
 ['first-workout','🏋️','İlk adım','İlk tamamlanan antrenman','bronze',x=>x.workouts>=1],
 ['five-workouts','💪','Isınma turu','5 tamamlanan antrenman','bronze',x=>x.workouts>=5],
 ['ten-workouts','💪','İstikrar','10 tamamlanan antrenman','silver',x=>x.workouts>=10],
 ['twentyfive-workouts','🏋️','Sağlam temel','25 tamamlanan antrenman','gold',x=>x.workouts>=25],
 ['fifty-workouts','🏆','Demir irade','50 tamamlanan antrenman','diamond',x=>x.workouts>=50],
 ['hundred-workouts','👑','100 antrenman','100 tamamlanan antrenman','legendary',x=>x.workouts>=100],
 ['first-walk','👟','İlk kilometre','Toplam 1 km yürüyüş','bronze',x=>x.km>=1],
 ['twentyfive-km','🥾','Yol arkadaşı','Toplam 25 km yürüyüş','silver',x=>x.km>=25],
 ['hundred-km','🗺️','100 kilometre','Toplam 100 km yürüyüş','gold',x=>x.km>=100],
 ['twohundredfifty-km','🌍','Yol ustası','Toplam 250 km yürüyüş','diamond',x=>x.km>=250],
 ['fivehundred-km','👑','500 kilometre','Toplam 500 km yürüyüş','legendary',x=>x.km>=500],
 ['first-food-day','🥗','İlk öğün','İlk beslenme kayıt günü','bronze',x=>x.foodDays>=1],
 ['seven-food-days','🥗','Beslenme günlüğü','7 ayrı gün beslenme kaydı','silver',x=>x.foodDays>=7],
 ['thirty-food-days','🍽️','Düzenli takip','30 ayrı gün beslenme kaydı','gold',x=>x.foodDays>=30],
 ['ninety-food-days','🌱','Sağlam alışkanlık','90 ayrı gün beslenme kaydı','diamond',x=>x.foodDays>=90],
 ['oneeighty-food-days','👑','Beslenme efsanesi','180 ayrı gün beslenme kaydı','legendary',x=>x.foodDays>=180],
 ['five-active-weeks','🌟','Beş haftalık emek','En az 5 aktif haftaya ulaş','silver',x=>x.activeWeeks>=5],
 ['twelve-active-weeks','⭐','İstikrar mevsimi','En az 12 aktif haftaya ulaş','gold',x=>x.activeWeeks>=12],
 ['twentyfour-active-weeks','💠','Uzun soluk','En az 24 aktif haftaya ulaş','diamond',x=>x.activeWeeks>=24],
 ['fiftytwo-active-weeks','👑','Bir yıllık yolculuk','En az 52 aktif haftaya ulaş','legendary',x=>x.activeWeeks>=52]
];
const BADGE_TIERS={bronze:'🥉 Bronze',silver:'🥈 Silver',gold:'🥇 Gold',diamond:'💎 Diamond',legendary:'👑 Legendary'};
function historySummary(){
 const foods=read('kocluk-food-log-v2',[]),walks=read('formarota-walks-v1',{}),full=read('kocluk-fitness-history-v1',[]),abs=read('formarota-abs-history-v1',[]);
 const dayMap=new Map(),get=d=>{if(!dayMap.has(d))dayMap.set(d,{food:false,walk:0,workouts:0,kcal:0,protein:0});return dayMap.get(d)};
 if(Array.isArray(foods))for(const x of foods){if(!iso(x?.date)||!(Number(x.amount)>0))continue;const v=get(x.date);v.food=true;v.kcal+=Math.max(0,Number(x.kcal)||0);v.protein+=Math.max(0,Number(x.protein)||0)}
 if(walks&&typeof walks==='object'&&!Array.isArray(walks))for(const [d,n] of Object.entries(walks))if(iso(d))get(d).walk=Math.max(0,Number(n)||0);
 for(const [rows,type] of [[full,'full'],[abs,'abs']])if(Array.isArray(rows))for(const x of rows){const d=day(x);if(d&&isCompleted(x,type))get(d).workouts++}
 const weeks=new Map();dayMap.forEach((v,d)=>{const key=week(d);if(!weeks.has(key))weeks.set(key,{workouts:0,walk:0,foodDays:0,activeDays:0,protein:0,proteinDays:0});const w=weeks.get(key);w.workouts+=v.workouts;w.walk+=v.walk;if(v.food){w.foodDays++;w.protein+=v.protein;w.proteinDays++}if(v.food||v.walk>0||v.workouts>0)w.activeDays++});
 const stats={workouts:0,km:0,foodDays:0,activeWeeks:0};dayMap.forEach(v=>{stats.workouts+=v.workouts;stats.km+=v.walk;if(v.food)stats.foodDays++});weeks.forEach(w=>{if(w.activeDays>=3)stats.activeWeeks++});
 return {stats,weeks};
}
function achievementMarkup(stats){
 const unlocked=ACHIEVEMENTS.filter(a=>a[5](stats)).length;
 return '<div class="fr-achievements"><h3>🎖️ Başarı rozetleri <small>'+unlocked+'/'+ACHIEVEMENTS.length+' kazanıldı</small></h3><p class="muted">Bronze → Silver → Gold → Diamond → Legendary · Eski kayıtlar da sayılır.</p><div class="fr-badge-grid">'+ACHIEVEMENTS.map(a=>{const yes=a[5](stats);return '<div class="fr-badge '+(yes?'earned':'locked')+' tier-'+a[4]+'" aria-label="'+a[2]+', '+BADGE_TIERS[a[4]]+(yes?', kazanıldı':', kilitli')+'"><span aria-hidden="true">'+(yes?a[1]:'🔒')+'</span><strong>'+a[2]+'</strong><small>'+a[3]+'</small><em>'+BADGE_TIERS[a[4]]+'</em></div>'}).join('')+'</div></div>';
}
function graphMarkup(weeks){
 const all=[...weeks.entries()].sort((a,b)=>a[0].localeCompare(b[0]));const recent=all.slice(-8),labels=recent.map(x=>x[0].slice(5)),values=[
 ['🏋️ Güç / Antrenman','Tamamlanan seans',recent.map(x=>x[1].workouts),'seans'],
 ['🏃 Dayanıklılık','Yürüyüş mesafesi',recent.map(x=>x[1].walk),'km'],
 ['🥗 Beslenme','Beslenme kaydedilen gün',recent.map(x=>x[1].foodDays),'gün'],
 ['📅 Disiplin','Aktif gün sayısı',recent.map(x=>x[1].activeDays),'gün']
 ];
 return '<div class="fr-stats-charts"><h3>📊 Gelişim istatistikleri</h3><p class="muted">Son 8 kayıtlı haftan. Güç, tamamlanan seanslarla temsil edilir; gerçek kas kuvveti ölçümü değildir.</p><div class="fr-charts-grid">'+values.map(([name,desc,points,unit])=>{const max=Math.max(1,...points),v=points.length?points:[],bars=v.map((p,i)=>'<div class="fr-chart-column"><div class="fr-chart-val">'+Number(p.toFixed(1)).toLocaleString('tr-TR')+'</div><div class="fr-chart-bar" style="height:'+Math.max(p>0?6:2,Math.round(p/max*80))+'px"></div><small>'+labels[i]+'</small></div>').join('');return '<div class="fr-chart"><strong>'+name+'</strong><small>'+desc+' ('+unit+')</small><div class="fr-chart-bars">'+(bars||'<div class="muted">Henüz veri yok. İlk kaydını oluştur!</div>')+'</div></div>'}).join('')+'</div></div>';
}
function ensureProgressStyles(){
 if(document.getElementById('fr-rank-extras-style'))return;
 const st=document.createElement('style');st.id='fr-rank-extras-style';st.textContent=`
 .fr-achievements,.fr-stats-charts{margin-top:24px}.fr-achievements h3,.fr-stats-charts h3{margin:0 0 10px}.fr-achievements h3 small{color:var(--muted);font-size:.76rem;font-weight:400}
 .fr-badge-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(125px,1fr));gap:10px}
 .fr-badge{border:1px solid var(--border);background:var(--panel2);border-radius:15px;padding:13px 9px;text-align:center;display:flex;align-items:center;flex-direction:column;gap:5px}
 .fr-badge span{font-size:28px}.fr-badge strong{font-size:.86rem}.fr-badge small{font-size:.72rem;color:var(--muted);line-height:1.3}.fr-badge em{font-size:.68rem;font-weight:800;font-style:normal;letter-spacing:.03em;margin-top:auto;padding:3px 8px;border-radius:99px;background:var(--panel);color:var(--accent)}.fr-badge.tier-bronze{--badge-tone:#b98155}.fr-badge.tier-silver{--badge-tone:#9aaabb}.fr-badge.tier-gold{--badge-tone:#d3ac49}.fr-badge.tier-diamond{--badge-tone:#79b4ec}.fr-badge.tier-legendary{--badge-tone:#bc81eb}.fr-badge.earned{border-color:var(--badge-tone)!important;box-shadow:inset 0 0 0 1px color-mix(in srgb,var(--badge-tone) 30%,transparent)}.fr-badge.earned em{color:var(--badge-tone)}.fr-badge.locked{opacity:.6}.fr-badge.earned{border-color:color-mix(in srgb,var(--accent) 45%,var(--border));background:color-mix(in srgb,var(--accent) 8%,var(--panel2))}
 .fr-charts-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:12px}.fr-chart{border:1px solid var(--border);background:var(--panel2);border-radius:15px;padding:13px;min-width:0}.fr-chart>small{display:block;color:var(--muted);margin-top:3px}
 .fr-chart-bars{display:flex;align-items:flex-end;justify-content:space-around;gap:5px;min-height:130px;margin-top:14px;padding-bottom:3px}.fr-chart-column{min-width:0;flex:1;display:flex;flex-direction:column;align-items:center;justify-content:end;gap:4px}.fr-chart-val{font-size:.72rem;font-variant-numeric:tabular-nums}.fr-chart-bar{width:min(90%,25px);background:var(--accent);border-radius:5px 5px 2px 2px}.fr-chart-column small{font-size:.68rem;color:var(--muted)}
 `;document.head.appendChild(st);
}
function render(){
 const home=document.getElementById('frRankHome'),detail=document.getElementById('frRankFull');if(!home||!detail)return;
 const x=tally();checkRankUp(x.xp);const base='<div class="fr-rank-row"><span class="fr-rank-icon">'+x.icon+'</span><div><small>FORMA ROTA RANK</small><strong>'+x.title+'</strong><small>'+x.xp.toLocaleString('tr-TR')+' XP · Sonraki seviye için '+x.remaining.toLocaleString('tr-TR')+' XP</small></div></div><div class="fr-rank-track"><span style="width:'+x.percent+'%"></span></div>';
 home.innerHTML=base+'<small>Gelişimde ayrıntıları gör →</small>';
 detail.innerHTML=base+'<div class="fr-rank-grid">'+Object.entries(x.categories).map(([k,v])=>'<div><small>'+k+'</small><strong>'+v+' XP</strong></div>').join('')+'</div>';ensureProgressStyles();const progress=historySummary();detail.insertAdjacentHTML('beforeend',achievementMarkup(progress.stats)+graphMarkup(progress.weeks));
}
function init(){const h=document.getElementById('frRankHome');if(!h)return;
 const open=()=>{if(typeof showView==='function')showView('progress');document.getElementById('frRankProgress')?.scrollIntoView({block:'start',behavior:'smooth'})};
 h.addEventListener('click',open);h.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();open()}});
 document.addEventListener('click',()=>setTimeout(render,120),true);document.addEventListener('change',()=>setTimeout(render,120),true);window.addEventListener('storage',render);document.addEventListener('visibilitychange',()=>{if(!document.hidden)render()});render();
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
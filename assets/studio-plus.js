/* FormaRota Studio Plus — progressive visual layer.
   No stored data is altered; reads the exact existing local storage keys. */
(function(root){
 'use strict';
 const doc=root.document,metrics=root.FormaRotaStudioPlusMetrics;
 if(!doc||!metrics)return;
 const key=Object.freeze({
  logs:'kocluk-food-log-v2',water:'formarota-water-v1',walk:'formarota-walks-v1',
  weights:'kocluk-weight-v1',history:'kocluk-fitness-history-v1',
  current:'kocluk-fitness-current-v1'
 });
 const byId=id=>doc.getElementById(id);
 const el=(tag,cls,value)=>{
  const node=doc.createElement(tag);
  if(cls)node.className=cls;
  if(value!==undefined)node.textContent=value;
  return node;
 };
 const read=(name,fallback)=>{
  try{
   const raw=root.localStorage?.getItem(name);
   if(raw===null||raw===undefined)return fallback;
   const decoded=JSON.parse(raw);
   return decoded===null?fallback:decoded;
  }catch{return fallback}
 };
 const fmt=x=>new Intl.NumberFormat('tr-TR',{maximumFractionDigits:1}).format(x);
 const safeNumber=(x,fallback=0)=>{
  const n=Number(x);return Number.isFinite(n)?n:fallback;
 };
 const safeMap=x=>x&&typeof x==='object'&&!Array.isArray(x)?x:{};
 const workoutIds=()=>{
  const moves=Array.isArray(root.formaRotaFitnessCatalog)?root.formaRotaFitnessCatalog:[];
  return moves.map(x=>x.id);
 };
 const day=()=>metrics.localISO(new Date());
 let lastWeekSignature='',lastRingSignature='';
 const ringConfig=[
  {id:'kcal',name:'Kalori',icon:'🔥',unit:'kcal',color:'coral'},
  {id:'protein',name:'Protein',icon:'⚡',unit:'g',color:'violet'},
  {id:'water',name:'Su',icon:'💧',unit:'ml',color:'blue'},
  {id:'workout',name:'Antrenman',icon:'🏋️',unit:'set',color:'mint'}
 ];
 function nutritionToday(){
  const today=day();
  const rows=read(key.logs,[]);
  const valid=Array.isArray(rows)?rows.filter(x=>x?.date===today):[];
  const total=name=>valid.reduce((sum,x)=>sum+Math.max(0,safeNumber(x[name])),0);
  const current=read(key.current,null);
  const ids=workoutIds();
  const abs=root.FormaRotaABS?.selectedProgress?.();
  return [
   metrics.progress(total('kcal'),safeNumber(byId('goalKcal')?.value,2600)||2600),
   metrics.progress(total('protein'),safeNumber(byId('goalProtein')?.value,160)||160),
   metrics.progress(safeNumber(safeMap(read(key.water,{}))[today]),safeNumber(byId('waterGoal')?.value,2500)||2500),
   abs?.selected==='abs'?metrics.progress(abs.count,12):metrics.progress(metrics.workoutSets(current,ids),39)
  ];
 }
 function buildRing(config,measurement){
  const card=el('div','sp-goal-card sp-'+config.color);
  const graphic=el('div','sp-goal-ring');
  graphic.setAttribute('role','progressbar');
  graphic.setAttribute('aria-label',config.name+' günlük hedef ilerlemesi');
  graphic.setAttribute('aria-valuemin','0');
  graphic.setAttribute('aria-valuemax',String(measurement.goal));
  graphic.setAttribute('aria-valuenow',String(Math.min(measurement.value,measurement.goal)));
  graphic.style.setProperty('--sp-progress',measurement.pct+'%');
  const center=el('div','sp-goal-center');
  const ico=el('span','sp-goal-emoji',config.icon);ico.setAttribute('aria-hidden','true');
  center.append(ico,el('strong','sp-goal-percent',measurement.pct+'%'));
  graphic.append(center);
  const content=el('div','sp-goal-content');
  content.append(el('strong','sp-goal-title',config.name),
   el('div','sp-goal-value',fmt(measurement.value)+' / '+fmt(measurement.goal)),
   el('small','sp-goal-unit',config.unit));
  card.append(graphic,content);
  return card;
 }
 function renderRings(){
  const host=byId('spProgressRings');if(!host)return;
  const progress=nutritionToday();
  const absSelected=root.FormaRotaABS?.selectedProgress?.()?.selected==='abs';
  const signature=day()+'|'+String(absSelected)+'|'+progress.map(x=>x.value+':'+x.goal).join('|');
  if(signature===lastRingSignature&&host.childElementCount===4)return;
  lastRingSignature=signature;
  const fragment=doc.createDocumentFragment();
  progress.forEach((measure,i)=>fragment.append(buildRing(i===3&&absSelected?{...ringConfig[i],name:'ABS'}:ringConfig[i],measure)));
  host.replaceChildren(fragment);
 }
 function weeklyData(){
  return metrics.week({
   asOf:new Date(),
   logs:read(key.logs,[]),sessions:read(key.history,[]),
   absCompletedDates:[...(root.FormaRotaABSEngine?.completedDates?.(read('formarota-abs-history-v1',[]))||new Set())],
   weights:read(key.weights,[]),
   water:safeMap(read(key.water,{})),walk:safeMap(read(key.walk,{})),
   moveIds:workoutIds()
  });
 }
 const labels=['Pzt','Sal','Çar','Per','Cum','Cmt','Paz'];
 function weekTiles(result){
  const row=el('div','sp-week-days');
  result.daily.forEach((d,i)=>{
   const tile=el('div','sp-week-day'+(d.active?' active':'')+(d.future?' future':''));
   const activity=d.future?'Gelecek gün':[
    d.loggedMeals?'Beslenme kaydı':'',
    d.fullWorkout?'Tam Full Body':'',d.absWorkout?'ABS tamamlandı':'',
    d.waterMl>0?'Su kaydı':'',
    d.walkKm>0?'Yürüyüş kaydı':''
   ].filter(Boolean).join(', ')||'Kayıt yok';
   tile.title=d.date+' · '+activity;
   tile.setAttribute('aria-label',d.date+' '+activity);
   tile.append(el('span','sp-day-name',labels[i]));
   const marks=el('div','sp-day-marks');
   for(const [yes,cls] of [[d.loggedMeals>0,'food'],[d.fullWorkout||d.absWorkout,'fitness'],[d.walkKm>0,'walk']]){
    const dot=el('i','sp-day-mark'+(yes?' on '+cls:''));dot.setAttribute('aria-hidden','true');marks.append(dot);
   }
   tile.append(marks);
   row.append(tile);
  });
  return row;
 }
 function infoCard(icon,name,value,sub,skin){
  const card=el('div','sp-story-stat '+skin);
  const head=el('div','sp-story-stat-head');
  const symbol=el('span','sp-story-icon',icon);symbol.setAttribute('aria-hidden','true');
  head.append(symbol,el('span','',name));
  card.append(head,el('strong','sp-story-number',value),el('small','',sub));
  return card;
 }
 function renderWeek(){
  const a=byId('spWeekStory'),b=byId('spWeekTeaser');if(!a&&!b)return;
  const data=weeklyData();
  const signature=JSON.stringify(data);
  if(signature===lastWeekSignature&&a?.childElementCount)return;
  lastWeekSignature=signature;
  if(a){
   const header=el('div','sp-week-head');
   const intro=el('div');
   intro.append(el('div','sp-overline','✦ FORMAROTA / WEEKLY STORY'),
    el('h2','','Bu haftanın hikâyesi'),
    el('p','','Gerçek kayıtlarınla oluşan küçük bir ilerleme özeti.'));
   header.append(intro);
   const milestone=el('span','sp-week-milestone',data.award?'✦ '+data.award:'Kendi hızında ilerle');
   header.append(milestone);
   const grid=el('div','sp-story-stats');
   grid.append(
    infoCard('🍽','Beslenme',data.avgKcal===null?'—':fmt(data.avgKcal)+' kcal',
     data.daysRecorded+' kayıtlı gün ortalaması · tam gün olmayabilir','coral'),
    infoCard('⚡','Protein',data.avgProtein===null?'—':fmt(data.avgProtein)+' g',
     'Kayıtlı '+data.daysRecorded+' günün ortalaması','violet'),
    infoCard('🏋️','Tam Full Body',String(data.fullWorkoutDays),
     '39 geçerli setli farklı gün','mint'),
    infoCard('⚖','Kilo farkı',data.weightDelta===null?'—':(data.weightDelta>0?'+':'')+fmt(data.weightDelta)+' kg',
     data.weightDelta===null?'En az iki farklı tarihte tartı gerekir':'Bu haftanın ilk ve son tartısı','blue')
   );
   const rhythm=el('div','sp-rhythm');
   rhythm.append(el('strong','','7 günlük ritim'),el('p','','Renkli noktalar sırasıyla öğün kaydı, tam antrenman ve yürüyüşü gösterir.'));
   rhythm.append(weekTiles(data));
   const footer=el('div','sp-story-footer');
   footer.append(el('span','',fmt(data.walkTotal)+' km yürüyüş'),
    el('span','',fmt(data.waterTotal)+' ml su'),
    el('span','',data.daysActive+'/7 etkin gün'));
   a.replaceChildren(header,grid,rhythm,footer);
  }
  if(b){
   const title=el('div','sp-week-teaser-head');
   title.append(el('strong','','✦ Bu haftan'),
    el('span','',data.daysActive+'/7 etkin gün'));
   const subtitle=el('div','sp-week-teaser-sub','Tam Full Body: '+data.fullWorkoutDays+' gün · Öğün kaydı: '+data.daysRecorded+' gün');
   const btn=el('button','sp-week-open','Hikâyeyi aç ↗');btn.type='button';
   btn.addEventListener('click',()=>{
    if(typeof root.showView==='function')root.showView('insights');
    else doc.querySelector('[data-tab="insights"]')?.click();
   });
   b.replaceChildren(title,weekTiles(data),subtitle,btn);
  }
 }
 function markExerciseCards(){
  const list=byId('fitExerciseList');
  if(!list)return;
  const catalog=Array.isArray(root.formaRotaFitnessCatalog)?root.formaRotaFitnessCatalog:[];
  const names=new Map(catalog.map(x=>[x.id,x]));
  for(const card of list.querySelectorAll('.fit-card')){
   const move=names.get(card.dataset.move);
   if(!move||card.querySelector('.sp-move-heading'))continue;
   card.classList.add('sp-move-card');
   card.dataset.group=move.group||'Other';
   const done=card.querySelectorAll('.fit-set.done').length;
   card.dataset.complete=String(done===3);
   const body=card.querySelector('.fit-nametop')?.parentElement;
   const headline=card.querySelector('.fit-nametop');
   if(!body||!headline)continue;
   const ribbon=el('div','sp-move-heading');
   const info=el('span','sp-move-label',done===3?'✓ HAREKET TAMAMLANDI':'ANTRENMAN / '+String(root.formaRotaFitnessGroupLabels?.[move.group]||move.group).toLocaleUpperCase('tr-TR'));
   const count=el('strong','sp-move-count',done+'/3 SET');
   ribbon.append(info,count);
   body.insertBefore(ribbon,headline);
   const dots=el('div','sp-move-dots');
   for(let i=0;i<3;i++){
    const dot=el('span','sp-move-dot'+(i<done?' done':''));
    dot.setAttribute('aria-hidden','true');dots.append(dot);
   }
   dots.setAttribute('aria-label',done+'/3 set kaydedildi');
   body.insertBefore(dots,headline.nextSibling);
  }
 }
 function toast(message,major=false){
  if(root.FormaRotaLuxe?.toast)root.FormaRotaLuxe.toast(message,major?'success':'info');
 }
 function onSetSaved(id,i){
  if(typeof id!=='string'||!Number.isInteger(i))return false;
  const current=read(key.current,null);
  const ids=workoutIds();
  const sets=current?.items?.[id];
  if(!Array.isArray(sets)||!sets[i]?.done)return false;
  const done=sets.filter(x=>x?.done===true).length;
  const card=[...doc.querySelectorAll('#fitExerciseList .fit-card')].find(x=>x.dataset.move===id);
  if(card){
   card.classList.remove('sp-set-flash','sp-move-finished');
   // Freshly reconstructed exercise rows keep completion accents.
   card.classList.add(done===3?'sp-move-finished':'sp-set-flash');
   const dot=card.querySelectorAll('.sp-move-dot')[i];
   if(dot)dot.classList.add('done');
  }
  const move=(root.formaRotaFitnessCatalog||[]).find(x=>x.id===id);
  if(done===3)toast((move?.name||'Hareket')+' · 3 set tamamlandı ✓',true);
  else toast('Set '+(i+1)+' kaydedildi ✓');
  renderRings();
  if(done===3)renderWeek();
  return true;
 }
 function refresh(){
  renderRings();renderWeek();markExerciseCards();
 }
 function init(){
  // Extra panels are embedded in the existing view, never a new route or stored key.
  const list=byId('fitExerciseList');
  if(list&&typeof MutationObserver!=='undefined'){
   // Observe only direct card changes; our embellishments do not re-render the list.
   const observer=new MutationObserver(markExerciseCards);
   observer.observe(list,{childList:true});
  }
  const goals=byId('goalKcal');
  for(const input of [goals,byId('goalProtein'),byId('waterGoal')]){
   input?.addEventListener('change',refresh);
  }
  doc.addEventListener('visibilitychange',()=>{if(doc.visibilityState==='visible')refresh()});
  root.addEventListener('pageshow',refresh);
  refresh();
 }
 root.FormaRotaStudioPlus=Object.freeze({refresh,renderRings,renderWeek,markExerciseCards,onSetSaved,weeklyData});
 if(doc.readyState==='loading')doc.addEventListener('DOMContentLoaded',init,{once:true});
 else init();
})(window);

/* FormaRota Rota Haritasi — offline, read-only journey from recorded days.
 * A calendar day contributes at most one route day, whatever the number of records.
 * No calorie deficit, fast weight loss, or extra training earns route progress.
 */
(function(root){
 'use strict';
 const STAGES=Object.freeze([
  Object.freeze({id:'camp',name:'Başlangıç Kampı',icon:'⛺',days:0,x:12.5,y:90.5,desc:'Her yolculuk küçük bir başlangıçla açılır.'}),
  Object.freeze({id:'forest',name:'Disiplin Ormanı',icon:'🌲',days:5,x:40,y:73.3,desc:'İstikrarlı kayıtlar yolunu görünür kılıyor.'}),
  Object.freeze({id:'valley',name:'Dayanıklılık Vadisi',icon:'🌄',days:12,x:26.3,y:52.9,desc:'Küçük adımlar birikerek alışkanlığa dönüşüyor.'}),
  Object.freeze({id:'mountains',name:'Güç Dağları',icon:'🏔️',days:24,x:71.3,y:35.7,desc:'Dengeli ilerlemen yeni ufuklar açıyor.'}),
  Object.freeze({id:'summit',name:'Zirve',icon:'🏆',days:40,x:86.3,y:13.1,desc:'Kırk farklı kayıt günü: yolculuğunun önemli bir durağı.'})
 ]);
 const doc=root.document;
 const byId=id=>doc?.getElementById?.(id);
 const localDay=()=>{
  const d=new Date();return [d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-');
 };
 function validDate(day,today){
  if(typeof day!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(day)||day>today)return false;
  const [y,m,d]=day.split('-').map(Number),date=new Date(y,m-1,d,12);
  return date.getFullYear()===y&&date.getMonth()===m-1&&date.getDate()===d;
 }
 function weekStart(day){
  const [y,m,d]=day.split('-').map(Number),date=new Date(y,m-1,d,12);
  date.setDate(date.getDate()-((date.getDay()+6)%7));
  return [date.getFullYear(),String(date.getMonth()+1).padStart(2,'0'),String(date.getDate()).padStart(2,'0')].join('-');
 }
 function read(key,fallback){
  try{const stored=root.localStorage?.getItem(key);return stored==null?fallback:JSON.parse(stored)??fallback;}
  catch{return fallback;}
 }
 function records(){
  return {
   foods:read('kocluk-food-log-v2',[]),
   water:read('formarota-water-v1',{}),
   walks:read('formarota-walks-v1',{}),
   full:read('kocluk-fitness-history-v1',[]),
   abs:read('formarota-abs-history-v1',[])
  };
 }
 const isPositive=value=>value!==''&&value!=null&&Number.isFinite(Number(value))&&Number(value)>0;
 function completedFull(row,validator){
  if(!row||row.status!=='finished')return false;
  if(typeof validator==='function')return validator(row)===true;
  const items=row.items;
  if(!items||typeof items!=='object'||Array.isArray(items)||Object.keys(items).length!==13)return false;
  return Object.values(items).every(sets=>Array.isArray(sets)&&sets.length===3&&sets.every(s=>
   s?.done===true&&Number.isFinite(Number(s.reps))&&Number(s.reps)>=1&&
   Number.isFinite(Number(s.weight))&&Number(s.weight)>=0));
 }
 function completedAbs(row,validator){
  if(!row||row.status!=='finished')return false;
  if(typeof validator==='function')return validator(row)===true;
  const items=row.items;
  return !!items&&typeof items==='object'&&!Array.isArray(items)&&
   ['heel-touch','half-crunch','reverse-crunch','plank'].every(id=>
    Array.isArray(items[id])&&items[id].length===3&&items[id].every(s=>s?.done===true));
 }
 function snapshot(source={},today=localDay(),validators={}){
  const activity=new Set();
  const include=date=>{if(validDate(date,today))activity.add(date);};
  if(Array.isArray(source.foods))for(const row of source.foods){
   if(isPositive(row?.amount))include(row.date);
  }
  for(const key of ['water','walks']){
   const map=source[key];
   if(!map||typeof map!=='object'||Array.isArray(map))continue;
   for(const [day,value] of Object.entries(map)){
    if(isPositive(value)&&Number(value)<=(key==='walks'?100:7000))include(day);
   }
  }
  if(Array.isArray(source.full))for(const row of source.full)
   if(completedFull(row,validators.full))include(row.date);
  if(Array.isArray(source.abs))for(const row of source.abs)
   if(completedAbs(row,validators.abs))include(row.date);
  const sorted=[...activity].sort();
  const days=sorted.length,weeks=new Set(sorted.map(weekStart)).size;
  let stage=0;
  STAGES.forEach((s,i)=>{if(days>=s.days)stage=i;});
  const next=STAGES[stage+1]||null;
  const remaining=next?next.days-days:0;
  const nextPercent=next?Math.min(100,Math.round((days-STAGES[stage].days)/(next.days-STAGES[stage].days)*100)):100;
  return {days,weeks,stage,next,remaining,nextPercent,routePercent:Math.min(100,days/STAGES[STAGES.length-1].days*100),lastDay:sorted.at(-1)||null};
 }
 function currentSnapshot(){
  const metric=root.FormaRotaStudioPlusMetrics;
  const catalog=root.formaRotaFitnessCatalog;
  const isFull=metric&&Array.isArray(catalog)&&catalog.length===13&&typeof metric.fullSession==='function'?
   s=>metric.fullSession(s,catalog.map(x=>x.id)):undefined;
  const abs=root.FormaRotaABSEngine?.finished;
  return snapshot(records(),localDay(),{full:isFull,abs});
 }
 const el=(tag,cls,content)=>{
  const n=doc.createElement(tag);if(cls)n.className=cls;
  if(content!==undefined)n.textContent=content;return n;
 };
 let selected=0,queued=false,built=false;
 function openRoute(){
  if(typeof root.showView==='function')root.showView('progress');
  else doc.querySelector('.mobile-tabbar [data-tab="progress"]')?.click();
  const panel=byId('frRoutePanel');
  if(panel)(root.requestAnimationFrame||((f)=>f()))(()=>panel.scrollIntoView({behavior:'smooth',block:'start'}));
 }
 function build(){
  const area=byId('frRouteStage'),map=byId('frRouteMap');
  if(!area||!map||built)return;
  built=true;
  const art=doc.createElementNS('http://www.w3.org/2000/svg','svg');
  art.setAttribute('viewBox','0 0 400 420');art.setAttribute('preserveAspectRatio','xMidYMid meet');
  art.setAttribute('class','fr-route-art');art.setAttribute('aria-hidden','true');
  art.innerHTML='<defs><linearGradient id="frRouteTerrain" x1="0" x2="1" y1="1" y2="0"><stop offset="0" stop-color="#306c54" stop-opacity=".20"/><stop offset=".55" stop-color="#6e8b91" stop-opacity=".12"/><stop offset="1" stop-color="#dcc48b" stop-opacity=".16"/></linearGradient></defs>'+
   '<path d="M0 395 L80 315 154 355 210 258 310 294 400 204 400 420 0 420 Z" fill="url(#frRouteTerrain)"/>'+
   '<path d="M0 330 L79 248 152 285 241 173 310 203 400 88" stroke="currentColor" stroke-opacity=".13" stroke-width="2" fill="none"/>'+
   '<path d="M0 347 L79 265 152 302 241 190 310 220 400 105" stroke="currentColor" stroke-opacity=".10" stroke-width="2" fill="none"/>'+
   '<path class="fr-route-road-base" d="M50 380 C40 328 125 362 160 308 S36 270 105 222 S270 249 285 150 S310 115 345 55" fill="none" pathLength="100"/>'+
   '<path id="frRouteRoadProgress" class="fr-route-road-progress" d="M50 380 C40 328 125 362 160 308 S36 270 105 222 S270 249 285 150 S310 115 345 55" fill="none" pathLength="100" stroke-dasharray="0 100"/>';
  map.append(art);
  const markers=el('div','fr-route-markers');
  STAGES.forEach((stage,i)=>{
   const button=el('button','fr-route-pin',stage.icon);
   button.type='button';button.style.left=stage.x+'%';button.style.top=stage.y+'%';
   button.dataset.routeIndex=String(i);button.setAttribute('aria-label',stage.name);
   button.addEventListener('click',()=>{selected=i;render();});
   markers.append(button);
  });
  map.append(markers);
  const list=el('div','fr-route-stops');list.setAttribute('role','group');list.setAttribute('aria-label','Harita durakları');
  STAGES.forEach((stage,i)=>{
   const button=el('button','fr-route-stop');
   button.type='button';button.dataset.routeIndex=String(i);
   button.append(el('span','fr-route-stop-icon',stage.icon));
   const copy=el('span','fr-route-stop-copy');
   copy.append(el('strong','',stage.name),el('small','',stage.days===0?'Başlangıç':stage.days+' aktif gün'));
   button.append(copy,el('span','fr-route-stop-status',''));
   button.addEventListener('click',()=>{selected=i;render();});
   list.append(button);
  });
  area.append(list);
  byId('frRouteHomeOpen')?.addEventListener('click',openRoute);
 }
 function render(){
  if(!doc||!byId('frRoutePanel')||!byId('frRouteHome'))return;
  build();
  const data=currentSnapshot();
  const stage=STAGES[data.stage],next=data.next;
  const set=(id,value)=>{const n=byId(id);if(n)n.textContent=value;};
  set('frRouteHomeName',stage.icon+' '+stage.name);
  set('frRouteHomeMeta',data.days+' aktif gün · '+data.weeks+' aktif hafta'+(next?' · Sıradaki: '+next.name:' · Zirveye ulaşıldı'));
  set('frRouteCount',data.days+' aktif gün');
  set('frRouteWeeks',data.weeks+' aktif hafta');
  set('frRouteCurrent',stage.name);
  set('frRouteNext',next?next.name+' için '+data.remaining+' aktif gün daha':'Tüm bölgeler açıldı!');
  const progress=byId('frRouteNextBar');
  if(progress){progress.style.width=data.nextPercent+'%';progress.parentElement?.setAttribute('aria-valuenow',String(data.nextPercent));}
  const homeBar=byId('frRouteHomeBar');if(homeBar)homeBar.style.width=data.routePercent+'%';
  const road=byId('frRouteRoadProgress');if(road)road.setAttribute('stroke-dasharray',data.routePercent+' 100');
  for(const n of doc.querySelectorAll('[data-route-index]')){
   const i=Number(n.dataset.routeIndex),s=STAGES[i];
   const open=data.days>=s.days;
   n.classList.toggle('is-unlocked',open);
   n.classList.toggle('is-locked',!open);
   n.classList.toggle('is-selected',selected===i);
   n.classList.toggle('is-current',data.stage===i);
   n.setAttribute('aria-pressed',String(selected===i));
   n.setAttribute('aria-label',s.name+(open?' · Açıldı':' · '+s.days+' aktif günde açılır'));
   if(n.classList.contains('fr-route-stop'))n.querySelector('.fr-route-stop-status').textContent=open?'✓':'🔒';
  }
  const chosen=STAGES[selected],unlocked=data.days>=chosen.days;
  set('frRouteSelectedTitle',chosen.icon+' '+chosen.name);
  set('frRouteSelectedState',unlocked?(selected===data.stage?'Şu anki bölgen':'Açıldı'):'Kilitli · '+Math.max(0,chosen.days-data.days)+' aktif gün kaldı');
  set('frRouteSelectedDesc',chosen.desc);
  const details=byId('frRouteSelected');
  if(details)details.dataset.locked=String(!unlocked);
 }
 function schedule(){
  if(queued||(!byId('frRouteHome')&&!byId('frRoutePanel')))return;
  queued=true;
  const refresh=()=>{queued=false;render();};
  if(typeof root.requestAnimationFrame==='function')root.requestAnimationFrame(refresh);
  else Promise.resolve().then(refresh);
 }
 function init(){
  if(!byId('frRouteHome')||!byId('frRoutePanel'))return;
  build();render();
  doc.addEventListener('click',schedule);
  doc.addEventListener('change',schedule);
  doc.addEventListener('visibilitychange',()=>{if(doc.visibilityState==='visible')schedule();});
  root.addEventListener?.('pageshow',schedule);
  root.addEventListener?.('storage',schedule);
 }
 root.FormaRotaRouteMap=Object.freeze({STAGES,snapshot,records,currentSnapshot,render,schedule});
 if(doc){
  if(doc.readyState==='loading')doc.addEventListener('DOMContentLoaded',init,{once:true});
  else init();
 }
})(typeof window!=='undefined'?window:globalThis);

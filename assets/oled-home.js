/* FormaRota OLED Edition — daily dashboard and user-controlled today plan.
 * Reads existing records; today's plan uses the shared weekly schedule API. */
(function(root){
'use strict';
const doc=root.document;
if(!doc)return;
const byId=id=>doc.getElementById(id);
const read=(key,fallback)=>{
 try{const raw=root.localStorage?.getItem(key);if(raw==null)return fallback;const obj=JSON.parse(raw);return obj==null?fallback:obj;}
 catch{return fallback;}
};
const array=x=>Array.isArray(x)?x:[];
const number=x=>(x===null||x===undefined||x===''||!Number.isFinite(Number(x)))?null:Number(x);
const total=(records,key)=>records.reduce((sum,row)=>sum+Math.max(0,number(row[key])||0),0);
const completeMacro=(records,key)=>records.every(row=>number(row[key])!==null&&number(row[key])>=0);
const fmt=n=>new Intl.NumberFormat('tr-TR',{maximumFractionDigits:1}).format(n);
const localDay=()=>root.FormaRotaStudioPlusMetrics?.localISO?.(new Date())||(()=>{
 const d=new Date();return [d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-');
})();
const safeName=x=>typeof x==='string'&&x.trim()?x.trim().slice(0,110):'İsimsiz kayıt';
const dateLabel=date=>{
 if(!/^\d{4}-\d{2}-\d{2}$/.test(date||''))return 'Tarih bilinmiyor';
 const parsed=new Date(date+'T12:00:00');
 return Number.isNaN(parsed.getTime())?'Tarih bilinmiyor':parsed.toLocaleDateString('tr-TR',{day:'numeric',month:'short'});
};
const percentage=(amount,goal)=>goal>0?Math.max(0,Math.min(100,amount/goal*100)):0;
const validSets=session=>{
 const metrics=root.FormaRotaStudioPlusMetrics;
 const moves=Array.isArray(root.formaRotaFitnessCatalog)?root.formaRotaFitnessCatalog:[];
 return metrics&&moves.length===13&&metrics.fullSession(session,moves.map(x=>x.id));
};
function snapshot(day=localDay()){
 const logs=array(read('kocluk-food-log-v2',[]));
 const todays=logs.filter(x=>x?.date===day&&x&&typeof x==='object');
 const safeGoal=(id,fallback)=>{const x=number(byId(id)?.value);return x!==null&&x>0?x:fallback;};
 const goalKcal=safeGoal('goalKcal',2600),goalProtein=safeGoal('goalProtein',160);
 const kcal=total(todays,'kcal'),protein=total(todays,'protein');
 const carbsValid=completeMacro(todays,'carbs'),fatValid=completeMacro(todays,'fat');
 const water=Math.max(0,number(read('formarota-water-v1',{})?.[day])||0);
 const waterGoal=number(byId('waterGoal')?.value)||2500;
 const walk=Math.max(0,number(read('formarota-walks-v1',{})?.[day])||0);
 const full=array(read('kocluk-fitness-history-v1',[]));
 const abs=array(read('formarota-abs-history-v1',[]));
 const fullComplete=full.some(s=>s?.date===day&&validSets(s));
 const absDone=root.FormaRotaABSEngine?.completedDates?.(abs);
 const absComplete=Boolean(absDone?.has(day));
 const activeFull=read('kocluk-fitness-current-v1',null);
 const activeAbs=read('formarota-abs-current-v1',null);
 const active=(activeFull?.date===day&&['running','paused'].includes(activeFull.status))||
  (activeAbs?.date===day&&['running','paused'].includes(activeAbs.status));
 const hasMeal=meal=>todays.some(x=>x.meal===meal);
 return {day,logs,todays,kcal,protein,goalKcal,goalProtein,
  carbs:carbsValid?total(todays,'carbs'):null,fat:fatValid?total(todays,'fat'):null,
  carbsComplete:carbsValid,fatComplete:fatValid,
  water,waterGoal,walk,fullComplete,absComplete,active,hasMeal};
}
function setText(id,value){const node=byId(id);if(node)node.textContent=value;}
function ring(data){
 const node=byId('oledKcalRing');
 if(!node)return;
 const pct=percentage(data.kcal,data.goalKcal);
 node.style.setProperty('--oled-progress',pct+'%');
 node.dataset.exceeded=String(data.kcal>data.goalKcal);
 node.setAttribute('aria-valuemax',String(data.goalKcal));
 node.setAttribute('aria-valuenow',String(Math.min(data.kcal,data.goalKcal)));
 node.setAttribute('aria-valuetext',fmt(data.kcal)+' / '+fmt(data.goalKcal)+' kcal'+
  (data.kcal>data.goalKcal?', hedef '+fmt(data.kcal-data.goalKcal)+' kcal aşıldı':''));
 setText('oledKcalValue',fmt(data.kcal));
 setText('oledKcalTarget','/ '+fmt(data.goalKcal)+' kcal');
 // The intake target is already meant to include a planned deficit.
 // Never congratulate lower intake or instruct the user to "fill" calories.
 const band=root.FormaRotaNutritionRewards?.evaluate?.(data.todays,{
  kcal:data.goalKcal,protein:data.goalProtein,
  sex:read('kocluk-profile-v1',{})?.sex
 });
 setText('oledKcalState',!data.todays.length?'Henüz öğün kaydı yok':
  band&&data.kcal>=band.low&&data.kcal<=band.high?
   'Planlanan kalori aralığında · daha az yemek ek puan getirmez':
  data.kcal>data.goalKcal*1.05?
   'Planlanan aralığın üzerinde · dengeyi haftalık değerlendir':
   'Günlük kayıt: '+fmt(data.kcal)+' kcal · planlanan '+fmt(data.goalKcal)+' kcal');
 setText('oledCarbs',data.carbs===null?'—':fmt(data.carbs)+' g');
 setText('oledFat',data.fat===null?'—':fmt(data.fat)+' g');
 setText('oledProtein',fmt(data.protein)+' / '+fmt(data.goalProtein)+' g');
 setText('oledCarbsNote',data.carbsComplete?'Kayıtlı miktar':'Eksik besin verisi');
 setText('oledFatNote',data.fatComplete?'Kayıtlı miktar':'Eksik besin verisi');
 const p=byId('oledProteinBar');if(p)p.style.width=percentage(data.protein,data.goalProtein)+'%';
}
const node=(tag,cls,txt)=>{
 const n=doc.createElement(tag);if(cls)n.className=cls;
 if(txt!==undefined)n.textContent=txt;return n;
};
function renderPlan(data){
 const host=byId('oledTodayPlan');if(!host)return;
 const meals=[['Kahvaltı','🥚','Kahvaltı kaydı'],['Öğle yemeği','🍽','Öğle yemeği kaydı'],
  ['Akşam yemeği','🌙','Akşam yemeği kaydı'],['Ara öğün','🍎','Ara öğün kaydı']];
 const rows=meals.map(([meal,icon,desc])=>({
  label:meal,icon,desc,done:data.hasMeal(meal),status:data.hasMeal(meal)?'Kaydedildi':'Bekliyor'
 }));
 rows.push({label:'Su',icon:'💧',desc:fmt(data.water)+' / '+fmt(data.waterGoal)+' ml',
  done:data.water>=data.waterGoal,status:data.water>=data.waterGoal?'Tamamlandı':'Devam ediyor'});
 rows.push({label:'Yürüyüş',icon:'🚶',desc:fmt(data.walk)+' / 5 km',
  done:data.walk>=5,status:data.walk>=5?'Tamamlandı':'Kalan '+fmt(Math.max(0,5-data.walk))+' km'});
 const fullOrAbs=data.fullComplete||data.absComplete;
 rows.push({label:'Antrenman',icon:'🏋️',
  desc:fullOrAbs?'Bugün tamamlanmış antrenman kaydı var':
   data.active?'Aktif seansın devam ediyor':'Bugün tamamlanmış seans kaydı yok',
  done:fullOrAbs,status:fullOrAbs?'Tamamlandı':data.active?'Sürüyor':'Kayıt yok'});
 const frag=doc.createDocumentFragment();
 for(const entry of rows){
  const row=node('div','oled-plan-item'+(entry.done?' done':''));
  const icon=node('span','oled-plan-icon',entry.icon);icon.setAttribute('aria-hidden','true');
  const copy=node('div');copy.append(node('strong','',entry.label),node('small','',entry.desc));
  row.append(icon,copy,node('span','oled-plan-status',entry.status));frag.append(row);
 }
 host.replaceChildren(frag);
}
function renderRecent(data){
 const host=byId('oledRecentList');if(!host)return;
 const recent=data.logs.filter(x=>x&&typeof x==='object'&&/^\d{4}-\d{2}-\d{2}$/.test(x.date||'')&&x.date<=data.day)
  .map((x,i)=>({kind:'meal',date:x.date,index:i,name:safeName(x.name),
   sub:[x.meal||'Öğün',dateLabel(x.date),x.amount!=null?(root.FormaRotaFoodPieces?.logLabel(x,fmt)||fmt(x.amount)+' '+(x.unit==='ml'?'ml':'g')):null].filter(Boolean).join(' · '),
   value:number(x.kcal)!==null?fmt(x.kcal)+' kcal':'Kalori yok'}));
 const full=array(read('kocluk-fitness-history-v1',[]));
 const abs=array(read('formarota-abs-history-v1',[]));
 for(const [records,label] of [[full,'Full Body'],[abs,'ABS']]){
  records.forEach((x,i)=>{
   if(x&&x.status==='finished'&&/^\d{4}-\d{2}-\d{2}$/.test(x.date||'')&&x.date<=data.day){
    recent.push({kind:'workout',date:x.date,index:i,name:label+' antrenmanı',
     sub:dateLabel(x.date)+' · Tamamlandı',value:'✓'});
   }
  });
 }
 recent.sort((a,b)=>b.date.localeCompare(a.date)||b.index-a.index);
 const frag=doc.createDocumentFragment();
 if(!recent.length){frag.append(node('p','muted','Henüz beslenme veya tamamlanmış antrenman kaydı yok.'));}
 for(const record of recent.slice(0,4)){
  const row=node('div','oled-recent-item');
  const symbol=node('span','oled-recent-symbol',record.kind==='workout'?'🏋️':'🍽️');
  symbol.setAttribute('aria-hidden','true');
  const copy=node('div','oled-recent-copy');
  copy.append(node('strong','',record.name),node('small','',record.sub));
  row.append(symbol,copy,node('span','oled-recent-value',record.value));frag.append(row);
 }
 host.replaceChildren(frag);
}
// A pre-existing Fitness weekly choice is not the same as confirming the
// today's home shortcut. Confirmation is UI-only; the workout plan remains
// stored in its existing backup-compatible weekly schedule.
const HOME_CONFIRMED_DAY='formarota-home-activity-confirmed-day-v1';
let draftType=null, draftDay=null;
function confirmedToday(day){
 try{return root.localStorage?.getItem(HOME_CONFIRMED_DAY)===day;}
 catch{return false}
}
const getActivity=day=>root.FormaRotaWeeklyPlan?.getDay?.(day)||null;
const activityLabel=type=>root.FormaRotaWeeklyPlan?.types?.find(x=>x.value===type)?.label||'Etkinlik';
function renderActivity(data){
 const picker=byId('oledTodayActivitySelect'),dateNode=byId('oledTodayActivityDate');
 const card=byId('oledTodayActivityCard');
 if(!picker||!card)return;
 const selected=getActivity(data.day);
 if(!selected)return;
 if(draftDay!==data.day){draftType=null;draftDay=data.day;}
 // Only an explicit confirmation from this home shortcut dismisses the card.
 // Fitness's previously saved schedule must not hide an unconfirmed day.
 card.hidden=confirmedToday(data.day);
 const date=new Date(data.day+'T12:00:00');
 if(dateNode&&!Number.isNaN(date.getTime()))
  dateNode.textContent=date.toLocaleDateString('tr-TR',{weekday:'long',day:'numeric',month:'long'});
 const noteLabel=byId('oledTodayActivityNoteLabel'),note=byId('oledTodayActivityNote');
 const activeType=draftType||selected.type;
 if(picker.value!==activeType)picker.value=activeType;
 if(noteLabel)noteLabel.hidden=activeType!=='other';
 if(note&&draftType===null&&note.value!==selected.note)note.value=selected.note;
 const status=byId('oledTodayActivityStatus');
 if(!status)return;
 if(draftType!==null){
  status.textContent='Seçimin hazır · “Bugünün planını kaydet” düğmesine dokun.';
  return;
 }
 if(!selected.explicit){
  status.textContent='Henüz bir etkinlik seçilmedi · Dinlenme varsayılan görünümdür.';
  return;
 }
 const label=activityLabel(selected.type);
 const doneFull=data.fullComplete,doneAbs=data.absComplete;
 let completion='Planlandı · Tamamlandı sayılmaz.';
 if(selected.type==='full')completion=doneFull?'Full Body antrenmanın kaydedilmiş.':
  data.active?'Antrenman seansın sürüyor.':'Full Body için henüz tamamlanmış kayıt yok.';
 else if(selected.type==='abs')completion=doneAbs?'ABS antrenmanın kaydedilmiş.':
  data.active?'Antrenman seansın sürüyor.':'ABS için henüz tamamlanmış kayıt yok.';
 else if(selected.type==='full-abs')completion=doneFull&&doneAbs?'Full Body ve ABS kayıtları tamamlanmış.':
  (doneFull?'Full Body kayıtlı, ABS bekleniyor.':doneAbs?'ABS kayıtlı, Full Body bekleniyor.':'İki antrenmanın tamamlanma kaydı henüz yok.');
 else if(selected.type==='basket'||selected.type==='basket-abs')
  completion=(selected.type==='basket-abs'&&doneAbs?'ABS kaydedilmiş; ':'')+
   'Basketbol katılımı otomatik doğrulanmaz.';
 else if(selected.type==='other')completion='Diğer etkinlikler için otomatik tamamlanma kaydı yok.';
 else if(selected.type==='rest')completion='Dinlenme seçimin kaydedildi; antrenman tamamlandı sayılmaz.';
 status.textContent='Bugün: '+label+(selected.type==='other'&&selected.note?' · '+selected.note:'')+' — '+completion;
}
function render(){
 if(!byId('homePanel')||!byId('oledKcalRing'))return;
 const data=snapshot();ring(data);renderPlan(data);renderRecent(data);renderActivity(data);
}
let queued=false;
function schedule(){
 if(queued||byId('homePanel')?.classList.contains('hidden'))return;
 queued=true;
 const perform=()=>{queued=false;render();};
 if(typeof root.requestAnimationFrame==='function')root.requestAnimationFrame(perform);
 else queueMicrotask(perform);
}
function init(){
 const activitySelect=byId('oledTodayActivitySelect'),activityNote=byId('oledTodayActivityNote');
 function storeActivity(type,note=''){
  const plan=root.FormaRotaWeeklyPlan;
  if(!plan||!activitySelect)return;
  const day=localDay();
  const status=byId('oledTodayActivityStatus');
  try{
   plan.setDay(day,type,note);
   // A separate day-local confirmation avoids hiding previously prepared
   // weekly workouts before the user has had a chance to confirm today's plan.
   root.localStorage?.setItem(HOME_CONFIRMED_DAY,day);
   draftType=null;draftDay=day;
   render();
  }catch{
   render();if(status)status.textContent='Plan veya ana ekran tercihi kaydedilemedi. Cihaz depolamasını kontrol et.';
  }
 }
 activitySelect?.addEventListener('change',()=>{
  draftDay=localDay();
  draftType=activitySelect.value;
  if(draftType!=='other'&&activityNote)activityNote.value='';
  renderActivity(snapshot());
 });
 byId('oledTodayActivitySave')?.addEventListener('click',()=>{
  if(activitySelect)storeActivity(activitySelect.value,
   activitySelect.value==='other'?activityNote?.value||'':'');
 });
 activityNote?.addEventListener('keydown',event=>{
  if(event.key==='Enter'&&activitySelect?.value==='other'){
   event.preventDefault();
   storeActivity('other',activityNote.value);
  }
 });
 byId('oledTodayOpenWeek')?.addEventListener('click',()=>{
  // Fitness planner is folded in the compact UI, so expand it first.
  const fold=byId('fitSchedulePanel')?.querySelector('details.fit-fold');
  if(fold)fold.open=true;
  if(typeof root.navigateTo==='function')root.navigateTo('fitness','fitSchedulePanel');
  else doc.querySelector('.mobile-tabbar [data-tab="fitness"]')?.click();
 });
 byId('oledRecentAll')?.addEventListener('click',()=>{
  if(typeof root.showView==='function')root.showView('nutrition');
  else doc.querySelector('.mobile-tabbar [data-tab="nutrition"]')?.click();
 });
 doc.addEventListener('click',schedule);
 doc.addEventListener('change',schedule);
 doc.addEventListener('visibilitychange',()=>{if(doc.visibilityState==='visible')schedule();});
 root.addEventListener?.('pageshow',schedule);
 render();
}
if(doc.readyState==='loading')doc.addEventListener('DOMContentLoaded',init,{once:true});
else init();
root.FormaRotaOLEDHome=Object.freeze({snapshot,render,renderActivity,schedule,percentage});
})(window);

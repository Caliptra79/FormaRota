/* FormaRota Studio — presentation-only bridge.
 * Reads existing visible timer/set state, never mutates training data or preferences. */
(function(root){
 'use strict';
 const doc=root.document;
 if(!doc)return;
 const get=id=>doc.getElementById(id);
 const clamp=(n,min,max)=>Math.min(max,Math.max(min,n));
 function reducedMotion(){
  return Boolean(root.matchMedia?.('(prefers-reduced-motion: reduce)').matches);
 }
 function travelTo(id){
  const section=get(id);
  if(!section)return false;
  section.scrollIntoView({block:'start',behavior:reducedMotion()?'auto':'smooth'});
  return true;
 }
 function snapshot(){
  const label=get('fitSessionLabel')?.textContent||'';
  const completed=get('fitCompletedText')?.textContent||'0 / 39 set';
  const first=Number.parseInt(completed,10);
  const done=Number.isFinite(first)?clamp(first,0,39):0;
  const running=label.length>0&&!label.includes('başlatılmadı');
  const paused=running&&label.includes('Duraklatıldı');
  const startButton=get('fitStart');
  const unavailable=Boolean(startButton?.disabled)&&!running;
  return {done,running,paused,unavailable,remaining:39-done};
 }
 function update(){
  const gauge=get('studioProgressRing');
  if(!gauge)return;
  const state=snapshot();
  const count=get('studioDoneCount');
  const status=get('studioWorkoutState');
  const note=get('studioProgressNote');
  const primary=get('studioPrimaryAction');
  gauge.style.setProperty('--studio-value',(state.done/39*100).toFixed(1)+'%');
  gauge.setAttribute('aria-valuenow',String(state.done));
  if(count)count.textContent=String(state.done);
  if(note)note.textContent=state.done===39?'39 setin tamamlandı. Seansı güvenle bitirebilirsin.':
   state.done===0?'39 set · 13 hareket · Kendi hızında ilerle.':
   state.remaining+' set kaldı · '+Math.round(state.done/39*100)+'% ilerleme';
  if(status){
   status.textContent=state.paused?'Ⅱ Antrenman duraklatıldı':
    state.running?'● Antrenman sürüyor':
    state.unavailable?'🏀 Bugün Basketbol + Karın':
    '● Program hazır';
  }
  if(primary){
   primary.textContent=state.running?'↗ Setlere devam et':
    state.unavailable?'Haftalık planı gör':'▶ Antrenmana başla';
  }
 }
 function init(){
  const primary=get('studioPrimaryAction');
  const exercises=get('studioExercisesAction');
  const meal=get('studioMealAction');
  if(!primary||!exercises)return;
  primary.addEventListener('click',()=>{
   const state=snapshot();
   if(state.running){
    travelTo('fitExercisePanel');
    return;
   }
   if(state.unavailable){
    const plan=get('fitSchedulePanel');
    const fold=plan?.querySelector('details.fit-fold');
    if(fold)fold.open=true;
    travelTo('fitSchedulePanel');
    return;
   }
   const button=get('fitStart');
   if(button&&!button.disabled)button.click();
   update();
  });
  exercises.addEventListener('click',()=>travelTo('fitExercisePanel'));
  meal?.addEventListener('click',()=>travelTo('mealQuickPanel'));
  const options={subtree:true,childList:true,characterData:true};
  for(const id of ['fitCompletedText','fitSessionLabel']){
   const field=get(id);
   if(field&&typeof MutationObserver!=='undefined'){
    new MutationObserver(update).observe(field,options);
   }
  }
  const start=get('fitStart');
  if(start&&typeof MutationObserver!=='undefined'){
   new MutationObserver(update).observe(start,{attributes:true,attributeFilter:['disabled']});
  }
  root.addEventListener('pageshow',update);
  doc.addEventListener('visibilitychange',()=>{
   if(doc.visibilityState==='visible')update();
  });
  update();
 }
 root.FormaRotaStudio=Object.freeze({snapshot,update,travelTo});
 if(doc.readyState==='loading')doc.addEventListener('DOMContentLoaded',init,{once:true});
 else init();
})(window);

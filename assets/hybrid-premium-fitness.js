/* FormaRota Hybrid Premium: display-only Fitness/Coach enhancement.
 * Reuses original HTML elements and record handlers; never edits fitness state. */
(function(root){
'use strict';
const doc=root.document;
if(!doc)return;
const byId=id=>doc.getElementById(id);
const text=(tag,cls,label)=>{
 const el=doc.createElement(tag);if(cls)el.className=cls;
 if(label!=null)el.textContent=label;
 return el;
};
function addKicker(parent,heading,label){
 if(!parent||!heading||parent.querySelector('.frhf-kicker, .frhf-coach-kicker'))return;
 const kicker=text('span',parent.id==='coachOverview'?'frhf-coach-kicker':'frhf-kicker',label);
 heading.before(kicker);
}
function enhanceHeaders(){
 const overview=byId('coachOverview');
 const top=overview?.querySelector('.coach-top');
 const title=top?.querySelector('h2');
 if(title)addKicker(overview,title,'✦ KİŞİSEL ANTRENÖR');
 const timer=byId('fitSessionPanel');
 const timerHead=timer?.querySelector('h2');
 if(timerHead)addKicker(timer,timerHead,'ANTRENMAN / ZAMANLAYICI');
 const exercises=byId('fitExercisePanel');
 const moveHead=exercises?.querySelector('.fit-headline h2');
 if(moveHead)addKicker(exercises,moveHead,'ANTRENMAN / HAREKETLERİN');
}
function updateCards(){
 const list=byId('fitExerciseList');
 if(!list)return 0;
 let total=0;
 for(const card of list.querySelectorAll('.fit-card')){
  const done=card.querySelectorAll('.fit-set.done').length;
  const state=done>=3?'complete':done>0?'partial':'ready';
  card.dataset.frhfProgress=state;
  total++;
 }
 return total;
}
function refresh(){enhanceHeaders();updateCards();}
function init(){
 refresh();
 const list=byId('fitExerciseList');
 if(list){
  if(typeof MutationObserver!=='undefined'){
   // Only observe list replacement, not the marker updates inside cards.
   new MutationObserver(updateCards).observe(list,{childList:true});
  }
  list.addEventListener('click',()=>queueMicrotask(updateCards));
 }
 byId('confirmImport')?.addEventListener('click',()=>queueMicrotask(refresh));
 doc.addEventListener('visibilitychange',()=>{
  if(doc.visibilityState==='visible')refresh();
 });
 root.addEventListener?.('pageshow',refresh);
}
if(doc.readyState==='loading')doc.addEventListener('DOMContentLoaded',init,{once:true});
else init();
root.FormaRotaHybridFitness=Object.freeze({refresh,updateCards});
})(window);

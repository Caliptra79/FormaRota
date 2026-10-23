/* FormaRota Solo v32 — presentation-only refinements.
 * Keeps every existing ID, listener, data key, exercise, GIF, theme, and calculation intact.
 * Executes after v23/v25/v26 and v30 view-initialization callbacks.
 */
(function(){
 'use strict';
 function ready(){
  const byId=id=>document.getElementById(id);
  // Nutrition: one daily snapshot (consumed and remaining) instead of two full panels.
  const nutrition=byId('nutritionTop'),budget=byId('v21Budget');
  if(nutrition&&budget&&budget.parentElement!==nutrition){
   const macros=nutrition.querySelector('.stats');
   if(macros)macros.after(budget);else nutrition.appendChild(budget);
   budget.classList.add('fr32-goal-summary');
   budget.setAttribute('aria-label','Günlük kalan kalori ve protein');
  }
  const breakfast=byId('breakfastPanel'),meals=byId('mealQuickPanel');
  if(breakfast&&meals&&breakfast.nextElementSibling!==meals){
   meals.before(breakfast);
  }
  if(breakfast&&!breakfast.querySelector('.fr32-breakfast-details')){
   const heading=breakfast.querySelector('h2');
   if(heading){
    const mini=document.createElement('p');
    mini.className='fr32-breakfast-presets';
    mini.textContent='2 yumurta · Antep peyniri · 5 zeytin';
    heading.after(mini);
   }
   const notes=Array.from(breakfast.children).filter(node=>node.matches('p.muted'));
   if(notes.length){
    const details=document.createElement('details');details.className='fr32-breakfast-details';
    const summary=document.createElement('summary');summary.textContent='Kahvaltı planı ve kayıt açıklaması';
    details.append(summary,...notes);
    breakfast.append(details);
   }
  }
  // Progress: current weight and target metrics should be seen before any input form.
  const profile=byId('profilePanel');
  if(profile){
   const heading=profile.querySelector(':scope > .split');
   const stat=profile.querySelector(':scope > .stats');
   if(heading&&stat&&heading.nextElementSibling!==stat)heading.after(stat);
   const save=byId('saveWeight');
   const saveRow=save?.closest('.row');
   const preferences=profile.querySelector(':scope > .progress-preferences');
   if(saveRow&&preferences&&saveRow.nextElementSibling!==preferences)saveRow.after(preferences);
  }
  // Fitness: keep GIFs at their existing 138/240px dimensions and all 13 visible.
  // Make the "weekly plan" shortcut open a nearby fold rather than scroll past GIFs.
  const coach=byId('coachOverview'),weeklyPlan=byId('fitSchedulePanel');
  if(coach&&weeklyPlan&&coach.nextElementSibling!==weeklyPlan)coach.after(weeklyPlan);
  const fitnessTitle=byId('fitExercisePanel')?.querySelector('.fit-headline h2');
  if(fitnessTitle)fitnessTitle.textContent='Hareketlerim ve setlerim';
  // Expose a semantic version hook for CSS and automated snapshot checks.
  document.documentElement.dataset.frDesign='32';
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',ready,{once:true});
 else ready();
})();

/* FormaRota v26: shorter fitness screen; all tracking IDs remain intact. */
(function(){
 function wrapOptional(panelId,title){
  const panel=document.getElementById(panelId);
  if(!panel||panel.querySelector(':scope > details.fit-fold'))return;
  panel.classList.add('fit-optional');
  const d=document.createElement('details');d.className='fit-fold';
  const summary=document.createElement('summary');summary.textContent=title;
  const body=document.createElement('div');body.className='fit-fold-body';
  while(panel.firstChild)body.appendChild(panel.firstChild);
  d.append(summary,body);panel.appendChild(d);
 }
 function initFitness(){
  const root=document.getElementById('fitnessRoot');
  const timer=document.getElementById('fitSessionPanel');
  const exercises=document.getElementById('fitExercisePanel');
  if(!root||!timer||!exercises||root.dataset.simpleLayout==='26')return;
  root.dataset.simpleLayout='26';
  const intro=root.querySelector(':scope > section[data-fit-page="workout"]');
  if(intro){intro.after(timer);timer.after(exercises);}
  wrapOptional('v21WorkoutLast','Önceki antrenman ağırlıklarım');
  wrapOptional('fitSchedulePanel','Haftalık plan ve süre ayarları');
  wrapOptional('v21TimerPanel','Harekete özel dinlenme ayarları');
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',initFitness,{once:true});
 else initFitness();
})();

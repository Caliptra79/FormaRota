/* v25: compact progress screens, retaining original controls and IDs. */
(function(){
 function compactPanel(panel, heading, defaultOpen=false, rerender=null){
   if(!panel || panel.querySelector(':scope > details.progress-fold'))return;
   const details=document.createElement('details');
   details.className='progress-fold';
   details.open=defaultOpen;
   const summary=document.createElement('summary');
   summary.textContent=heading;
   const body=document.createElement('div');
   body.className='progress-fold-body';
   while(panel.firstChild)body.appendChild(panel.firstChild);
   details.append(summary,body);panel.appendChild(details);
   if(rerender)details.addEventListener('toggle',()=>{
     if(details.open)requestAnimationFrame(()=>{try{if(typeof window[rerender]==='function')window[rerender]()}catch(e){console.warn('Progress redraw',e)}});
   });
 }
 function compactProgress(){
   const profile=document.getElementById('profilePanel');
   if(profile && !profile.querySelector('.progress-preferences')){
     const demographic=profile.querySelector(':scope > .three');
     const sexRow=demographic?.nextElementSibling;
     const estimate=profile.querySelector('#profileEstimate');
     const apply=profile.querySelector('#applyEstimate');
     if(demographic && sexRow && estimate && apply){
       const d=document.createElement('details');d.className='progress-fold progress-preferences';
       const summary=document.createElement('summary');summary.textContent='Profil ve kalori hesabı ayarları';
       const body=document.createElement('div');body.className='progress-fold-body';
       body.append(demographic,sexRow,estimate,apply);
       d.append(summary,body);
       profile.querySelector(':scope > .split')?.after(d);
     }
     const history=profile.querySelector('#weightHistory');
     if(history && !history.closest('.progress-fold')){
       const d=document.createElement('details');d.className='progress-fold progress-history';
       const summary=document.createElement('summary');summary.textContent='Önceki kilo ölçümleri';
       const body=document.createElement('div');body.className='progress-fold-body';
       history.before(d);body.appendChild(history);d.append(summary,body);
     }
     const explainer=profile.querySelector(':scope > p.muted');
     if(explainer)explainer.classList.add('progress-secondary-note');
   }
   const trend=document.getElementById('trendPanel');
   compactPanel(trend,'14 günlük kilo ve beslenme grafikleri',false,'renderTrend');
   const weekly=document.getElementById('weeklyPanel');
   compactPanel(weekly,'Haftalık beslenme özeti',false,'renderWeekly');
   const insightPanels=Array.from(document.querySelectorAll('section.panel[data-view="insights"]'));
   insightPanels.forEach((p,i)=>{
     const heading=p.querySelector('h2')?.textContent?.trim()||'Detaylar';
     compactPanel(p,heading,false,'v21RenderInsights');
   });
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',compactProgress,{once:true});
 else compactProgress();
})();

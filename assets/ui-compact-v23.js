/* v23: preserve input IDs and localStorage keys while simplifying layout */
(function(){
 function installCompactLayout(){
  const nav=document.getElementById('homeTrends');
  const redundant=nav&&nav.closest('.mini-panel');
  if(redundant)redundant.hidden=true;
  const mealCards=document.getElementById('mealQuickPanel');
  const editor=document.getElementById('searchPanel');
  const entries=document.getElementById('foodLogPanel');
  const recent=document.getElementById('v21Recents');
  const budget=document.getElementById('v21Budget');
  if(mealCards&&budget)budget.after(mealCards);
  if(mealCards&&editor)mealCards.after(editor);
  if(editor&&entries)editor.after(entries);
  if(entries&&recent)entries.after(recent);
  const records=document.getElementById('personalRecordsPanel');
  if(records)records.dataset.view='insights';
  if(recent&&!recent.querySelector('.optional-details')){
   const details=document.createElement('details');details.className='optional-details';
   const summary=document.createElement('summary');summary.textContent='Sık yediklerim ve önceki öğünler';
   const body=document.createElement('div');body.className='optional-body';
   Array.from(recent.childNodes).forEach(node=>{
    if(node.nodeType===1&&node.matches('h2'))return node.remove();
    body.appendChild(node);
   });
   details.append(summary,body);recent.appendChild(details);
  }
  if(editor&&!editor.querySelector('.barcode-optional')){
   const barcodeHeading=Array.from(editor.children).find(el=>el.tagName==='H2'&&/barkodla/i.test(el.textContent));
   if(barcodeHeading){
    const details=document.createElement('details');details.className='optional-details barcode-optional';
    const summary=document.createElement('summary');summary.textContent='Barkod ile ürün ara (isteğe bağlı)';
    const body=document.createElement('div');body.className='optional-body';
    let node=barcodeHeading;
    while(node){const next=node.nextElementSibling;body.appendChild(node);node=next;}
    details.append(summary,body);editor.appendChild(details);
    const hiddenHeading=body.querySelector('h2');if(hiddenHeading)hiddenHeading.hidden=true;
   }
  }
  const stats=document.querySelector('#nutritionTop .stats');
  if(stats&&!stats.querySelector('.macro-more')){
   const all=stats.querySelectorAll(':scope > .stat');
   if(all.length===4){
    const details=document.createElement('details');details.className='optional-details macro-more';
    const summary=document.createElement('summary');summary.textContent='Karbonhidrat ve yağ ayrıntıları';
    const pair=document.createElement('div');pair.className='more-stats';
    pair.append(all[2],all[3]);details.append(summary,pair);stats.appendChild(details);
   }
  }
  const dates=Array.from(document.querySelectorAll('input[type="date"]'));
  const synchronizers=[];
  dates.forEach(input=>{
   if(input.closest('.date-control'))return;
   const host=document.createElement('div');host.className='date-control';
   const value=document.createElement('span');value.className='date-label';value.setAttribute('aria-hidden','true');
   const chevron=document.createElement('span');chevron.className='date-chevron';chevron.setAttribute('aria-hidden','true');chevron.textContent='▦';
   input.parentNode.insertBefore(host,input);host.append(value,chevron,input);
   const sync=()=>{
    const raw=input.value;
    if(!raw){value.textContent='Tarih seç';return;}
    const dt=new Date(raw+'T12:00:00');
    value.textContent=Number.isNaN(dt.getTime())?raw:new Intl.DateTimeFormat('tr-TR',{day:'numeric',month:'short',year:'numeric'}).format(dt);
   };
   input.addEventListener('input',sync);input.addEventListener('change',sync);
   synchronizers.push(sync);sync();
  });
  const syncAll=()=>synchronizers.forEach(fn=>fn());
  requestAnimationFrame(syncAll);
  document.addEventListener('click',()=>requestAnimationFrame(syncAll),true);
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',installCompactLayout,{once:true});
 else installCompactLayout();
})();

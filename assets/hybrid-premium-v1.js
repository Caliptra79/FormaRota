/* FormaRota Hybrid Premium — first-stage progressive enhancement.
   Preserve the original nodes/IDs/handlers, never own or mutate activity data. */
(function(root){
 'use strict';
 const KEY='formarota-motion-mode-v1';
 const MODES=Object.freeze(['normal','reduced','system']);
 const descriptions=Object.freeze({
  normal:'Yumuşak geçişler, ilerleme halkaları ve kısa tamamlanma animasyonları açık.',
  reduced:'Gereksiz geçişler ve hareket efektleri kapalı. Tüm işlevler aynen çalışır.',
  system:'Cihazının azaltılmış hareket tercihine göre animasyonlar ayarlanır.'
 });
 const document=root.document;
 const validMode=value=>MODES.includes(value)?value:'normal';
 function load(){
  try{return validMode(root.localStorage?.getItem(KEY));}
  catch{return 'normal';}
 }
 function apply(mode,persist){
  const value=validMode(mode);
  document.documentElement.dataset.frMotion=value;
  if(persist){
   try{root.localStorage?.setItem(KEY,value);}catch{}
  }
  return value;
 }
 function sectionTitle(){
  const rings=document.getElementById('spProgressRings');
  if(!rings||document.getElementById('frhDailyHeading'))return;
  const head=document.createElement('div');
  head.className='frh-section-head';head.id='frhDailyHeading';
  const title=document.createElement('div');
  const overline=document.createElement('span');
  overline.className='frh-eyebrow';overline.textContent='GÜNLÜK KONTROL';
  const label=document.createElement('h3');
  label.id='frhDailyHeadingTitle';label.textContent='Bugünkü hedefler';
  title.append(overline,label);
  const sub=document.createElement('p');
  sub.textContent='Dört hedef, tek bakış.';
  head.append(title,sub);
  rings.setAttribute('aria-labelledby',label.id);
  rings.before(head);
 }
 function reorganizeHome(){
  const home=document.getElementById('homePanel');
  if(!home)return;
  sectionTitle();
  const rank=document.getElementById('frRankHome');
  const week=document.getElementById('spWeekTeaser');
  // The badge still opens exactly the same progress page; moving it
  // preserves any event handlers attached by the existing rank module.
  if(rank&&week&&rank.previousElementSibling!==week)week.after(rank);
 }
 function connectSettings(){
  const input=document.getElementById('frhMotionSelect');
  const description=document.getElementById('frhMotionDescription');
  if(!input||!description)return;
  const saved=load();
  input.value=saved;
  description.textContent=descriptions[saved];
  input.addEventListener('change',()=>{
   const selected=apply(input.value,true);
   description.textContent=descriptions[selected];
   input.value=selected;
  });
 }
 function init(){
  apply(load(),false);
  reorganizeHome();
  connectSettings();
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});
 else init();
 root.FormaRotaHybridPremium=Object.freeze({validMode,load,apply});
})(window);

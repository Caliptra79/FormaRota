/* FormaRota: local-device calendar date shown on every page.
 * No network, tracking, storage, timezone assumptions or date-picker mutation. */
(function(root){
 'use strict';
 let previousISO='';
 function iso(date){
  return [date.getFullYear(),String(date.getMonth()+1).padStart(2,'0'),String(date.getDate()).padStart(2,'0')].join('-');
 }
 function label(date){
  const parts=new Intl.DateTimeFormat('tr-TR',{
   weekday:'long',day:'numeric',month:'long',year:'numeric'
  }).formatToParts(date);
  const get=type=>parts.find(p=>p.type===type)?.value||'';
  const weekday=get('weekday');
  return weekday.slice(0,1).toLocaleUpperCase('tr-TR')+weekday.slice(1)+
   ' · '+get('day')+' '+get('month')+' '+get('year');
 }
 function refresh(date=new Date()){
  const output=root.document?.getElementById('globalTodayDate');
  if(!output)return false;
  const next=iso(date),changed=Boolean(previousISO&&previousISO!==next);
  if(output.dateTime!==next||output.textContent!==label(date)){
   output.dateTime=next;
   output.textContent=label(date);
  }
  previousISO=next;
  if(changed&&root.formarotaReady&&typeof root.renderHome==='function')root.renderHome();
  return true;
 }
 function initialize(){
  refresh();
  root.addEventListener('pageshow',()=>refresh());
  root.addEventListener('focus',()=>refresh());
  root.document.addEventListener('visibilitychange',()=>{
   if(root.document.visibilityState==='visible')refresh();
  });
  // Covers a session left open across midnight, without constantly redrawing the UI.
  if(typeof root.setInterval==='function')root.setInterval(()=>{
   if(root.document.visibilityState!=='hidden')refresh();
  },60000);
 }
 root.FormaRotaDateMasthead=Object.freeze({iso,label,refresh});
 if(root.document?.readyState==='loading'){
  root.document.addEventListener('DOMContentLoaded',initialize,{once:true});
 }else if(root.document)initialize();
})(window);

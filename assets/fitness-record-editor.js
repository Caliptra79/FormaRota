/* FormaRota: non-destructive workout corrections, stored locally. */
(function(global){
'use strict';
const JOURNAL='formarota-fitness-edits-v1';
const HISTORY='kocluk-fitness-history-v1';
const value=x=>x==null?'':String(x);
const numberText=x=>value(x).trim().replace(',','.');
function validate(weight,reps){
 const w=numberText(weight),r=numberText(reps);
 if(!w||!r)throw Error('Kilogram ve tekrar alanlarını doldur.');
 const kg=Number(w),rep=Number(r);
 if(!Number.isFinite(kg)||kg<0||kg>1500||!Number.isInteger(rep)||rep<1||rep>100)
  throw Error('Geçerli kilogram (0–1500) ve tekrar (1–100) gir.');
 return {weight:kg,reps:rep};
}
function correct(history,index,moveId,setIndex,kg,reps,expected){
 if(!Array.isArray(history)||!Number.isInteger(index)||index<0||index>=history.length)throw Error('Antrenman bulunamadı.');
 const session=history[index],set=session?.items?.[moveId]?.[setIndex];
 if(!set?.done)throw Error('Yalnızca kaydedilmiş setler düzeltilebilir.');
 if(expected&&(value(set.weight)!==value(expected.weight)||value(set.reps)!==value(expected.reps)))
  throw Error('Kayıt değişmiş. Lütfen geçmişi tekrar aç.');
 const next=validate(kg,reps);
 const before={weight:set.weight,reps:set.reps};
 if(Number(set.weight)===next.weight&&Number(set.reps)===next.reps)
  return {history,changed:false,before,after:next};
 const items={...session.items,[moveId]:session.items[moveId].map((x,i)=>i===setIndex?{...x,...next}:x)};
 return {history:history.map((x,i)=>i===index?{...x,items}:x),changed:true,before,after:next};
}
function read(key,fallback){try{const x=JSON.parse(localStorage.getItem(key));return x===null?fallback:x}catch{return fallback}}
function storePair(history,journal){
 const oldHistory=localStorage.getItem(HISTORY),oldJournal=localStorage.getItem(JOURNAL);
 try{
  localStorage.setItem(HISTORY,JSON.stringify(history));
  localStorage.setItem(JOURNAL,JSON.stringify(journal.slice(-2000)));
 }catch(err){
  try{if(oldHistory===null)localStorage.removeItem(HISTORY);else localStorage.setItem(HISTORY,oldHistory);
      if(oldJournal===null)localStorage.removeItem(JOURNAL);else localStorage.setItem(JOURNAL,oldJournal)}catch{}
  throw Error('Telefon depolamasına kaydedilemedi. Yeni bir JSON yedeği alıp depolama alanını kontrol et.');
 }
}
function identity(session,index){
 return [value(session?.id),value(session?.date),value(session?.startedAt),value(session?.endedAt),index].join('|');
}
function entry(type,session,index,moveId,setIndex,before,after,parent=null){
 return {id:'edit-'+Date.now()+'-'+Math.random().toString(36).slice(2),type,
  sessionId:value(session?.id)||null,identity:identity(session,index),moveId,setIndex,
  before,after,at:new Date().toISOString(),parent};
}
function updateStored(index,moveId,setIndex,kg,reps,expected){
 const history=read(HISTORY,[]),audit=read(JOURNAL,[]);
 if(!Array.isArray(history)||!Array.isArray(audit))throw Error('Depolanan düzeltme verisi bozuk.');
 const result=correct(history,index,moveId,setIndex,kg,reps,expected);
 if(!result.changed)return result;
 const record=entry('edit',history[index],index,moveId,setIndex,result.before,result.after);
 storePair(result.history,[...audit,record]);
 return {...result,record};
}
function undoLast(index){
 const history=read(HISTORY,[]),audit=read(JOURNAL,[]);
 if(!Array.isArray(history)||!Array.isArray(audit)||!history[index])throw Error('Kayıt bulunamadı.');
 const key=identity(history[index],index);
 const candidates=audit.filter(x=>x.identity===key&&x.type==='edit');
 const last=candidates.at(-1);
 if(!last)throw Error('Geri alınabilecek düzeltme yok.');
 if(audit.some(x=>x.type==='undo'&&x.parent===last.id))throw Error('Bu düzeltme zaten geri alınmış.');
 const recentForSet=audit.filter(x=>x.identity===key&&x.moveId===last.moveId&&x.setIndex===last.setIndex).at(-1);
 if(recentForSet?.id!==last.id)throw Error('Bu set daha sonra tekrar düzenlenmiş; eski düzeltme geri alınamaz.');
 const result=correct(history,index,last.moveId,last.setIndex,last.before.weight,last.before.reps,last.after);
 const record=entry('undo',history[index],index,last.moveId,last.setIndex,last.after,last.before,last.id);
 if(result.changed)storePair(result.history,[...audit,record]);
 return {...result,record};
}
function recordActive(x){
 const audit=read(JOURNAL,[]);
 if(!Array.isArray(audit))throw Error('Düzeltme geçmişi bozuk.');
 const change={...x,id:'edit-'+Date.now()+'-'+Math.random().toString(36).slice(2),type:'active',at:new Date().toISOString()};
 localStorage.setItem(JOURNAL,JSON.stringify([...audit,change].slice(-2000)));
 return change;
}
global.FormaRotaFitnessEdits={validate,correct,updateStored,undoLast,recordActive};
if(typeof document==='undefined')return;
const el=(tag,cls,content)=>{const node=document.createElement(tag);if(cls)node.className=cls;if(content!=null)node.textContent=content;return node};
const btn=(label,click,secondary=true)=>{const node=el('button',secondary?'secondary fr-small':'fr-small',label);node.type='button';node.addEventListener('click',click);return node};
function reflect(){
 if(typeof global.fitDrawHistory==='function')global.fitDrawHistory();
 if(typeof global.fitDrawExercises==='function')global.fitDrawExercises();
 if(typeof global.renderPRs==='function')global.renderPRs();
 if(typeof global.v21ExerciseGraph==='function')global.v21ExerciseGraph();
 if(typeof global.v21RenderInsights==='function')global.v21RenderInsights();
 if(typeof global.renderHome==='function')global.renderHome();
}
function form(index,moveId,setIndex,original,row){
 row.replaceChildren();
 const formNode=el('div','fr-edit-form');
 const kgLabel=el('label','','Ağırlık (kg)'),kg=el('input');
 kg.type='number';kg.min='0';kg.max='1500';kg.step='0.5';kg.value=original.weight??'';kg.setAttribute('aria-label','Düzeltilecek kilogram');
 const repLabel=el('label','','Tekrar'),rep=el('input');
 rep.type='number';rep.min='1';rep.max='100';rep.step='1';rep.value=original.reps??'';rep.setAttribute('aria-label','Düzeltilecek tekrar');
 const fields=el('div','fr-edit-fields');
 const a=el('div'),b=el('div');a.append(kgLabel,kg);b.append(repLabel,rep);fields.append(a,b);
 const actions=el('div','fr-edit-actions');
 actions.append(btn('Vazgeç',()=>reflect()),btn('Düzeltmeyi kaydet',()=>{
  try{
   const next=validate(kg.value,rep.value);
   if(Number(original.weight)===next.weight&&Number(original.reps)===next.reps){reflect();return}
   if(!confirm('Set '+(setIndex+1)+': '+original.weight+' kg × '+original.reps+' → '+next.weight+' kg × '+next.reps+' olarak düzeltilecek. Onaylıyor musun?'))return;
   updateStored(index,moveId,setIndex,next.weight,next.reps,{weight:original.weight,reps:original.reps});
   reflect();
  }catch(e){alert(e.message)}
 },false));
 formNode.append(fields,actions);row.append(formNode);
}
function panel(index){
 const history=typeof global.fitGetHist==='function'?global.fitGetHist():read(HISTORY,[]);
 const session=history[index],moves=global.formaRotaFitnessCatalog||[];
 const root=el('div','panel fr-record-panel');
 root.append(el('h3','','Antrenman kaydını düzelt'));
 root.append(el('p','muted','Yalnızca işaretlenmiş setlerin kilogram ve tekrarları değişir. Tarih, hareket programı ve tamamlanma durumu korunur.'));
 const last=read(JOURNAL,[]).filter(x=>x.type==='edit'&&x.identity===identity(session,index)).at(-1);
 if(last)root.append(btn('Son düzeltmeyi geri al',()=>{
  if(!confirm('Bu antrenmandaki son düzeltme geri alınsın mı?'))return;
  try{undoLast(index);reflect()}catch(e){alert(e.message)}
 }));
 let total=0;
 for(const move of moves){
  const sets=session.items?.[move.id]||[],done=sets.map((set,i)=>({set,i})).filter(x=>x.set?.done);
  if(!done.length)continue;
  const details=el('details','fr-record-move');
  details.append(el('summary','',move.name+' · '+done.length+' kayıt'));
  for(const {set,i} of done){
   total++;
   const line=el('div','fr-record-set'),value=el('span','',('Set '+(i+1)+' · '+set.weight+' kg × '+set.reps));
   line.append(value,btn('Düzelt',()=>form(index,move.id,i,set,line)));
   details.append(line);
  }
  root.append(details);
 }
 if(!total)root.append(el('p','muted','Bu oturumda düzenlenebilecek kayıtlı set bulunmuyor.'));
 root.append(btn('Kapat',()=>{root.remove()}));
 return root;
}
function mount(){
 const root=document.getElementById('fitHistory');
 if(!root||typeof global.fitGetHist!=='function')return;
 const rows=root.querySelectorAll('.fit-session'),history=global.fitGetHist();
 rows.forEach((row,i)=>{
  if(row.dataset.frEditor==='1')return;
  row.dataset.frEditor='1';
  const index=history.length-1-i;
  row.append(btn('Düzenle',()=>{
   const next=row.nextElementSibling;
   if(next?.classList.contains('fr-record-panel')){next.remove();return}
   root.querySelectorAll('.fr-record-panel').forEach(x=>x.remove());
   row.after(panel(index));
  }));
 });
}
function init(){
 if(typeof global.fitDrawHistory!=='function')return;
 const previous=global.fitDrawHistory;
 if(previous.__frEditorWrapped)return;
 const wrapped=function(...args){const result=previous.apply(this,args);mount();return result};
 wrapped.__frEditorWrapped=true;global.fitDrawHistory=wrapped;mount();
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})(window);

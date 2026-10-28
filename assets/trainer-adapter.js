/* FormaRota Personal Trainer: additive configuration and weekly volume UI.
   Works with the existing coach engine; never edits workout history or active sets. */
(function(root){
'use strict';
const E=root.FormaRotaCoachEngine,F=root.FormaRotaTrainerFoundation;
if(!E||!F)return;
const SETTINGS_KEY='formarota-trainer-settings-v1';
const STEPS=[0.5,1,2.5,5];
const catalog=()=>Array.isArray(root.formaRotaFitnessCatalog)?root.formaRotaFitnessCatalog:[];
const read=(key,fallback)=>{try{const x=JSON.parse(localStorage.getItem(key));return x===null?fallback:x}catch{return fallback}};
function validateSettings(x){
 if(!x||typeof x!=='object'||Array.isArray(x)||Object.keys(x).length>40)return false;
 const validIds=new Set(F.FULL_IDS);
 return Object.entries(x).every(([key,v])=>{
  const div=key.indexOf('|'),id=key.slice(0,div),variant=key.slice(div+1);
  if(div<1||!validIds.has(id)||!variant||variant.length>100||!v||typeof v!=='object'||Array.isArray(v))return false;
  if(Object.keys(v).some(k=>!['min','max','step'].includes(k)))return false;
  return Number.isInteger(v.min)&&Number.isInteger(v.max)&&v.min>=1&&v.max<=100&&v.min<v.max&&STEPS.includes(v.step);
 });
}
const readSettings=()=>{const x=read(SETTINGS_KEY,{});return validateSettings(x)?x:{}};
const parsedRange=move=>{const nums=String(move?.reps||'8–12').match(/\d+/g)||[];return {min:Number(nums[0]||8),max:Number(nums[1]||12)};};
function getConfiguration(move,variant,increment){
 const key=move.id+'|'+variant,defaults=parsedRange(move);
 const custom=readSettings()[key];
 const isDumbbell=/dumbbell/i.test(variant)||['lateral','zottman'].includes(move.id);
 const normal=STEPS.includes(Number(increment))?Number(increment):2.5;
 return {key,min:custom?.min??defaults.min,max:custom?.max??defaults.max,step:custom?.step??(isDumbbell?1:normal),custom:!!custom};
}
const basicAssess=E.assess, basicAnalysis=E.analysis, basicReport=E.report;
function configuredMove(move,config){return {...move,reps:config.min+'–'+config.max};}
function repeatedDecline(move,variant,history,asOf){
 const records=E.records(history,move,variant).filter(r=>r.full&&r.date<=asOf);
 const days=[];for(const r of records){if(days.at(-1)?.date===r.date)days[days.length-1]=r;else days.push(r);}
 if(days.length<3)return false;
 const [a,b,c]=days.slice(-3),sum=x=>x.sets.reduce((n,v)=>n+v.reps,0);
 const k=a.sets[0]?.kg;
 return k>0&&E.daysBetween(a.date,b.date)<=E.FRESH_DAYS&&E.daysBetween(b.date,c.date)<=E.FRESH_DAYS&&
  [a,b,c].every(x=>x.sets.length===3&&x.sets.every(s=>Math.abs(s.kg-k)<0.0001))&&
  sum(a)>sum(b)&&sum(b)>sum(c);
}
E.assess=function(move,variant,history,increment,asOf){
 const c=getConfiguration(move,variant,increment);
 const result=basicAssess(configuredMove(move,c),variant,history,c.step,asOf);
 result.config=c;
 if(result.status==='increase'){
  result.requiresApproval=true;
  result.nextTargetReps=c.min;
  result.detail+=' Onay verirsen yeni ağırlıkta hedef tekrarlar '+c.min+'–'+c.max+' aralığının altından başlayabilir. Kayıtlar ve set ağırlıkları otomatik değişmez.';
 }
 if(result.status==='hold'&&repeatedDecline(move,variant,history,result.asOfDate)){
  result.status='reassess';
  result.short='Son üç farklı tam antrenmanda tekrar toplamı azaldı; şimdilik ağırlık artırma.';
  result.detail='Aynı çalışma ağırlığında üç ayrı gün boyunca toplam tekrar sayısı düşmüş. Nedeni kayıtlardan belirlenemez; toparlanmanı, hareket formunu ve zorlanmanı değerlendir. Aynı yükte kalmayı veya daha hafif çalışma ağırlığını düşün.';
  result.evidence='Üç ayrı tamamlanmış hareket gününde ardışık tekrar düşüşü';
 }
 return result;
};
E.analysis=function(move,variant,history,increment){
 const c=getConfiguration(move,variant,increment),base=basicAnalysis(configuredMove(move,c),variant,history,c.step);
 const assessment=E.assess(move,variant,history,increment);
 return {...base,...assessment,volume:base.volume,volumeChange:base.volumeChange};
};
E.report=function(history,moves,weekDate,frequency,variants,increment,selected){
 const base=basicReport(history,moves,weekDate,frequency,variants,increment,selected);
 if(!base.finished)return base;
 const names=new Set(moves.flatMap(m=>(m.options?.length?m.options:[{name:m.name}]).map(o=>o.name)));
 const messages=base.messages.filter(m=>![...names].some(name=>m.startsWith(name+': ')));
 const inWeek=(Array.isArray(history)?history:[]).filter(x=>x?.date>=base.days[0]&&x?.date<=base.days[6]&&['finished','stopped'].includes(x.status));
 const historyUntil=(Array.isArray(history)?history:[]).filter(x=>x?.date<=base.days[6]);
 const assessments=[];
 for(const move of moves){
  const attempts=inWeek.flatMap(s=>(Array.isArray(s.items?.[move.id])?s.items[move.id]:[])
   .filter(x=>x?.done===true).map(x=>({date:s.date,name:x.name||move.name})))
   .sort((a,b)=>a.date.localeCompare(b.date));
  const last=attempts.at(-1);if(last)assessments.push(E.assess(move,last.name,historyUntil,increment,base.days[6]));
 }
 const priority=[['invalid','caution','reassess','step_large'],['hold'],['increase']];
 let chosen=null;
 for(const statuses of priority){chosen=assessments.find(a=>statuses.includes(a.status));if(chosen)break;}
 if(chosen&&messages.length<3)messages.push(chosen.variant+': '+chosen.short);
 return {...base,messages:messages.slice(0,3)};
};
function create(tag,css,value){const el=document.createElement(tag);if(css)el.className=css;if(value!=null)el.textContent=value;return el;}
function refreshCoach(){
 try{if(typeof root.fitDrawExercises==='function')root.fitDrawExercises();if(typeof root.v21ExerciseGraph==='function')root.v21ExerciseGraph();if(typeof root.v21Report==='function')root.v21Report()}catch{}
}
function settingsUI(){
 const card=document.getElementById('coachOverview');if(!card||document.getElementById('trainerMoveSettings'))return;
 const details=create('details','coach-options');details.id='trainerMoveSettings';
 details.append(create('summary','', 'Hareket bazlı tekrar ve artış hedefleri'));
 const form=create('div','trainer-setting-fields');
 const caption=create('p','muted','Ayarlar yalnızca yeni önerileri etkiler; geçmiş seansların tekrarlarını değiştirmez.');
 const choose=create('select'),min=document.createElement('input'),max=document.createElement('input'),step=create('select');
 choose.setAttribute('aria-label','Hareket ve alternatifi');
 for(const m of catalog()){for(const opt of m.options?.length?m.options:[{name:m.name}]){
  const option=document.createElement('option');option.value=m.id+'|'+opt.name;option.textContent=opt.name;choose.add(option);
 }}
 for(const [input,label] of [[min,'En az tekrar'],[max,'En çok tekrar']]){
  input.type='number';input.min='1';input.max='100';input.step='1';input.setAttribute('aria-label',label);
 }
 for(const n of STEPS){const op=document.createElement('option');op.value=n;op.textContent=E.labelKg(n);step.add(op);}
 step.setAttribute('aria-label','Artış kademesi');
 function current(){
  const k=choose.value,idx=k.indexOf('|'),move=catalog().find(x=>x.id===k.slice(0,idx));
  return move?{move,variant:k.slice(idx+1)}:null;
 }
 function loadForm(){const selected=current();if(!selected)return;const c=getConfiguration(selected.move,selected.variant,read('formarota-coach-increment-v1',2.5));min.value=c.min;max.value=c.max;step.value=String(c.step);}
 choose.addEventListener('change',loadForm);
 const save=create('button','secondary','Kaydet');save.type='button';
 const reset=create('button','secondary','Varsayılana dön');reset.type='button';
 const status=create('p','muted','');status.setAttribute('role','status');
 save.addEventListener('click',()=>{
  const selected=current(),a=Number(min.value),b=Number(max.value),n=Number(step.value);
  if(!selected||min.value===''||max.value===''||!Number.isInteger(a)||!Number.isInteger(b)||a<1||b>100||a>=b||!STEPS.includes(n)){
   status.textContent='Tekrar aralığı ve artış kademesini kontrol et.';return;
  }
  const data=readSettings();data[choose.value]={min:a,max:b,step:n};
  if(!validateSettings(data)){status.textContent='Bu ayar kaydedilemedi.';return;}
  try{localStorage.setItem(SETTINGS_KEY,JSON.stringify(data));status.textContent='Hedef kaydedildi. Eski kayıtlar değişmedi.';refreshCoach();}
  catch{status.textContent='Cihaz depolamasına kaydedilemedi.';}
 });
 reset.addEventListener('click',()=>{
  const data=readSettings();delete data[choose.value];
  try{localStorage.setItem(SETTINGS_KEY,JSON.stringify(data));loadForm();status.textContent='Bu hareketin varsayılan hedefi geri geldi.';refreshCoach();}
  catch{status.textContent='Cihaz depolamasına kaydedilemedi.';}
 });
 form.append(caption,create('label','','Hareket ve alternatifi'),choose,
  create('label','','Alt tekrar sınırı'),min,create('label','','Üst tekrar sınırı'),max,
  create('label','','Önerilen ağırlık artışı'),step,save,reset,status);
 details.append(form);card.querySelector('.coach-options')?.after(details);
 loadForm();
 document.getElementById('confirmImport')?.addEventListener('click',()=>queueMicrotask(()=>{loadForm();refreshCoach()}));
}
function reportVolume(){
 const original=document.getElementById('coachReport');if(!original)return;
 let wrapper=document.getElementById('trainerMuscleVolume');
 if(!wrapper){wrapper=create('details','coach-volume-report');wrapper.id='trainerMuscleVolume';original.after(wrapper);}
 const offset=typeof v21ReportOffset==='number'?v21ReportOffset:0;
 const now=typeof root.today==='function'?root.today():new Date().toISOString().slice(0,10);
 const start=E.shift(E.weekStart(now),offset*7),end=E.shift(start,6);
 const data=F.weeklyVolume({fullHistory:read('kocluk-fitness-history-v1',[]),absHistory:read('formarota-abs-history-v1',[]),start,end});
 const open=wrapper.open;wrapper.replaceChildren();
 wrapper.append(create('summary','','Gerçekleşen kas grubu setleri · '+data.physicalSets+' geçerli set'));
 const inner=create('div','trainer-volume-body');
 inner.append(create('p','muted','Ana kas setleri sayılır; yardımcı katkılar ayrı gösterilir. Yarım seanslardaki geçerli setler dahildir.'));
 const all=Object.entries(data.byMuscle).filter(([,v])=>v.primarySets||v.secondarySets).sort((a,b)=>b[1].primarySets-a[1].primarySets);
 if(!all.length)inner.append(create('p','muted','Bu hafta geçerli çalışma seti kaydı yok.'));
 const top=Math.max(1,...all.map(([,v])=>v.primarySets));
 all.forEach(([name,v])=>{
  const line=create('div','trainer-volume-row');
  line.append(create('span','',name));
  const meter=document.createElement('meter');meter.min=0;meter.max=top;meter.value=v.primarySets;meter.setAttribute('aria-label',name+' ana set');
  line.append(meter,create('small','',v.primarySets+' set'+(v.secondarySets?' · +'+v.secondarySets+' yardımcı':'')));
  inner.append(line);
 });
 inner.append(create('p','muted',data.interpretation));wrapper.append(inner);wrapper.open=open;
}
function init(){
 settingsUI();reportVolume();
 const report=document.getElementById('coachReport');
 if(report&&typeof MutationObserver!=='undefined'){new MutationObserver(()=>reportVolume()).observe(report,{childList:true});}
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>queueMicrotask(init),{once:true});
else queueMicrotask(init);
root.FormaRotaTrainerAdapter=Object.freeze({validateSettings,getConfiguration,readSettings});
})(window);

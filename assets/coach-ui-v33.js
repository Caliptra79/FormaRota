/* FormaRota v33 · conservative, evidence-explained Personal Trainer. */
(function(){
'use strict';
const KEY='formarota-coach-increment-v1';
const E=window.FormaRotaCoachEngine;
if(!E)return;
const byId=id=>document.getElementById(id);
const tips={
 lat:['Gövdeni sabit tut, barı kontrollü şekilde üst göğse doğru çek.','Omuzlarını kulaklarına doğru kaldırmadan kürek kemiklerini çalıştır.','Ağrısız hareket açıklığında ve savurmadan tekrarla.'],
 row:['Gövdeni ileri geri savurmadan çekiş yap.','Sırtını nötr tut; kolların yanında kürek kemiklerini de hareket ettir.'],
 incline:['Sırtın ve kalçan sehpaya temas etsin.','Ağırlığı kontrollü indir; omuzunu rahatsız eden açıda zorlamadan çalış.'],
 pec:['Omuzlarını rahat tutup kolları kontrollü kapat.','Dirsek açını sabit tut; gereğinden fazla geriye açılma.'],
 lateral:['Omuzlarını yukarı çekmeden kolları yana doğru kaldır.','Gövdeni sallama; yavaş kontrollü tekrar yap.'],
 rear:['Omuzlarını gevşek tut, kürek kemiklerini kontrollü kullan.','Kolları savurmadan hareketi tamamla.'],
 push:['Dirseklerini gövdene yakın tut.','Omuzları değil dirsek eklemini hareket ettir; ağırlığı savurma.'],
 overhead:['Gövdeni sabit tut; belini gereğinden fazla kavislendirme.','Dirseklerini kontrollü hareket ettir, ağrıya zorlamadan bitir.'],
 zottman:['Dirseklerini gövdene yakın tut.','Dambılı indirirken ön kol dönüşünü kontrollü yap.'],
 legpress:['Belini ve kalçanı mindere sabitle.','Dizlerin ayak yönünü takip etsin; dizleri sertçe kilitleme.'],
 extension:['Dizi kontrollü açıp indir; ağırlığı savurma.','Eklemde ağrı olursa hareketi zorlamadan durdur.'],
 legcurl:['Kalçanı makinede sabit tut.','Topukları kontrollü çekip yavaş geri bırak.'],
 calf:['Ayak bileğinde kontrollü yüksel ve in.','Hareketi zıplatmadan, dengeni koruyarak yap.']
};
const alternatives={
 'Dumbbell Row':['Destek aldığın el ve diz ile gövdeni sabitle.','Dambılı kalçana doğru çek; gövdeni döndürme.'],
 'Incline Dumbbell Fly':['Dirseklerini hafif bükülü tut.','Dambılları kontrollü indir, omuzda rahatsızlık oluşan açıyı zorlama.']
};
const readHistory=()=>{try{return typeof fitGetHist==='function'?fitGetHist():[]}catch{return []}};
const readMoves=()=>{try{return typeof FIT_MOVES!=='undefined'?FIT_MOVES:[]}catch{return []}};
const getVariants=()=>{try{return typeof read==='function'?read('kocluk-fitness-variants-v1',{}):{}}catch{return {}}};
const getStep=()=>{try{const n=Number(localStorage.getItem(KEY));return [1,2.5,5].includes(n)?n:2.5}catch{return 2.5}};
function selectedName(move){
 const variants={...getVariants()};
 try{if(typeof fitCurrent!=='undefined'&&fitCurrent?.variants)Object.assign(variants,fitCurrent.variants)}catch{}
 return E.chosenVariant(move,variants);
}
function assessMove(move){return E.assess(move,selectedName(move),readHistory(),getStep(),typeof today==='function'?today():undefined)}
function text(tag,className,value){
 const el=document.createElement(tag);if(className)el.className=className;
 if(value!=null)el.textContent=value;return el;
}
function coachWeekActivities(start){
 try{
  const plans=typeof read==='function'?read('formarota-fitness-day-plan-v1',{}):{};
  return plans?.[start]&&typeof plans[start]==='object'?plans[start]:undefined;
 }catch{return undefined}
}
function coachWeek(){
 const d=typeof today==='function'?today():new Date().toISOString().slice(0,10);
 const cfg=typeof fitConf==='function'?fitConf():{frequency:2};
 const key=E.weekStart(d);
 let selected=[];
 try{selected=read('kocluk-fitness-weeks-v1',{})[key]||[]}catch{}
 return E.weekly(readHistory(),d,cfg.frequency,selected,coachWeekActivities(key));
}
function refreshOverview(){
 const card=byId('coachOverview');
 if(!card)return;
 const w=coachWeek(),moves=readMoves();
 const summary=byId('coachWeekSummary'),tip=byId('coachMainTip'),strip=byId('coachWeekStrip');
 if(summary)summary.textContent=w.finished+' / '+w.target+' farklı gün · '+w.fullSessions+' tam seans · '+w.sets+' set'+
  (w.partial?' · '+w.partial+' yarım':'')+
  (w.planReady?' · Plan hazır':w.custom?' · Plan '+w.plannedCount+'/'+w.target+' gün, henüz hazır değil':' · Öneri günleri');
 const planTip=byId('coachPlanTip');
 if(planTip){
  const now=typeof today==='function'?today():new Date().toISOString().slice(0,10);
  const missed=E.reschedule(w,now);
  planTip.hidden=missed.missed.length===0;
  if(missed.missed.length)planTip.textContent=missed.replacement
   ?'Kaçırılan bir antrenman var. '+new Date(missed.replacement+'T12:00:00').toLocaleDateString('tr-TR',{weekday:'long',day:'numeric',month:'long'})+' gününü alternatif olarak düşünebilirsin; takvim değişmedi.'
   :'Kaçırılan bir antrenman var. Bu hafta uygun bir boş gün bulunamadı; bir sonraki haftanın planını gözden geçir.';
 }
 if(strip){
  strip.replaceChildren();
  const names=['Pt','Sa','Ça','Pe','Cu','Ct','Pa'];
  w.days.forEach((date,i)=>{
   const done=w.perDay[date]>0;
   const partial=!done&&w.attended?.[date]>0;
   const activity=w.activities?.[date]||'rest';
   const scheduled=w.planned.includes(date);
   const kind=done?'done':partial?'partial':
    activity==='basket'||activity==='basket-abs'?'ball':
    activity==='abs'?'abs':activity==='other'?'other':
    scheduled?'planned':'rest';
   const label={
    rest:'Dinlenme',full:'Full Body',abs:'Karın / ABS',
    basket:'Basketbol','basket-abs':'Basketbol + ABS',
    'full-abs':'Full Body + ABS',other:'Diğer etkinlik'
   }[activity]||'Dinlenme';
   const status=done?'✓':partial?'◐':
    activity==='basket'||activity==='basket-abs'?'🏀':
    activity==='abs'?'💪':activity==='other'?'✦':
    scheduled?'●':'·';
   const el=text('div','coach-day coach-'+kind);
   el.title=date+' · '+(done?'Tam Full Body kaydedildi':partial?'Yarım seans kaydedildi':'Plan: '+label);
   el.append(text('span','coach-day-label',names[i]),text('span','coach-day-icon',status));
   strip.append(el);
  });
 }
 if(tip){
  const suggestions=moves.map(m=>assessMove(m));
  const caution=suggestions.find(x=>['invalid','caution','reassess','step_large'].includes(x.status));
  const low=suggestions.find(x=>x.status==='hold'&&x.detail.includes('alt sınırının'));
  const increase=suggestions.find(x=>x.status==='increase');
  const one=suggestions.find(x=>x.status==='collect');
  tip.textContent=caution
   ?caution.variant+': '+caution.short
   :low?low.variant+': '+low.short
   :increase?increase.variant+': '+increase.short
   :one?'Kayıtların oluşuyor. Aynı hareket için bir tamamlanmış seans daha kaydet.'
   :'Hareketlerini ve setlerini kaydettikçe kişisel ağırlık önerilerin burada görünecek.';
 }
}
function showPlan(){
 const panel=byId('fitSchedulePanel');if(!panel)return;
 const details=panel.querySelector('details.fit-fold');
 if(details)details.open=true;
 panel.scrollIntoView({behavior:'smooth',block:'start'});
}
function setupOverview(){
 const root=byId('fitnessRoot'),timer=byId('fitSessionPanel');
 if(!root||!timer||byId('coachOverview'))return;
 const card=text('section','panel coach-overview');
 card.id='coachOverview';card.dataset.fitPage='workout';
 const top=text('div','coach-top');
 const group=text('div');group.append(text('h2','', 'Antrenörün'));
 top.append(group);
 const stats=text('div','coach-week-info');
 stats.append(text('strong','', 'Haftalık durum'),text('span','', ''));
 stats.lastChild.id='coachWeekSummary';
 const strip=text('div','coach-week-strip');strip.id='coachWeekStrip';
 const reschedule=text('p','coach-reschedule');reschedule.id='coachPlanTip';reschedule.hidden=true;
 const tipBox=text('div','coach-main-tip');
 tipBox.append(text('strong','','Antrenör önerisi'),text('p','', 'Kayıtların değerlendiriliyor.'));
 tipBox.lastChild.id='coachMainTip';
 const foot=text('div','coach-actions');
 const planBtn=text('button','secondary','Haftalık planı düzenle');planBtn.type='button';planBtn.addEventListener('click',showPlan);foot.append(planBtn);
 const details=text('details','coach-options');
 const summary=text('summary','', 'Ağırlık önerisi ayarı');details.append(summary);
 const optionWrap=text('div','coach-options-body');
 const lbl=text('label','','Öneride kullanılacak en küçük artış');
 lbl.htmlFor='coachIncrement';
 const sel=document.createElement('select');sel.id='coachIncrement';
 for(const step of [1,2.5,5]){const option=document.createElement('option');option.value=step;option.textContent=E.labelKg(step);sel.add(option)}
 sel.value=String(getStep());sel.addEventListener('change',()=>{
  try{localStorage.setItem(KEY,sel.value)}catch{}
  refreshOverview();updateInlineHints();refreshAnalysis();refreshReport();
 });
 optionWrap.append(lbl,sel,text('p','muted','Yalnızca öneri miktarını değiştirir. Setlerine yazılan ağırlık değişmez.'));
 details.append(optionWrap);
 const disclaimer=text('p','coach-disclaimer','Ağrı veya teknik bozulması varsa ağırlık artırma. Öneriler kayıt bazlıdır.');
 const guide=text('details','coach-guide');
 guide.append(text('summary','','Koçum ne diyor? · Öneriler nasıl hesaplanıyor?'),
  text('p','muted','Aynı hareket ve alternatif için iki farklı günün geçerli 3 seti karşılaştırılır. Geçersiz, eski veya yarım kayıtlarla otomatik ağırlık artışı önerilmez.'),
  text('p','muted','Hareket kartındaki “Koçum ne diyor?” bölümünü açarak önceki ve son setleri görebilirsin. Kayıt yoksa neden değerlendirme yapılamadığı açıklanır. Ağrı ve teknik zorluklarını yalnızca sen değerlendirebilirsin.'));
 card.append(top,stats,strip,reschedule,tipBox,foot,details,guide,disclaimer);
 timer.before(card);
 refreshOverview();
}
function coachDate(date){
 if(!date)return '—';
 const d=new Date(date+'T12:00:00');
 return Number.isNaN(d.getTime())?date:d.toLocaleDateString('tr-TR',{day:'numeric',month:'short',year:'numeric'});
}
function briefSets(value){
 if(!value?.sets?.length)return 'Veri yok';
 const items=value.sets;
 return coachDate(value.date)+' · '+items.map(x=>E.labelKg(x.kg)+' × '+x.reps).join(' / ');
}
function updateReason(details,result){
 const wasOpen=details.open;
 details.replaceChildren();
 details.append(text('summary','','Bu öneri neden verildi?'));
 const content=text('div','coach-reason-body');
 content.append(text('p','coach-reason-meta','Kayıt durumu: '+result.evidence));
 if(result.basis?.previous)content.append(text('p','','Önceki: '+briefSets(result.basis.previous)));
 if(result.basis?.latest)content.append(text('p','','Son: '+briefSets(result.basis.latest)));
 content.append(text('p','coach-reason-detail',result.detail));
 content.append(text('p','coach-reason-disclaimer','Koç; teknik, ağrı veya setin ne kadar zor geldiğini ölçemez. Artış yalnızca senin kararınla uygulanır.'));
 details.append(content);
 details.open=wasOpen;
}
function updateInlineHints(){
 const root=byId('fitExerciseList');if(!root)return;
 const moves=readMoves();
 root.querySelectorAll('.fit-card').forEach(card=>{
  const move=moves.find(x=>x.id===card.dataset.move);if(!move)return;
  const old=card.querySelector('.coach-inline-tip');
  const result=assessMove(move);
  if(old){
   const line=old.querySelector('.coach-inline-value');
   if(line)line.textContent=result.short;
   old.dataset.coachStatus=result.status;
   let details=old.querySelector('.coach-reason');
   if(!details){details=text('details','coach-reason');old.append(details)}
   updateReason(details,result);
  }else{
   const body=card.querySelector('.fit-nametop')?.parentElement;if(!body)return;
   const hint=text('div','coach-inline-tip');
   hint.dataset.coachStatus=result.status;
   hint.append(text('span','coach-tip-dot',result.status==='increase'?'↗':result.records?'●':'?'),text('span','coach-inline-value',result.short));
   const details=text('details','coach-reason');
   updateReason(details,result);hint.append(details);
   const table=body.querySelector('.fit-settable');
   if(table)body.insertBefore(hint,table);else body.append(hint);
  }
 });
}
function augmentExercises(){
 const root=byId('fitExerciseList');if(!root)return;
 const moves=readMoves();
 root.querySelectorAll('.fit-card').forEach(card=>{
  const move=moves.find(x=>x.id===card.dataset.move);
  if(!move||card.querySelector('.coach-technique'))return;
  const body=card.querySelector('.fit-nametop')?.parentElement;
  if(!body)return;
  const instructions=alternatives[selectedName(move)]||tips[move.id]||[];
  const detail=text('details','coach-technique');
  detail.append(text('summary','', 'Teknik ipuçları'));
  const list=text('ul');
  instructions.forEach(line=>list.append(text('li','',line)));
  detail.append(list);body.append(detail);
 });
 updateInlineHints();
}
function ensureAnalysis(){
 const previous=byId('v21ExercisePrevious');
 if(!previous)return null;
 let el=byId('coachAnalysis');
 if(!el){el=text('div','coach-analysis');el.id='coachAnalysis';previous.after(el)}
 return el;
}
function ensureGraphVariant(){
 const select=byId('v21Exercise');if(!select)return;
 let picker=byId('coachGraphVariant');
 if(!picker){
  const label=text('label','','Hareket alternatifi');label.htmlFor='coachGraphVariant';label.id='coachGraphVariantLabel';
  picker=document.createElement('select');picker.id='coachGraphVariant';
  select.after(label);label.after(picker);
  picker.addEventListener('change',()=>{
   const id=byId('v21Exercise')?.value;
   if(!id)return;
   window.formaRotaCoachGraphVariant=window.formaRotaCoachGraphVariant||{};
   window.formaRotaCoachGraphVariant[id]=picker.value;
   if(typeof v21ExerciseGraph==='function')v21ExerciseGraph();
   refreshAnalysis();
  });
 }
 const move=readMoves().find(x=>x.id===select.value);
 if(!move)return;
 const options=move.options?.length?move.options:[{name:move.name}];
 const previous=window.formaRotaCoachGraphVariant?.[move.id]||selectedName(move);
 if(picker.dataset.forMove!==move.id){
  picker.replaceChildren();
  options.forEach(option=>{const op=document.createElement('option');op.value=option.name;op.textContent=option.name;picker.append(op)});
  picker.dataset.forMove=move.id;
 }
 picker.value=options.some(o=>o.name===previous)?previous:options[0].name;
 picker.hidden=options.length<2;
 const label=byId('coachGraphVariantLabel');if(label)label.hidden=options.length<2;
}
function graphName(move){
 return byId('coachGraphVariant')?.dataset.forMove===move.id
  ?(byId('coachGraphVariant')?.value||selectedName(move))
  :selectedName(move);
}
function refreshAnalysis(){
 ensureGraphVariant();
 const root=ensureAnalysis();
 const select=byId('v21Exercise');
 if(!root||!select)return;
 const move=readMoves().find(x=>x.id===select.value);
 if(!move)return;
 const data=E.analysis(move,graphName(move),readHistory(),getStep());
 root.replaceChildren();
 root.append(text('strong','', 'Antrenör analizi · '+data.variant));
 const records=text('p','muted', data.completed+' tamamlanmış karşılaştırılabilir antrenman');
 root.append(records);
 if(data.lastWeight!=null){
  const line=data.volume!=null?'Son üst ağırlık: '+E.labelKg(data.lastWeight)+' · Son hacim: '+Math.round(data.volume)+' kg×tekrar':'';
  root.append(text('p','',line));
  if(data.volumeChange!==null)root.append(text('p','muted','Önceki antrenmana göre hacim: '+(data.volumeChange>0?'+':'')+Math.round(data.volumeChange)+' kg×tekrar'));
 }
 root.append(text('p','coach-analysis-note',data.short));
 const evidence=text('details','coach-reason coach-analysis-reason');
 updateReason(evidence,data);
 root.append(evidence);
 if(move.options)root.append(text('p','muted','Grafik ve koçluk analizi seçili alternatifi ayrı değerlendirir.'));
}
function reportDate(){
 try{const monday=E.weekStart(today());return E.shift(monday,(typeof v21ReportOffset==='number'?v21ReportOffset:0)*7)}catch{return new Date().toISOString().slice(0,10)}
}
function refreshReport(){
 const original=byId('v21Report');if(!original)return;
 let box=byId('coachReport');
 if(!box){box=text('div','coach-report');box.id='coachReport';original.before(box)}
 const moves=readMoves(),date=reportDate(),week=E.weekStart(date);
 const planned=typeof read==='function'?read('kocluk-fitness-weeks-v1',{})[week]||[]:[];
 const w=E.report(readHistory(),moves,date,typeof fitConf==='function'?fitConf().frequency:2,getVariants(),getStep(),planned,coachWeekActivities(week));
 box.replaceChildren();
 box.append(text('h3','', 'Antrenörün haftalık değerlendirmesi'));
 box.append(text('p','coach-report-summary', w.finished+' / '+w.target+' farklı gün · '+w.fullSessions+' tam seans · '+w.sets+' set'+(w.partial?' · '+w.partial+' eksik/yarım seans':'')));
 const list=text('ul');
 w.messages.forEach(message=>list.append(text('li','',message)));
 box.append(list);
}
function hook(name,after){
 const original=window[name];if(typeof original!=='function'||original.__coachWrapped)return;
 const wrapped=function(...args){const result=original.apply(this,args);after();return result};
 wrapped.__coachWrapped=true;window[name]=wrapped;
}
function init(){
 setupOverview();
 augmentExercises();refreshAnalysis();refreshReport();
 hook('fitDrawExercises',()=>{augmentExercises();refreshOverview()});
 hook('fitDrawWeek',refreshOverview);
 hook('fitDrawHistory',()=>{refreshOverview();refreshReport();refreshAnalysis()});
 hook('v21ExerciseGraph',refreshAnalysis);
 hook('v21Report',refreshReport);
 hook('v21RenderInsights',()=>{refreshAnalysis();refreshReport()});
 hook('showView',()=>{refreshOverview();refreshAnalysis()});
 byId('v21Exercise')?.addEventListener('change',()=>{refreshAnalysis();if(typeof v21ExerciseGraph==='function')v21ExerciseGraph()});
 byId('confirmImport')?.addEventListener('click',()=>{queueMicrotask(()=>{byId('coachIncrement')&&(byId('coachIncrement').value=String(getStep()));refreshOverview();augmentExercises();refreshAnalysis();refreshReport()})});
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});
else init();
})();

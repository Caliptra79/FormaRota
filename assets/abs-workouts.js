/* FormaRota two-program selector and independent ABS tracker.
   Full Body storage, exercise IDs, coach and safety checks are untouched. */
(function(root){
 'use strict';
 const doc=root.document,engine=root.FormaRotaABSEngine;
 if(!doc||!engine)return;
 const KEY=Object.freeze({current:'formarota-abs-current-v1',history:'formarota-abs-history-v1',choice:'formarota-workout-choice-v1',full:'kocluk-fitness-history-v1'});
 const $=id=>doc.getElementById(id);
 const element=(name,cls,text)=>{
  const e=doc.createElement(name);if(cls)e.className=cls;
  if(text!==undefined)e.textContent=text;
  return e;
 };
 const read=(key,defaultValue)=>{
  try{const raw=root.localStorage.getItem(key);return raw===null?defaultValue:JSON.parse(raw)}catch{return defaultValue}
 };
 const save=(key,data)=>{
  try{root.localStorage.setItem(key,JSON.stringify(data));return true}
  catch{root.alert?.('Kayıt yapılamadı. Cihaz depolamasını ve boş alanı kontrol et.');return false}
 };
 const selected=()=>root.localStorage.getItem(KEY.choice)==='abs'?'abs':'fullbody';
 const day=()=>{
  const d=new Date();
  return [d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-');
 };
 const current=()=>read(KEY.current,null);
 const history=()=>{const all=read(KEY.history,[]);return Array.isArray(all)?all:[]};
 const fullHistory=()=>{const all=read(KEY.full,[]);return Array.isArray(all)?all:[]};
 const number=(v,fallback=0)=>Number.isFinite(Number(v))?Number(v):fallback;
 const fmt=n=>new Intl.NumberFormat('tr-TR',{maximumFractionDigits:1}).format(n);
 let edited=null;
 function message(text,mode='info'){
  const node=$('absStatus');
  if(node)node.textContent=text;
  if(mode==='success')root.FormaRotaLuxe?.toast?.(text);
 }
 function updateSelection(){
  doc.documentElement.dataset.workoutProgram=selected();
  for(const choice of doc.querySelectorAll('[data-workout-choice]')){
   const active=choice.dataset.workoutChoice===selected();
   choice.setAttribute('aria-pressed',String(active));
   choice.classList.toggle('active',active);
  }
  const active=$('absWorkoutHero');
  if(active)active.setAttribute('aria-label','ABS antrenman stüdyosu');
  root.FormaRotaStudioPlus?.renderRings?.();
 }
 function choose(program){
  if(!['fullbody','abs'].includes(program))return;
  if(program!=='abs')pauseWatch();
  root.localStorage.setItem(KEY.choice,program);
  updateSelection();
  refresh();
 }
 function start(){
  const previous=current();
  if(previous){message('ABS seansın zaten açık. Kaldığın yerden devam edebilirsin.');return}
  const d=day(),startedAt=new Date().toISOString();
  const id='abs-'+d+'-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,8);
  if(!save(KEY.current,engine.session(d,id,startedAt)))return;
  edited=null;refresh();message('ABS başladı. Dört hareketin setlerini kaydetmeye başlayabilirsin.','success');
 }
 function saveSet(id,index){
  const move=engine.MOVES.find(x=>x.id===id),active=current();
  if(!move||!active||!Number.isInteger(index)||index<0||index>2)return;
  if(active.status==='stopped'||active.status==='finished')return;
  const input=$('abs-'+id+'-'+index);
  if(!input)return;
  const n=Number(input.value);
  const proposed=move.kind==='seconds'?{done:true,seconds:n,doneAt:new Date().toISOString()}:{done:true,reps:n,doneAt:new Date().toISOString()};
  if(!engine.validSet(move,proposed)){
   message(move.kind==='seconds'?'Plank süresini 1–7200 saniye arasında gir.':'Tekrarı 1–150 arasında tam sayı olarak gir.');input.focus();return;
  }
  const existing=active.items?.[id]?.[index];
  if(existing?.done&&edited!==id+':'+index){edited=id+':'+index;renderCards();const editInput=$('abs-'+id+'-'+index);editInput?.focus();return}
  const next=structuredClone(active);
  next.items[id][index]={...proposed,doneAt:existing?.doneAt||proposed.doneAt,editedAt:existing?.done?new Date().toISOString():undefined};
  if(!save(KEY.current,next))return;
  edited=null;refresh();
  const moveCount=next.items[id].filter(x=>engine.validSet(move,x)).length;
  const card=[...doc.querySelectorAll('#absExerciseList .abs-exercise')].find(x=>x.dataset.exercise===id);
  if(card&&root.matchMedia?.('(prefers-reduced-motion: no-preference)').matches){
   card.classList.add(moveCount===3?'abs-complete-pulse':'abs-set-pulse');
  }
  if(moveCount===3)message(move.tr+' · 3 set tamamlandı ✓','success');
  else message(move.tr+' · '+(index+1)+'. set kaydedildi ✓','success');
 }
 function undo(id,index){
  const active=current(),move=engine.MOVES.find(x=>x.id===id);
  if(!active||!move||!active.items?.[id]?.[index]?.done)return;
  if(!root.confirm?.(move.tr+' — '+(index+1)+'. set kaydını geri alalım mı?'))return;
  const next=structuredClone(active);
  next.items[id][index]=null;
  if(!save(KEY.current,next))return;
  edited=null;refresh();message('Set kaydı geri alındı.');
 }
 function finish(complete){
  pauseWatch();
  const active=current();
  if(!active)return;
  const done=engine.count(active);
  if(complete&&!engine.complete(active)){message('ABS tamamlandı kaydı için 4 hareketin 12 geçerli seti gerekli. Şu an '+done+'/12 set kayıtlı.');return}
  if(!complete&&!done){message('Henüz kaydedilmiş set yok. Önce bir set kaydet.');return}
  const text=complete?'12/12 set tamamlandı. Bugünkü ABS antrenmanını geçmişe kaydedelim mi?':
   done+'/12 set kaydedildi. Seans geçmişe “yarım bırakıldı” olarak eklensin mi?';
  if(!root.confirm?.(text))return;
  const end=new Date().toISOString(),next={...active,status:complete?'finished':'stopped',endedAt:end,watch:{elapsedMs:0,startedAt:null}};
  const previous=history();
  if(!save(KEY.history,[...previous,next]))return;
  try{root.localStorage.removeItem(KEY.current)}catch{}
  edited=null;refresh();
  message(complete?'Bugün ABS antrenmanını tamamladın! Geçmişe kaydedildi.':'ABS seansı yarım olarak geçmişe kaydedildi.','success');
  root.FormaRotaStudioPlus?.refresh?.();
 }
 function stopwatchMs(record){
  const watch=record?.watch||{};
  const previous=Math.max(0,number(watch.elapsedMs));
  const start=Number(watch.startedAt);
  return Math.max(0,Math.min(7200000,previous+(Number.isFinite(start)&&start>0?Math.max(0,Date.now()-start):0)));
 }
 function startWatch(){
  const active=current();if(!active)return;
  if(active.watch?.startedAt)return;
  const next=structuredClone(active);
  next.watch={elapsedMs:stopwatchMs(active),startedAt:Date.now()};
  if(save(KEY.current,next))refreshWatch();
 }
 function pauseWatch(){
  const active=current();
  if(!active?.watch?.startedAt)return;
  const next=structuredClone(active);
  next.watch={elapsedMs:stopwatchMs(active),startedAt:null};
  save(KEY.current,next);
  refreshWatch();
 }
 function resetWatch(){
  const active=current();if(!active)return;
  const next=structuredClone(active);
  next.watch={elapsedMs:0,startedAt:null};
  if(save(KEY.current,next))refreshWatch();
 }
 function transferWatch(){
  pauseWatch();
  const active=current();if(!active)return;
  const time=Math.round(stopwatchMs(active)/1000);
  if(time<1||time>7200){message('Önce kronometreyle en az 1 saniye ölç veya süreyi elle gir.');return}
  const plank=engine.MOVES.find(x=>x.id==='plank');
  const target=active.items.plank.findIndex(row=>!engine.validSet(plank,row));
  if(target<0){message('Üç plank seti de kayıtlı. Süreyi düzeltmek için istediğin sete dokun.');return}
  const field=$('abs-plank-'+target);
  if(field){field.value=String(time);field.focus({preventScroll:true});}
  resetWatch();
  message('Ölçülen '+time+' saniye '+(target+1)+'. sete aktarıldı. Kaydet düğmesine dokun.');
 }
 function refreshWatch(){
  const active=current(),running=Boolean(active?.watch?.startedAt),millis=stopwatchMs(active);
  const seconds=Math.floor(millis/1000);
  const label=$('absWatchTime');
  if(label)label.textContent=String(Math.floor(seconds/60)).padStart(2,'0')+':'+String(seconds%60).padStart(2,'0');
  for(const [id,disabled] of [['absWatchStart',!active||running],['absWatchPause',!active||!running],
   ['absWatchReset',!active],['absWatchTransfer',!active||seconds<1]]){
   const btn=$(id);if(btn)btn.disabled=disabled;
  }
 }
 function cardFor(move,index,active){
  const card=element('article','abs-exercise sp-move-card');
  card.dataset.exercise=move.id;
  const values=Array.isArray(active?.items?.[move.id])?active.items[move.id]:[null,null,null];
  const done=values.filter(s=>engine.validSet(move,s)).length;
  card.classList.toggle('abs-complete',done===3);
  const figure=element('div','abs-figure');
  const img=element('img');
  img.src=move.gif;img.alt=move.name+' animasyonu (FitnessProgramer)';
  img.loading='lazy';img.decoding='async';img.referrerPolicy='no-referrer';
  const fallback=element('div','abs-figure-fallback','GIF yüklenemedi. Hareketi kaynak sayfasında görüntüleyebilirsin.');
  fallback.hidden=true;
  img.onerror=()=>{img.hidden=true;fallback.hidden=false};
  figure.append(img,fallback);
  const link=element('a','abs-source','Hareket ve GIF kaynağı ↗');
  link.href=move.source;link.target='_blank';link.rel='noopener noreferrer';
  figure.append(link);
  const body=element('div','abs-exercise-body');
  const top=element('div','abs-exercise-top');
  top.append(element('span','abs-exercise-overline',(index+1).toString().padStart(2,'0')+' / '+move.group.toLocaleUpperCase('tr-TR')),
   element('span','abs-done-pill',done+'/3 set'+(done===3?' ✓':'')));
  const name=element('h3','',move.name+' · '+move.tr);
  const hint=element('p','abs-move-hint',move.suggested+' · '+move.tip);
  const units=element('div','abs-units');
  const table=element('div','abs-set-list');
  for(let i=0;i<3;i++){
   const saved=values[i],isDone=engine.validSet(move,saved),isEditing=edited===move.id+':'+i;
   const row=element('div','abs-set-row'+(isDone?' recorded':''));
   const caption=element('label','',String(i+1)+'. set');
   caption.htmlFor='abs-'+move.id+'-'+i;
   const input=element('input');input.id=caption.htmlFor;input.type='number';input.min='1';
   input.max=move.kind==='seconds'?'7200':'150';input.step='1';input.inputMode='numeric';
   input.placeholder=move.kind==='seconds'?'saniye':'tekrar';
   input.value=isDone?String(move.kind==='seconds'?saved.seconds:saved.reps):
    (move.kind==='seconds'?'':String(move.defaultValue));
   input.disabled=!active||(isDone&&!isEditing);
   input.setAttribute('aria-label',move.tr+' '+(i+1)+'. set '+(move.kind==='seconds'?'süre (saniye)':'tekrar'));
   const suffix=element('span','abs-unit',move.kind==='seconds'?'sn':'tekrar');
   const btn=element('button',isDone&&!isEditing?'secondary':'',!active?'Başlat':isEditing?'Düzeltmeyi kaydet':isDone?'Düzelt':'Kaydet');
   btn.type='button';btn.disabled=!active;
   btn.addEventListener('click',()=>{
    if(isDone&&!isEditing){edited=move.id+':'+i;renderCards();$('abs-'+move.id+'-'+i)?.focus();return}
    saveSet(move.id,i);
   });
   const action=element('div','abs-row-actions');action.append(btn);
   if(isDone){
    const undoBtn=element('button','secondary abs-undo','↶');undoBtn.type='button';
    undoBtn.title=(i+1)+'. seti geri al';undoBtn.setAttribute('aria-label',undoBtn.title);
    undoBtn.addEventListener('click',()=>undo(move.id,i));action.append(undoBtn);
   }
   row.append(caption,input,suffix,action);table.append(row);
  }
  body.append(top,name,hint,units,table);
  if(move.kind==='seconds')body.append(element('p','abs-timer-tip','Plank süresini kronometreyle ölçüp sıradaki sete aktarabilir veya saniyeyi elle girebilirsin.'));
  card.append(figure,body);return card;
 }
 function renderCards(){
  const parent=$('absExerciseList');if(!parent)return;
  const active=current(),fragment=doc.createDocumentFragment();
  engine.MOVES.forEach((move,index)=>fragment.append(cardFor(move,index,active)));
  parent.replaceChildren(fragment);
 }
 function renderHistory(){
  const root=$('absHistory');if(!root)return;
  root.replaceChildren();
  const items=history().slice().sort((a,b)=>String(b.endedAt||b.startedAt).localeCompare(String(a.endedAt||a.startedAt))).slice(0,20);
  if(!items.length){root.append(element('p','muted','Henüz ABS geçmişi yok. Seansı bitirince burada görünecek.'));return}
  items.forEach(record=>{
   const item=element('div','abs-history-row');
   const left=element('div');
   const complete=engine.finished(record);
   left.append(element('strong','',record.date+' · '+(complete?'✓ ABS tamamlandı':'ABS yarım bırakıldı')),
    element('small','',engine.count(record)+'/12 set · '+
     (record.items?.plank||[]).filter(x=>x?.done).map(x=>x.seconds+' sn').join(' / ')+
     (record.items?.plank?.some(x=>x?.done)?' plank':' plank kaydı yok')));
   item.append(left,element('span','abs-history-badge'+(complete?' done':''),complete?'Tamamlandı':'Eksik'));
   root.append(item);
  });
 }
 function renderToday(){
  const node=$('workoutTodaySummary');if(!node)return;
  const date=day(),completed=engine.todaySummary(history(),fullHistory(),date);
  const active=current(),fullActive=read('kocluk-fitness-current-v1',null);
  const pieces=[];
  if(completed.fullCompleted)pieces.push('✓ Bugün Full Body yaptın');
  if(completed.absCompleted)pieces.push('✓ Bugün ABS yaptın');
  if(!pieces.length)pieces.push('Bugün henüz tamamlanmış antrenman kaydın yok.');
  if(active)pieces.push('ABS devam ediyor · '+engine.count(active)+'/12 set');
  if(fullActive)pieces.push('Full Body devam ediyor');
  node.replaceChildren();
  pieces.forEach((text,i)=>node.append(element('span',i?'abs-today-note':'abs-today-main',text)));
 }
 function renderHero(){
  const active=current(),done=engine.count(active);
  const ring=$('absProgressRing');if(ring){
   ring.style.setProperty('--studio-value',(done/12*100).toFixed(1)+'%');
   ring.setAttribute('aria-valuenow',String(done));
  }
  const count=$('absDoneCount');if(count)count.textContent=String(done);
  const note=$('absProgressNote');if(note)note.textContent=done===12?'12/12 set hazır · ABS seansını bitirip kaydet':
   active?done+'/12 set kaydedildi · '+(12-done)+' set kaldı':'Dört hareket · 12 set · doğru form öncelikli';
  const button=$('absStart');if(button){button.disabled=Boolean(active);button.textContent=active?'✓ ABS seansı açık':'▶ ABS antrenmanını başlat';}
  const finishBtn=$('absFinish');if(finishBtn)finishBtn.disabled=!active||done!==12;
  const stopBtn=$('absStop');if(stopBtn)stopBtn.disabled=!active||done===0;
  const state=$('absSessionState');if(state)state.textContent=active?'● ABS devam ediyor':'● ABS programı hazır';
  const hint=$('absSessionHint');if(hint)hint.textContent=active?'Oturum '+active.date+' tarihinde açıldı; kayıtların otomatik saklanıyor.':'Hangi gün istersen ABS seçip antrenman başlatabilirsin.';
  const progress=$('absCompletedText');if(progress)progress.textContent=done+'/12 set';
 }
 function renderHome(){
  const badge=$('homeSessionTag');if(!badge)return;
  const today=engine.todaySummary(history(),fullHistory(),day());
  if(today.any){
   badge.textContent='✓ Bugün '+today.labels.join(' + ')+' yaptın';
   badge.classList.remove('hidden');
  }else if(current()){
   badge.textContent='ABS devam ediyor';
   badge.classList.remove('hidden');
  }
 }
 function refresh(){
  updateSelection();
  renderCards();renderHero();renderHistory();renderToday();refreshWatch();
  renderHome();
 }
 function onRoute(view){
  if(view!=='fitness'||selected()!=='abs')pauseWatch();
  // showView owns .hidden routing; all of our panels are switched via theme-safe CSS.
  updateSelection();
  renderToday();
  if(view==='fitness-history')renderHistory();
  if(view==='insights')renderReport();
 }
 function completedOn(date){
  return engine.completedDates(history()).has(date);
 }
 function renderReport(dates){
  const selected=Array.isArray(dates)?dates:(root.FormaRotaStudioPlus?.weeklyData?.()?.dates||[]);
  const count=engine.weekCount(history(),selected);
  const report=$('v21Report');
  if(report){
   let row=$('absWeekReport');
   if(!row){row=element('p','abs-week-report');row.id='absWeekReport';report.append(row)}
   row.textContent='Karın (ABS): Bu hafta '+count+' farklı günde 12/12 set tamamlandı.';
  }
  const story=$('spWeekStory');
  if(story){
   let banner=$('absWeekStory');
   if(!banner){banner=element('div','abs-week-story');banner.id='absWeekStory';story.append(banner)}
   banner.textContent='✦ ABS · '+count+' tamamlanan gün / '+selected.length+' günlük dönem';
  }
 }
 function selectedProgress(){
  return {selected:selected(),count:engine.count(current())};
 }
 function refreshImported(){
  edited=null;
  try{
   const chosen=root.localStorage.getItem(KEY.choice);
   if(chosen!=='abs'&&chosen!=='fullbody')root.localStorage.setItem(KEY.choice,'fullbody');
  }catch{}
  refresh();
  root.FormaRotaStudioPlus?.refresh?.();
  renderReport();
 }
 function init(){
  const parent=$('workoutProgramChooser');if(!parent)return;
  for(const btn of parent.querySelectorAll('[data-workout-choice]')){
   btn.addEventListener('click',()=>choose(btn.dataset.workoutChoice));
  }
  $('absStart')?.addEventListener('click',start);
  $('absFinish')?.addEventListener('click',()=>finish(true));
  $('absStop')?.addEventListener('click',()=>finish(false));
  $('absWatchStart')?.addEventListener('click',startWatch);
  $('absWatchPause')?.addEventListener('click',pauseWatch);
  $('absWatchReset')?.addEventListener('click',resetWatch);
  $('absWatchTransfer')?.addEventListener('click',transferWatch);
  doc.addEventListener('visibilitychange',()=>{
   if(doc.visibilityState==='hidden')pauseWatch();
   else refresh();
  });
  root.addEventListener('pageshow',refresh);
  root.setInterval(()=>{
   if(current()?.watch?.startedAt&&doc.visibilityState==='visible')refreshWatch();
  },500);
  // Restore an interrupted stopwatch in paused state; no invented background seconds.
  const interrupted=current();
  if(interrupted?.watch?.startedAt){
   const fixed=structuredClone(interrupted);
   fixed.watch={elapsedMs:Math.max(0,number(interrupted.watch.elapsedMs)),startedAt:null};
   save(KEY.current,fixed);
  }
  refresh();
  renderReport();
 }
 root.FormaRotaABS=Object.freeze({refresh,renderHistory,renderHome,renderToday,renderReport,
  onRoute,completedOn,selectedProgress,refreshImported,choose,start,finish,
  startWatch,pauseWatch,transferWatch});
 if(doc.readyState==='loading')doc.addEventListener('DOMContentLoaded',init,{once:true});
 else init();
})(window);

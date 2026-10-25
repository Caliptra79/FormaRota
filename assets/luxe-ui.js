/* FormaRota Luxe: accessible progressive enhancements, no changes to stored data. */
(function (root) {
 'use strict';
 const doc=root.document;
 if(!doc)return;
 const THEMES=[
  {id:'night',name:'Gece',subtitle:'Graphite Mint',bg:'#0c141a',ink:'#f1f6f6',accent:'#83ddba',dots:['#ffa083','#b9a6f9','#77c9ef']},
  {id:'ocean',name:'Okyanus',subtitle:'Ocean Luxe',bg:'#091821',ink:'#f0f8fa',accent:'#77d8d1',dots:['#76dcf4','#bcb3ff','#ffa888']},
  {id:'light',name:'Gün Işığı',subtitle:'Soft Studio',bg:'#f4f6f7',ink:'#18282e',accent:'#17634e',dots:['#be634f','#7762b8','#257ba2']},
  {id:'sand',name:'Kum',subtitle:'Sand Gold',bg:'#f7f5f0',ink:'#302d27',accent:'#875531',dots:['#bd6550','#7e66a7','#39846b']},
  {id:'neon',name:'Neon Mor',subtitle:'Midnight Pulse',bg:'#100b1d',ink:'#faf5ff',accent:'#db7bff',dots:['#ff96b7','#79d4f3','#85efcf']},
  {id:'volt',name:'Volt',subtitle:'Volt Violet',bg:'#0b1011',ink:'#f3fffc',accent:'#bcfc45',dots:['#bcb1f4','#83d9f0','#f1d680']},
  {id:'sunset',name:'Sunset',subtitle:'Sunset Drive',bg:'#190e16',ink:'#fff7f4',accent:'#ff9b67',dots:['#dca6ed','#90cfe6','#a3e5c0']}
 ];
 const byId=id=>doc.getElementById(id);
 const make=(tag,className,text)=>{
  const el=doc.createElement(tag);
  if(className)el.className=className;
  if(text!==undefined)el.textContent=text;
  return el;
 };
 const setThemePreview=id=>{
  const theme=THEMES.find(t=>t.id===id);
  if(!theme)return;
  doc.documentElement.dataset.theme=id;
  const meta=doc.querySelector('meta[name="theme-color"]');
  if(meta)meta.content=theme.bg;
 };
 let toastTimer=0;
 let lastFocus=null;
 let sheetOpen=false;
 function toast(message,kind='success'){
  const stack=byId('luxeToastStack');
  if(!stack)return;
  root.clearTimeout(toastTimer);
  stack.replaceChildren();
  const card=make('div','luxe-toast');
  card.setAttribute('role','status');
  const icon=make('span','luxe-toast-icon',kind==='success'?'✓':'ℹ');
  icon.setAttribute('aria-hidden','true');
  card.append(icon,make('span','',message));
  stack.append(card);
  toastTimer=root.setTimeout(()=>stack.replaceChildren(),2850);
 }
 function dialog(title,returnTo){
  const el=make('dialog','luxe-dialog');
  const head=make('div','luxe-dialog-head');
  const heading=make('h2','',title);
  heading.id='luxeDialogTitle';
  const close=make('button','luxe-close','✕');
  close.type='button';close.setAttribute('aria-label','Pencereyi kapat');
  head.append(heading,close);
  const body=make('div','luxe-dialog-body');
  el.append(head,body);
  el.setAttribute('aria-labelledby','luxeDialogTitle');
  el.addEventListener('click',event=>{
   if(event.target===el)el.close();
  });
  close.addEventListener('click',()=>el.close());
  const restore=returnTo||doc.activeElement;
  el.addEventListener('close',()=>{
   el.remove();
   if(restore?.isConnected&&typeof restore.focus==='function')restore.focus({preventScroll:true});
  },{once:true});
  doc.body.append(el);
  if(typeof el.showModal==='function')el.showModal();
  else el.setAttribute('open','');
  return {el,body};
 }
 function actionButton(text,callback,secondary=false){
  const el=make('button',secondary?'secondary':'',text);
  el.type='button';
  el.addEventListener('click',callback);
  return el;
 }
 function actions(parent,items){
  const footer=make('div','luxe-dialog-actions');
  for(const {label,action,secondary} of items){
   footer.append(actionButton(label,action,secondary));
  }
  parent.append(footer);
 }
 function confirmDelete(button){
  const item=button.closest('.entry');
  const name=item?.querySelector('strong')?.textContent?.trim()||'Bu besin';
  const handler=button.onclick;
  if(typeof handler!=='function')return;
  const {el,body}=dialog('Öğün kaydını sil',button);
  body.append(make('p','',name+' kaydı günlük toplamdan çıkarılacak. Bu işlem geri alınamaz.'));
  actions(body,[
   {label:'Vazgeç',secondary:true,action:()=>el.close()},
   {label:'Kaydı sil',action:()=>{
    el.close();
    handler.call(button);
    toast('Öğün kaydı silindi','info');
   }}
  ]);
 }
 function openThemeDialog(trigger){
  const select=byId('themeSelect');
  if(!select)return;
  const initial=select.value;
  let pending=initial,applied=false;
  const {el,body}=dialog('Temanı seç',trigger);
  body.append(make('p','','Temayı önce ekranda dene. Beğenmezsen Vazgeç dediğinde eski görünümün korunur.'));
  const grid=make('div','luxe-theme-grid');
  const tiles=[];
  function pick(id){
   pending=id;
   setThemePreview(id);
   for(const tile of tiles){
    const selected=tile.dataset.themeChoice===id;
    tile.setAttribute('aria-pressed',String(selected));
    tile.querySelector('.luxe-theme-check').textContent=selected?'✓ Seçili':'';
   }
  }
  for(const theme of THEMES){
   const tile=make('button','luxe-theme-tile');
   tile.type='button';
   tile.dataset.themeChoice=theme.id;
   tile.style.setProperty('--tile-bg',theme.bg);
   tile.style.setProperty('--tile-ink',theme.ink);
   tile.style.setProperty('--tile-accent',theme.accent);
   const top=make('span','luxe-theme-top');
   top.append(make('strong','',theme.name),make('span','luxe-theme-check'));
   const dots=make('span','luxe-theme-dots');
   for(const color of [theme.accent,...theme.dots]){
    const dot=make('i');dot.style.setProperty('--swatch',color);
    dot.setAttribute('aria-hidden','true');dots.append(dot);
   }
   tile.append(top,make('small','',theme.subtitle),dots);
   tile.addEventListener('click',()=>pick(theme.id));
   grid.append(tile);tiles.push(tile);
  }
  body.append(grid);
  actions(body,[
   {label:'Vazgeç',secondary:true,action:()=>el.close()},
   {label:'Temayı uygula',action:()=>{
    select.value=pending;
    select.dispatchEvent(new Event('change',{bubbles:true}));
    applied=true;
    updateThemeLaunch();
    el.close();
    toast('Tema uygulandı: '+THEMES.find(t=>t.id===pending).name);
   }}
  ]);
  el.addEventListener('close',()=>{if(!applied)setThemePreview(initial)},{once:true});
  pick(initial);
 }
 function updateThemeLaunch(){
  const theme=THEMES.find(t=>t.id===byId('themeSelect')?.value)||THEMES[0];
  const name=byId('luxeThemeName');
  if(name)name.textContent=theme.name+' · '+theme.subtitle;
 }
 function openMealSheet(){
  const panel=byId('searchPanel');
  const shade=byId('luxeShade');
  if(!panel||!shade)return false;
  if(!sheetOpen)lastFocus=doc.activeElement;
  sheetOpen=true;
  shade.hidden=false;
  doc.body.classList.add('luxe-sheet-active');
  panel.setAttribute('role','dialog');
  panel.setAttribute('aria-modal','true');
  panel.setAttribute('aria-labelledby','mealEditorTitle');
  const search=byId('query');
  if(search&&root.matchMedia?.('(pointer:fine)').matches){
   root.requestAnimationFrame(()=>search.focus({preventScroll:true}));
  }else{
   const close=byId('closeMealEditor');
   root.requestAnimationFrame(()=>close?.focus({preventScroll:true}));
  }
  return true;
 }
 function closeMealSheet(restoreFocus=true){
  if(!sheetOpen)return false;
  sheetOpen=false;
  const shade=byId('luxeShade'),panel=byId('searchPanel');
  if(shade)shade.hidden=true;
  doc.body.classList.remove('luxe-sheet-active');
  panel?.removeAttribute('role');
  panel?.removeAttribute('aria-modal');
  panel?.removeAttribute('aria-labelledby');
  if(restoreFocus&&lastFocus?.isConnected&&typeof lastFocus.focus==='function'){
   root.requestAnimationFrame(()=>lastFocus.focus({preventScroll:true}));
  }
  lastFocus=null;
  return true;
 }
 function viewChange(view){
  if(view!=='nutrition'&&sheetOpen){
   closeMealSheet(false);
   byId('searchPanel')?.classList.add('hidden','meal-editor-closed');
  }
 }
 function detailWorkout(button){
  const card=button.closest('.fit-card');
  if(!card)return;
  const name=card.querySelector('.fit-nametop strong')?.textContent?.trim()||'Hareket detayı';
  const img=card.querySelector('.fit-art img,.fit-gif-preview img');
  const hint=card.querySelector('.muted')?.textContent?.trim();
  const {el,body}=dialog(name,button);
  if(img){
   const preview=make('img','luxe-exercise-preview');
   preview.src=img.getAttribute('src');
   preview.alt=img.alt||name;
   preview.loading='lazy';
   body.append(preview);
  }
  if(hint)body.append(make('p','',hint));
  const details=make('div','luxe-feature-list');
  const cells=[
   ['📌 Program','Mevcut hareket ve setlerin aynen korunuyor.'],
   ['📈 Kayıt','Ağırlık ve tekrar gelişimini hareket kartından izle.']
  ];
  for(const [heading,sub] of cells){
   const box=make('div');box.append(make('strong','',heading),make('span','',sub));details.append(box);
  }
  body.append(details);
  actions(body,[{label:'Harekete dön',action:()=>el.close()}]);
 }
 function detailDinner(button){
  const card=button.closest('.fr-dinner-choice');
  const original=card?.querySelector('button:not(.luxe-dinner-more)');
  if(!card||!original)return;
  const title=card.querySelector('strong')?.textContent||'Akşam menüsü';
  const paragraphs=Array.from(card.querySelectorAll('p')).map(el=>el.textContent.trim());
  const {el,body}=dialog(title,button);
  for(const value of paragraphs)if(value)body.append(make('p','',value));
  body.append(make('p','','Besin değerleri yaklaşık hesaplanır. Planı seçtikten sonra miktarları değiştirebilirsin.'));
  actions(body,[
   {label:'Kapat',action:()=>el.close(),secondary:true},
   {label:'Bu menüyü seç',action:()=>{el.close();original.click()}}
  ]);
 }
 function syncWorkoutDetails(){
  const list=byId('fitExerciseList');
  if(!list)return;
  for(const card of list.querySelectorAll('.fit-card')){
   if(card.querySelector('.luxe-exercise-detail'))continue;
   const button=actionButton('Hareketi incele',()=>detailWorkout(button),true);
   button.className='luxe-exercise-detail';
   (card.querySelector('.fit-nametop')||card).append(button);
  }
 }
 function syncDinnerDetails(){
  const list=byId('dinnerSuggestions');
  if(!list)return;
  for(const card of list.querySelectorAll('.fr-dinner-choice')){
   if(card.querySelector('.luxe-dinner-more'))continue;
   const button=actionButton('Detayları gör',()=>detailDinner(button),true);
   button.className='luxe-dinner-more';
   card.append(button);
  }
 }
 function setupObservers(){
  const workouts=byId('fitExerciseList'),dinners=byId('dinnerSuggestions');
  if(workouts){
   const observer=new MutationObserver(()=>syncWorkoutDetails());
   observer.observe(workouts,{childList:true});
   syncWorkoutDetails();
  }
  if(dinners){
   const observer=new MutationObserver(()=>syncDinnerDetails());
   observer.observe(dinners,{childList:true});
   syncDinnerDetails();
  }
 }
 function init(){
  if(byId('luxeToastStack'))return;
  const toastStack=make('div','luxe-toast-stack');toastStack.id='luxeToastStack';
  toastStack.setAttribute('aria-live','polite');
  toastStack.setAttribute('aria-atomic','true');
  doc.body.append(toastStack);
  const shade=make('div','luxe-shade');shade.id='luxeShade';
  shade.hidden=true;doc.body.append(shade);
  shade.addEventListener('click',()=>{
   if(typeof root.closeMealEditor==='function')root.closeMealEditor();
   else closeMealSheet();
  });
  const launch=byId('luxeThemeLaunch');
  const select=byId('themeSelect');
  if(launch&&select){
   select.classList.add('luxe-native-select');
   updateThemeLaunch();
   launch.addEventListener('click',()=>openThemeDialog(launch));
   select.addEventListener('change',updateThemeLaunch);
  }
  doc.addEventListener('click',event=>{
   const deleteButton=event.target.closest?.('#entries .entry button.danger');
   if(deleteButton&&!event.defaultPrevented){
    event.preventDefault();
    event.stopImmediatePropagation();
    confirmDelete(deleteButton);
   }
  },true);
  doc.addEventListener('keydown',event=>{
   if(!sheetOpen)return;
   if(event.key==='Escape'){
    event.preventDefault();
    if(typeof root.closeMealEditor==='function')root.closeMealEditor();
    else closeMealSheet();
    return;
   }
   if(event.key!=='Tab')return;
   const panel=byId('searchPanel');
   if(!panel)return;
   const eligible=Array.from(panel.querySelectorAll('button:not(:disabled),a[href],input:not(:disabled),select:not(:disabled),textarea:not(:disabled),[tabindex]:not([tabindex="-1"])'))
    .filter(el=>el.getClientRects().length>0);
   if(!eligible.length)return;
   const first=eligible[0],last=eligible[eligible.length-1];
   if(event.shiftKey&&(doc.activeElement===first||!panel.contains(doc.activeElement))){
    event.preventDefault();last.focus();
   }else if(!event.shiftKey&&(doc.activeElement===last||!panel.contains(doc.activeElement))){
    event.preventDefault();first.focus();
   }
  });
  setupObservers();
 }
 root.FormaRotaLuxe=Object.freeze({toast,openMealSheet,closeMealSheet,viewChange,openThemeDialog});
 if(doc.readyState==='loading')doc.addEventListener('DOMContentLoaded',init,{once:true});
 else init();
})(window);

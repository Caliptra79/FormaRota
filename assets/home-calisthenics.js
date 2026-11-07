/* FormaRota home full-body workout tracker.
 * Separate persisted sessions from Gym Full Body and stand-alone Solo ABS.
 * Only user-entered completed sets count; no guessed resistance, reps, or kcal.
 */
(function(root){
'use strict';
const doc=root.document,E=root.FormaRotaHomeEngine;
if(!doc||!E)return;
const CURRENT='formarota-home-current-v1',HISTORY='formarota-home-history-v1';
// Kilogram values are manufacturer-rated band levels, NOT measured lifting loads.
// Previous "light/medium/heavy" entries remain readable without changing saved data.
const BAND_OPTIONS=Object.freeze([
 ['bodyweight','Vücut ağırlığı / band yok'],
 ['band-10','10 kg bant (nominal)'],
 ['band-20','20 kg bant (nominal)'],
 ['band-30','30 kg bant (nominal)'],
 ['band-40','40 kg bant (nominal)']
]);
const LEGACY_BANDS=Object.freeze({light:'Hafif bant (eski kayıt)',medium:'Orta bant (eski kayıt)',heavy:'Sert bant (eski kayıt)'});
const bandLabel=x=>BAND_OPTIONS.find(option=>option[0]===x)?.[1]||LEGACY_BANDS[x]||'';
const byId=id=>doc.getElementById(id);
const read=(key,fallback)=>{try{return JSON.parse(root.localStorage.getItem(key))??fallback}catch{return fallback}};
const history=()=>{const a=read(HISTORY,[]);return Array.isArray(a)?a:[]};
const current=()=>read(CURRENT,null);
const today=()=>{const d=new Date();return [d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-')};
const el=(tag,klass,text)=>{const n=doc.createElement(tag);if(klass)n.className=klass;if(text!==undefined)n.textContent=text;return n};
function status(msg){const x=byId('homeCalStatus');if(x)x.textContent=msg;}
function write(key,data){
 try{root.localStorage.setItem(key,JSON.stringify(data));return true}
 catch{status('Cihaz depolamasına kaydedilemedi. Kayıtlarını yedekleyip boş alanı kontrol et.');return false}
}
function lastPerformance(id){
 const sessions=history().filter(s=>E.finished(s)&&Array.isArray(s.items?.[id])).sort((a,b)=>String(b.endedAt||b.date).localeCompare(String(a.endedAt||a.date)));
 if(!sessions.length)return null;
 const prev=sessions[0],move=E.MOVES.find(m=>m.id===id),sets=prev.items[id];
 const summary=sets.map(x=>x[move.kind==='seconds'?'seconds':'reps']).join(' / ');
 const previousBands=[...new Set(sets.map(x=>x?.resistance).filter(x=>x&&x!=='bodyweight'))].map(bandLabel).filter(Boolean);
 const targetReached=sets.every(x=>Number(x[move.kind==='seconds'?'seconds':'reps'])>=move.high);
 return {text:prev.date+' · '+summary+(move.kind==='seconds'?' sn':' tekrar')+(previousBands.length?' · '+previousBands.join(' / '):''),
  advice:targetReached?'Tüm setlerde üst sınıra ulaştın: form uygunsa zorluğu küçük bir adım artır.':'Önce bütün setlerde üst tekrar/süre sınırına ulaş.'};
}
function renderCards(){
 const host=byId('homeCalMoves');if(!host)return;
 const active=current(),frag=doc.createDocumentFragment();
 const guide=el('section','home-cal-gear');
 guide.append(el('strong','','Dört ekipman · Evde Full Body'));
 guide.append(el('p','home-cal-hint','Uzun loop bantlar (10/20/30/40 kg), kapı ankrajı, geniş egzersiz matı ve isteğe bağlı şınav barları. Şınav barları, başlangıçtaki yüksek yüzeyde eğimli şınavın yerine geçmez.'));
 guide.append(el('p','home-cal-tip','Kapı ankrajını kapalı ve güvenli kapıya, kapının açılma yönüne ters taraftan kur; her sette bağlantıyı kontrol et. Bantların kg değerleri nominaldir: gerçek gerilim esneme mesafesine göre değişir.'));
 root.FormaRotaHomeMedia?.renderSetup(guide);
 frag.append(guide);
 const sections=[['Temel Full Body',E.MOVES.slice(0,10)],['Kalistenik · Core / ABS',E.MOVES.slice(10)]];
 for(const [heading,moves] of sections){
  frag.append(el('h3','home-cal-section-title',heading));
  for(const move of moves){
   const card=el('article','home-cal-move');card.dataset.exercise=move.id;
   const line=el('div','home-cal-move-head');
   line.append(el('strong','',move.tr),el('small','',move.group));card.append(line);
   const low=move.id==='dead-bug'?move.low+'–'+move.high+' / taraf':move.low+'–'+move.high+(move.kind==='seconds'?' sn':' tekrar');
   card.append(el('p','home-cal-hint',low+' · '+move.tool));
   card.append(el('p','home-cal-tip',move.tip));
   root.FormaRotaHomeMedia?.attach(card,move);
    root.FormaRotaTechnique?.attach(card,'home',move.id);
   const prev=lastPerformance(move.id);
   if(prev)card.append(el('p','home-cal-previous','Önceki: '+prev.text+'. '+prev.advice));
   if(active){
    const sets=el('div','home-cal-sets');
    for(let i=0;i<active.targetSets;i++){
     const row=active.items?.[move.id]?.[i]||null,wrap=el('div','home-cal-set');
     const input=el('input');input.type='number';input.min='1';input.max=move.kind==='seconds'?'120':'150';
     input.step='1';input.inputMode='numeric';input.id='homeCal-'+move.id+'-'+i;
     input.setAttribute('aria-label',move.tr+' '+(i+1)+'. set '+(move.kind==='seconds'?'saniye':(['dead-bug','pallof-press'].includes(move.id)?'her taraf için tekrar':'tekrar')));
     input.placeholder=move.kind==='seconds'?'saniye':(['dead-bug','pallof-press'].includes(move.id)?'her taraf':'tekrar');
     if(row)input.value=String(move.kind==='seconds'?row.seconds:row.reps);
     const intensity=el('select');intensity.id=input.id+'-band';
     intensity.setAttribute('aria-label',move.tr+' '+(i+1)+'. set direnç veya varyasyon');
     const options=BAND_OPTIONS.slice();
     if(row?.resistance&&LEGACY_BANDS[row.resistance])options.push([row.resistance,LEGACY_BANDS[row.resistance]]);
     for(const [value,label] of options){
      const o=el('option','',label);o.value=value;intensity.append(o);
     }
     intensity.value=row?.resistance||'bodyweight';
     const save=el('button','secondary',row?'Düzelt':'Kaydet');
     save.type='button';save.setAttribute('aria-label',move.tr+' '+(i+1)+'. seti kaydet');
     save.addEventListener('click',()=>saveSet(move.id,i,input.value,intensity.value));
     wrap.append(el('span','',String(i+1)+'. set'),input,intensity,save);sets.append(wrap);
    }
    card.append(sets);
   }
   frag.append(card);
  }
 }
 host.replaceChildren(frag);
}
function saveSet(id,index,value,resistance){
 const active=current(),move=E.MOVES.find(x=>x.id===id);
 if(!active||!move||!Number.isInteger(index)||index<0||index>=active.targetSets)return;
 const n=Number(value);
 const record={done:true,[move.kind==='seconds'?'seconds':'reps']:n,resistance,doneAt:new Date().toISOString()};
 if(String(value).trim()===''||!E.validSet(move,record)){status(move.tr+' için geçerli tam sayı '+(move.kind==='seconds'?'saniye':'tekrar')+' gir.');return}
 if(!BAND_OPTIONS.some(item=>item[0]===resistance)&&!Object.hasOwn(LEGACY_BANDS,resistance)){status('Geçersiz direnç seçimi.');return}
 const next=JSON.parse(JSON.stringify(active));next.items[id][index]=record;
 if(!write(CURRENT,next))return;
 render();status(move.tr+' · '+(index+1)+'. set kaydedildi ✓');
}
function start(){
 if(current()){status('Açık ev antrenmanına kaldığın yerden devam et.');return}
 const count=Number(byId('homeCalSets')?.value||2);
 const date=today();
 const record=E.create(date,'home-'+date+'-'+Date.now().toString(36),count);
 if(!write(CURRENT,record))return;
 render();status('Evde Full Body başlatıldı. Yalnızca gerçekten tamamladığın setleri kaydet.');
}
function finish(fully){
 const active=current();if(!active)return;
 const done=E.count(active),expected=E.MOVES.length*active.targetSets;
 if(fully&&!E.complete(active)){status('Tamamlanma için '+expected+' gerçek set gerekli; şu an '+done+' set kayıtlı.');return}
 if(!fully&&!done){status('Yarım seansı kaydetmeden önce en az bir gerçek set gir.');return}
 if(!root.confirm?.(fully?'Evde Full Body + Core tamamlandı olarak kaydedilsin mi?':'Gerçekleşen '+done+' set yarım seans olarak geçmişe kaydedilsin mi?'))return;
 const next={...active,status:fully?'finished':'stopped',endedAt:new Date().toISOString()};
 if(!write(HISTORY,[...history(),next]))return;
 try{root.localStorage.removeItem(CURRENT)}catch{}
 render();status(fully?'Evde Full Body + Core tamamlandı ve geçmişe kaydedildi ✓':'Yarım seans geçmişe kaydedildi.');
 root.FormaRotaRouteMap?.schedule?.();
}
function renderHistory(){
 const host=byId('homeCalHistory');if(!host)return;
 const entries=history().slice().reverse().slice(0,12),frag=doc.createDocumentFragment();
 if(!entries.length)frag.append(el('p','muted','Henüz evde Full Body kaydı yok.'));
 for(const s of entries){
  const row=el('div','home-cal-history-entry');
  row.append(el('strong','',s.date+' · '+(E.finished(s)?'✓ Tamamlandı':'◐ Yarım')),
   el('span','',E.count(s)+' / '+(E.MOVES.length*s.targetSets)+' set'));
  frag.append(row);
 }
 host.replaceChildren(frag);
}
function render(){
 const active=current(),progress=byId('homeCalProgress');
 if(progress)progress.textContent=active?E.count(active)+' / '+E.MOVES.length*active.targetSets+' set':'Program hazır';
 if(byId('homeCalStart'))byId('homeCalStart').disabled=Boolean(active);
 if(byId('homeCalSets'))byId('homeCalSets').disabled=Boolean(active);
 if(byId('homeCalFinish'))byId('homeCalFinish').disabled=!active||!E.complete(active);
 if(byId('homeCalStop'))byId('homeCalStop').disabled=!active||E.count(active)===0;
 const info=byId('homeCalSessionInfo');
 if(info)info.textContent=active?'Seans tarihi: '+active.date+' · Kaydedilen her set otomatik saklanır.':'Yeni seans için 2 setle başla; alıştıkça 3 sete çıkabilirsin.';
 renderCards();renderHistory();
}
function init(){
 if(!byId('homeCalPanel'))return;
 byId('homeCalStart')?.addEventListener('click',start);
 byId('homeCalFinish')?.addEventListener('click',()=>finish(true));
 byId('homeCalStop')?.addEventListener('click',()=>finish(false));
 render();
}
if(doc.readyState==='loading')doc.addEventListener('DOMContentLoaded',init,{once:true});else init();
root.FormaRotaHomeWorkout=Object.freeze({render,refreshImported:render,completedOn:date=>history().some(s=>s.date===date&&E.finished(s))});
})(window);

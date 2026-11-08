/* Fourth workout option. Intentionally does not touch Gym, ABS, or Home data. */
(function(root){
'use strict';
const doc=root.document,E=root.FormaRotaBandEngine;
if(!doc||!E)return;
const CURRENT='formarota-james-band-current-v1',HISTORY='formarota-james-band-history-v1';
const el=(tag,cls,text)=>{const x=doc.createElement(tag);if(cls)x.className=cls;if(text!==undefined)x.textContent=text;return x};
const $=id=>doc.getElementById(id);
const read=(key,fallback)=>{try{return JSON.parse(root.localStorage.getItem(key))??fallback}catch{return fallback}};
const history=()=>{const x=read(HISTORY,[]);return Array.isArray(x)?x:[]};
const current=()=>read(CURRENT,null);
const today=()=>{const d=new Date();return [d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-')};
function status(value){const x=$('jamesBandStatus');if(x)x.textContent=value;}
function write(key,x){try{root.localStorage.setItem(key,JSON.stringify(x));return true}catch{status('Kayıt yapılamadı. Cihazdaki boş alanı ve yedeklerini kontrol et.');return false}}
const bandName=b=>b==='none'?'Band yok':b+' kg bant (nominal)';
function select(options,value,description){
 const field=el('select');field.setAttribute('aria-label',description);
 for(const [key,label] of options){const option=el('option','',label);option.value=key;field.append(option);}
 field.value=value;return field;
}
function link(href,label){const a=el('a','james-band-source',label);a.href=href;a.target='_blank';a.rel='noopener noreferrer';return a;}
function renderMoves(){
 const host=$('jamesBandMoves');if(!host)return;
 const s=current(),h=history(),preview=s||E.create(today(),h);
 const ids=E.PLANS[preview.variant],frag=doc.createDocumentFragment();
 const field=(name,control)=>{
  const wrapper=el('label','james-band-field');
  wrapper.append(el('span','',name),control);
  return wrapper;
 };
 ids.forEach((id,index)=>{
  const m=E.MOVES.find(x=>x.id===id),r=E.recommend(id,h),g=E.GUIDANCE[id];
  if(!m||!r||!g)return;
  const savedSets=Array.isArray(s?.items?.[id])?s.items[id]:[];
  const savedCount=savedSets.filter(x=>E.validSet(m,x)).length;
  const target=preview.targetSets;
  const card=el('article','james-band-move');
  card.dataset.exercise=id;
  card.dataset.group=/Bacak|kalça|Arka bacak|Baldır/i.test(m.group)?'legs':/Sirt|Sırt/i.test(m.group)?'back':/Göğüs/i.test(m.group)?'chest':/Omuz/i.test(m.group)?'shoulders':/Karın|Core/i.test(m.group)?'core':'arms';
  card.dataset.complete=s&&savedCount===target?'true':'false';
  const mast=el('div','james-band-mast');
  const eyebrow=el('span','james-band-move-kicker','HAREKET '+String(index+1).padStart(2,'0')+' / 08');
  const count=el('span','james-band-move-count',savedCount+' / '+target+' SET');
  const dots=el('div','james-band-dots');
  dots.setAttribute('aria-label',savedCount+' / '+target+' set tamamlandı');
  for(let i=0;i<target;i++)dots.append(el('span','james-band-dot'+(E.validSet(m,savedSets[i])?' done':'')));
  mast.append(eyebrow,count,dots);
  const layout=el('div','james-band-card-layout');
  const media=el('div','james-band-media');
  const src='./assets/band-gifs/'+id+'.webp';
  const placeholder=el('p','james-band-image-wait','Hareket görseli yükleniyor…');
  const image=el('img','james-band-image');image.loading='eager';image.decoding='async';
  image.alt=m.tr+' başlangıç ve bitiş hareket görseli';image.style.opacity='0';
  const enlarge=link(src,'Görseli büyüt ↗');enlarge.className='james-band-image-link';enlarge.hidden=true;
  image.addEventListener('load',()=>{image.style.opacity='1';placeholder.hidden=true;enlarge.hidden=false;});
  image.addEventListener('error',()=>{image.hidden=true;placeholder.textContent='Hareket görseli yüklenemedi · '+id+'.webp';placeholder.hidden=false;enlarge.hidden=true;});
  image.src=src;
  media.append(placeholder,image,enlarge);
  const body=el('div','james-band-body');
  const heading=el('div','james-band-title');
  heading.append(el('strong','',m.tr),el('span','james-band-muscle',m.group));
  const facts=el('div','james-band-facts');
  facts.append(el('span','',target+' set × '+m.low+'–'+m.high+' tekrar'));
  facts.append(el('span','',g.rest+' sn dinlenme'));
  facts.append(el('span','',g.seconds+' sn / set'));
  body.append(heading,facts);
  const advice=el('div','james-band-coach-card');
  advice.append(el('span','james-band-coach-kicker','✦ KOÇLUK ÖNERİSİ'));
  advice.append(el('strong','',bandName(r.band)+' · '+r.aim+'–'+m.high+' tekrar'));
  advice.append(el('p','james-band-advice',r.advice));
  body.append(advice);
  if(r.previous)body.append(el('p','james-band-previous','◷ Önceki tamamlanan seans: '+r.previous));
  const settable=el('div','james-band-settable');
  const setHeading=el('div','james-band-settable-head');
  setHeading.append(el('strong','','SET TAKİBİ'),el('span','',savedCount+' / '+target+' tamamlandı'));
  settable.append(setHeading);
  if(s){
   for(let i=0;i<s.targetSets;i++){
    const saved=savedSets[i],line=el('div','james-band-set'+(E.validSet(m,saved)?' done':''));
    const lineHeading=el('div','james-band-set-top');
    lineHeading.append(el('strong','james-band-set-number',(i+1)+'. SET'));
    lineHeading.append(el('span','james-band-set-state',saved?'✓ Kaydedildi':'Henüz kaydedilmedi'));
    const fields=el('div','james-band-set-fields');
    const reps=el('input');reps.type='number';reps.min='1';reps.max='60';reps.step='1';reps.inputMode='numeric';reps.placeholder='Tekrar';
    reps.setAttribute('aria-label',m.tr+' '+(i+1)+'. set tekrar');
    if(saved)reps.value=saved.reps;
    const bandOptions=(m.band==='none'?['none']:E.BAND_LEVELS.filter(b=>b!=='none')).map(b=>[b,bandName(b)]);
    const band=select(bandOptions,saved?.band||r.band,m.tr+' '+(i+1)+'. set bant');
    const grip=select([['relaxed','Uzun tutuş'],['normal','Normal tutuş'],['short','Kısa tutuş']],saved?.grip||r.grip,m.tr+' bant tutuşu');
    if(m.band==='none'){band.disabled=true;grip.disabled=true;}
    const rir=select([[0,'0 tekrar kaldı'],[1,'1 tekrar kaldı'],[2,'2 tekrar kaldı'],[3,'3 tekrar kaldı'],[4,'4 tekrar kaldı'],[5,'5+ tekrar kaldı']],String(saved?.rir??2),m.tr+' '+(i+1)+'. set tekrar rezervi');
    const form=select([['good','Form temiz'],['unsure','Formdan emin değilim'],['poor','Form bozuldu']],saved?.form||'good',m.tr+' '+(i+1)+'. set teknik');
    const save=el('button','james-band-save'+(saved?' is-edit':'') ,saved?'Düzelt':'✓ Seti kaydet');save.type='button';
    save.addEventListener('click',()=>saveSet(id,i,{reps:reps.value,band:band.value,grip:grip.value,rir:rir.value,form:form.value}));
    fields.append(field('Tekrar',reps),field('Bant',band),field('Tutuş',grip),field('Yedek tekrar',rir),field('Form',form),save);
    line.append(lineHeading,fields);settable.append(line);
   }
  }else{
   settable.append(el('p','james-band-locked','▶ Antrenmana başladığında set kayıt alanları açılacak.'));
  }
  body.append(settable);
  const technique=el('details','james-band-technique');
  const summary=el('summary','','Teknik, bant kurulumu ve dikkat edilmesi gerekenler');
  const techBody=el('div','james-band-technique-body');
  techBody.append(el('p','',m.tip));
  techBody.append(el('p','james-band-setup','Bant ve sabitleme: '+g.anchor));
  techBody.append(el('p','james-band-timing','Tempo: '+g.tempo+' · Yaklaşık '+g.seconds+' sn/set'+(g.eachSide?' (iki taraf toplam)':'')+' · Set arası '+g.rest+' sn dinlenme'));
  techBody.append(el('p','james-band-warning','Dikkat: '+m.mistake));
  if(g.eachSide)techBody.append(el('p','james-band-advice','Tekrar sayısı her taraf için geçerlidir; sağ ve solu eşit çalış.'));
  const jamesSource=m.source.includes('undersunfitness.com')||m.source.includes('youtube.com/watch?v=W3t7r5_MGUw');
  techBody.append(link(m.source,m.source.includes('fithub.com.tr')?'James Grage röportajında hareketi incele':jamesSource?'Undersun / James Grage kaynak bağlantısı':'Tamamlayıcı teknik kaynağını aç'));
  technique.append(summary,techBody);body.append(technique);
  layout.append(media,body);card.append(mast,layout);frag.append(card);
 });
 host.replaceChildren(frag);
}
function saveSet(id,index,form){
 const s=current(),m=E.MOVES.find(x=>x.id===id);
 if(!s||!m||!E.PLANS[s.variant].includes(id)||index<0||index>=s.targetSets)return;
 const record={done:true,reps:form.reps===''?null:Number(form.reps),band:form.band,grip:form.grip,rir:Number(form.rir),form:form.form,doneAt:new Date().toISOString()};
 if(!E.validSet(m,record)){status('Set için geçerli tekrar (1–60), bant, tutuş, form ve tekrar rezervi gir.');return}
 const next=JSON.parse(JSON.stringify(s));next.items[id][index]=record;
 if(!write(CURRENT,next))return;
 render();status(m.tr+' · '+(index+1)+'. set kaydedildi ✓');
 root.FormaRotaOLEDHome?.schedule?.();
}
function start(){
 if(current()){status('Bir bant antrenmanın zaten açık.');return}
 const s=E.create(today(),history());
 if(!write(CURRENT,s))return;
 render();status('Bant antrenmanın başladı. Gerçek setlerini tek tek kaydet.');
 root.FormaRotaOLEDHome?.schedule?.();
}
function finish(full){
 const s=current();if(!s)return;
 const n=E.count(s),expected=E.PLANS[s.variant].length*s.targetSets;
 if(full&&!E.complete(s)){status('Tamamlama için '+expected+' geçerli set gerekli; '+n+' set kayıtlı.');return}
 if(!full&&!n){status('Yarım seans için en az bir set kaydet.');return}
 if(root.confirm&&!root.confirm(full?'Bant antrenmanı tamamlandı olarak kaydedilsin mi?':n+' setlik yarım antrenman kaydedilsin mi?'))return;
 const done={...s,status:full?'finished':'stopped',endedAt:new Date().toISOString()};
 if(!write(HISTORY,[...history(),done]))return;
 try{root.localStorage.removeItem(CURRENT)}catch{}
 render();status(full?'Bant antrenmanın kaydedildi ✓':'Yarım seans saklandı.');
 root.FormaRotaOLEDHome?.schedule?.();
 root.FormaRotaABS?.refresh?.();
}
function renderHistory(){
 const host=$('jamesBandHistory');if(!host)return;
 const rows=history().slice(-15).reverse(),frag=doc.createDocumentFragment();
 if(!rows.length)frag.append(el('p','muted','Henüz James Grage bant antrenmanı kaydı yok.'));
 for(const s of rows)frag.append(el('p','james-band-history-line',s.date+' · Full Body '+s.variant+' · Seviye '+s.stage+' · '+(E.finished(s)?'✓ Tamamlandı':'◐ Yarım')+' · '+E.count(s)+' set'));
 host.replaceChildren(frag);
}
function render(){
 const s=current(),h=history(),preview=s||E.create(today(),h),valid=s?E.count(s):0,expected=E.PLANS[preview.variant].length*preview.targetSets;
 const progress=$('jamesBandProgress');if(progress)progress.textContent='Seviye '+E.stage(h)+' · '+valid+'/'+expected+' set';
 const meter=$('jamesBandMeter');
 if(meter){meter.style.setProperty('--james-progress',Math.round(valid/expected*100)+'%');meter.setAttribute('aria-valuemax',String(expected));meter.setAttribute('aria-valuenow',String(valid));}
 if($('jamesBandMeterValue'))$('jamesBandMeterValue').textContent=String(valid);
 if($('jamesBandMeterTotal'))$('jamesBandMeterTotal').textContent='/ '+expected+' SET';
 if($('jamesBandMeterNote'))$('jamesBandMeterNote').textContent=valid?Math.round(valid/expected*100)+'% tamamlandı · Ritmini koru!':'İlk setini kaydet, gelişimini gör.';
 if($('jamesBandHeroState'))$('jamesBandHeroState').textContent=s?'● Antrenman devam ediyor':'● Sonraki rota hazır';
 if($('jamesBandHeroPlan'))$('jamesBandHeroPlan').textContent='FULL BODY '+preview.variant;
 if($('jamesBandHeroSets'))$('jamesBandHeroSets').textContent=String(preview.targetSets);
 const estimate=E.estimateSession(preview);
 if($('jamesBandHeroTime'))$('jamesBandHeroTime').textContent=estimate.minutes+' dk';
 const info=$('jamesBandInfo');if(info)info.textContent=(s?'Seansın kayıtlı; kaldığın yerden devam edebilirsin.':'Antrenmanı başlattığında set alanları açılır.')+' Yaklaşık '+estimate.minutes+' dk · 5 dk ısınma + 3 dk soğuma dahil.';
 if($('jamesBandStart'))$('jamesBandStart').disabled=Boolean(s);
 if($('jamesBandFinish'))$('jamesBandFinish').disabled=!s||!E.complete(s);
 if($('jamesBandStop'))$('jamesBandStop').disabled=!s||valid===0;
 renderMoves();renderHistory();
}
function init(){
 if(!$('jamesBandPanel'))return;
 $('jamesBandStart')?.addEventListener('click',start);
 $('jamesBandFinish')?.addEventListener('click',()=>finish(true));
 $('jamesBandStop')?.addEventListener('click',()=>finish(false));
 root.addEventListener?.('pageshow',render);
 render();
 root.navigator?.serviceWorker?.ready?.then(reg=>reg.active?.postMessage({type:'CACHE_BAND_IMAGES'})).catch(()=>{});
}
if(doc.readyState==='loading')doc.addEventListener('DOMContentLoaded',init,{once:true});else init();
root.FormaRotaJamesBand=Object.freeze({render,completedOn:date=>history().some(s=>s.date===date&&E.finished(s)),activeOn:date=>current()?.date===date,history});
})(window);

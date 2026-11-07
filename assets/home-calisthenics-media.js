/* FormaRota: optional, device-local Home GIFs. No remote images or public binary assets.
 * Import a single personal media JSON pack once on each device. GIFs live in IndexedDB.
 */
(function(root){
'use strict';
const doc=root.document;
if(!doc)return;
const DB_NAME='formarota-home-gifs-v1',STORE='gifs';
const IDS=Object.freeze(['incline-pushup','band-row','band-pulldown','squat','band-rdl',
 'band-shoulder','band-lateral','band-curl','band-triceps','glute-bridge',
 'dead-bug','pallof-press','tuck-hollow']);
const idSet=new Set(IDS);
const urls=new Map();
let dbPromise=null,modal=null;
const el=(tag,klass,txt)=>{
 const node=doc.createElement(tag);
 if(klass)node.className=klass;
 if(txt!==undefined)node.textContent=txt;
 return node;
};
function db(){
 if(!root.indexedDB)return Promise.reject(Error('Bu cihazda IndexedDB kullanılamıyor.'));
 if(!dbPromise)dbPromise=new Promise((resolve,reject)=>{
  const request=root.indexedDB.open(DB_NAME,1);
  request.onupgradeneeded=()=>request.result.createObjectStore(STORE);
  request.onsuccess=()=>resolve(request.result);
  request.onerror=()=>reject(request.error||Error('Görsel deposu açılamadı.'));
 });
 return dbPromise;
}
async function getBlob(id){
 const connection=await db();
 return new Promise((resolve,reject)=>{
  const tx=connection.transaction(STORE,'readonly');
  const req=tx.objectStore(STORE).get(id);
  req.onsuccess=()=>resolve(req.result||null);
  req.onerror=()=>reject(req.error||Error('GIF okunamadı.'));
 });
}
async function count(){
 const connection=await db();
 return new Promise((resolve,reject)=>{
  const req=connection.transaction(STORE,'readonly').objectStore(STORE).count();
  req.onsuccess=()=>resolve(req.result);
  req.onerror=()=>reject(req.error||Error('Görsel sayısı okunamadı.'));
 });
}
async function urlFor(id){
 if(!idSet.has(id))return null;
 if(urls.has(id))return urls.get(id);
 const blob=await getBlob(id);
 if(!blob)return null;
 const url=root.URL.createObjectURL(blob);
 urls.set(id,url);
 return url;
}
function dialog(){
 if(modal)return modal;
 const host=doc.createElement('dialog');
 host.className='home-cal-dialog';
 const heading=el('h3','','Hareket animasyonu');
 const img=el('img','home-cal-dialog-image');
 img.alt='';
 const close=el('button','secondary','Kapat');
 close.type='button';
 close.addEventListener('click',()=>host.close());
 host.append(heading,img,close);
 doc.body.append(host);
 host.addEventListener('click',event=>{if(event.target===host)host.close();});
 modal={host,heading,img};
 return modal;
}
function attach(card,move){
 const holder=el('div','home-cal-media');
 holder.dataset.homeGifId=move.id;
 const label=el('span','home-cal-media-placeholder','GIF bu cihazda henüz yüklenmedi.');
 holder.append(label);
 card.append(holder);
 urlFor(move.id).then(url=>{
  if(!holder.isConnected||!url)return;
  const img=el('img','home-cal-media-image');
  img.src=url;
  img.alt=move.tr+' hareket animasyonu';
  img.width=360;img.height=360;
  img.loading='lazy';img.decoding='async';
  const expand=el('button','secondary home-cal-media-expand','Büyüt');
  expand.type='button';
  expand.setAttribute('aria-label',move.tr+' animasyonunu büyüt');
  expand.addEventListener('click',()=>{
   const view=dialog();
   view.heading.textContent=move.tr;
   view.img.src=url;
   view.img.alt=move.tr+' hareket animasyonu';
   if(typeof view.host.showModal==='function')view.host.showModal();
   else view.host.setAttribute('open','');
  });
  holder.replaceChildren(img,expand);
 }).catch(()=>{if(holder.isConnected)label.textContent='GIF deposuna erişilemedi.'});
}
function gifBlob(encoded){
 if(typeof encoded!=='string'||encoded.length>3000000||!/^[A-Za-z0-9+/]+={0,2}$/.test(encoded))
  throw Error('Bozuk veya çok büyük GIF verisi.');
 let raw;
 try{raw=root.atob(encoded);}catch{throw Error('GIF kodlaması okunamadı.');}
 if(raw.length<20||raw.length>2200000||!['GIF89a','GIF87a'].includes(raw.slice(0,6)))
  throw Error('Dosya geçerli bir GIF değil.');
 const bytes=new Uint8Array(raw.length);
 for(let i=0;i<raw.length;i++)bytes[i]=raw.charCodeAt(i);
 return new Blob([bytes],{type:'image/gif'});
}
async function importPack(file){
 if(!file||file.size>15000000)throw Error('Görsel paketi çok büyük.');
 let pack;
 try{pack=JSON.parse(await file.text());}catch{throw Error('Görsel paketi JSON biçiminde okunamadı.');}
 if(pack?.kind!=='formarota-home-gifs'||pack.version!==1||!pack.images||
    typeof pack.images!=='object'||Object.keys(pack.images).length!==IDS.length||
    !IDS.every(id=>Object.hasOwn(pack.images,id)))
  throw Error('Bu dosya 13 hareketlik FormaRota görsel paketi değil.');
 const entries=IDS.map(id=>[id,gifBlob(pack.images[id])]);
 const connection=await db();
 await new Promise((resolve,reject)=>{
  const tx=connection.transaction(STORE,'readwrite');
  tx.oncomplete=resolve;
  tx.onerror=()=>reject(tx.error||Error('GIF kaydı başarısız.'));
  tx.onabort=()=>reject(tx.error||Error('GIF kaydı iptal edildi.'));
  for(const [id,blob]of entries)tx.objectStore(STORE).put(blob,id);
 });
 for(const url of urls.values())root.URL.revokeObjectURL(url);
 urls.clear();
}
function renderSetup(guide){
 const wrap=el('div','home-cal-import');
 const btn=el('button','secondary','13 GIF paketini yükle');
 btn.type='button';
 btn.setAttribute('aria-label','Kişisel ev antrenmanı GIF paketini bu cihaza yükle');
 const input=el('input');
 input.type='file';input.accept='.json,application/json';input.hidden=true;
 input.setAttribute('aria-label','FormaRota Home GIF paketi seç');
 const status=el('span','home-cal-import-status','Yerel GIF deposu kontrol ediliyor…');
 btn.addEventListener('click',()=>input.click());
 input.addEventListener('change',async()=>{
  const file=input.files?.[0];
  if(!file)return;
  btn.disabled=true;status.textContent='13 animasyon bu cihaza kaydediliyor…';
  try{
   await importPack(file);
   status.textContent='13/13 GIF yüklendi · İnternet olmadan çalışır.';
   root.FormaRotaHomeWorkout?.render?.();
  }catch(error){status.textContent=error.message||'Görseller kaydedilemedi.';}
  finally{input.value='';btn.disabled=false;}
 });
 wrap.append(btn,input,status);
 guide.append(wrap);
 count().then(n=>{if(status.isConnected)status.textContent=n+'/13 GIF bu cihazda kayıtlı.';})
  .catch(()=>{if(status.isConnected)status.textContent='Bu cihazda GIF saklama kullanılamıyor.';});
}
root.FormaRotaHomeMedia=Object.freeze({attach,renderSetup,importPack,count,IDS});
})(window);

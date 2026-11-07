/* FormaRota: 13 included Home GIFs. Stored in the app shell, no manual import.
 * These file names match the workout engine IDs exactly.
 */
(function(root){
'use strict';
const doc=root.document;
if(!doc)return;
const IDS=Object.freeze(["incline-pushup","band-row","band-pulldown","squat","band-rdl","band-shoulder","band-lateral","band-curl","band-triceps","glute-bridge","dead-bug","pallof-press","tuck-hollow"]);
const KNOWN=new Set(IDS);
const BASE='./assets/home-gifs/';
let modal=null;
function el(tag,klass,value){
 const node=doc.createElement(tag);
 if(klass)node.className=klass;
 if(value!==undefined)node.textContent=value;
 return node;
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
 if(!KNOWN.has(move.id))return;
 const holder=el('div','home-cal-media');
 holder.dataset.homeGifId=move.id;
 const img=el('img','home-cal-media-image');
 img.src=BASE+move.id+'.gif';
 img.alt=move.tr+' hareket animasyonu';
 img.width=360;img.height=360;
 img.loading='lazy';img.decoding='async';
 img.addEventListener('error',()=>{
  holder.replaceChildren(el('span','home-cal-media-placeholder','GIF yüklenemedi. İnternet bağlantısı olan bir açılıştan sonra çevrimdışı tekrar dene.'));
 });
 const expand=el('button','secondary home-cal-media-expand','Büyüt');
 expand.type='button';
 expand.setAttribute('aria-label',move.tr+' animasyonunu büyüt');
 expand.addEventListener('click',()=>{
  const view=dialog();
  view.heading.textContent=move.tr;
  view.img.src=img.src;
  view.img.alt=img.alt;
  if(typeof view.host.showModal==='function')view.host.showModal();
  else view.host.setAttribute('open','');
 });
 holder.append(img,expand);
 card.append(holder);
}
function renderSetup(guide){
 const info=el('p','home-cal-import-status','13 hareketin GIF görselleri uygulamaya dahil. Ayrı dosya yüklemen gerekmez; ilk çevrimiçi kurulumdan sonra internet olmadan çalışır.');
 guide.append(info);
}
root.FormaRotaHomeMedia=Object.freeze({attach,renderSetup,IDS});
})(window);

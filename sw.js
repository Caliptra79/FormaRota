/* FormaRota Solo v22: resilient offline shell and optional GIF cache. */
const CACHE='formarota-solo-v23-shell';
const GIF_CACHE='formarota-solo-v23-gifs';
const SHELL=['./','./index.html','./manifest.webmanifest','./icon-192.png','./icon-512.png','./apple-touch-icon.png','./assets/ui-compact-v23.css','./assets/ui-compact-v23.js'];
const GIFS=['calf','dumbbell-row','extension','incline-fly','incline','lat','lateral','legcurl','legpress','overhead','pec','push','rear','row','zottman'].map(name=>'./assets/'+name+'.gif');
self.addEventListener('install',event=>event.waitUntil((async()=>{
 const shell=await caches.open(CACHE);
 const response=await fetch('./index.html',{cache:'reload'});
 if(!response.ok)throw new Error('Offline HTML cannot be installed');
 await shell.put('./index.html',response);
 await Promise.allSettled(SHELL.filter(x=>x!=='./index.html').map(async path=>{
  const r=await fetch(path,{cache:'reload'});if(r.ok)await shell.put(path,r);
 }));
 const gifs=await caches.open(GIF_CACHE);
 await Promise.allSettled(GIFS.map(async path=>{
  const r=await fetch(path,{cache:'reload'});if(r.ok)await gifs.put(path,r);
 }));
 await self.skipWaiting();
})()));
self.addEventListener('activate',event=>event.waitUntil((async()=>{
 const keys=await caches.keys();
 await Promise.all(keys.filter(k=>k.startsWith('formarota-')&&k!==CACHE&&k!==GIF_CACHE).map(k=>caches.delete(k)));
 await self.clients.claim();
})()));
self.addEventListener('fetch',event=>{
 const req=event.request;if(req.method!=='GET')return;
 const url=new URL(req.url);if(url.origin!==self.location.origin)return;
 if(req.mode==='navigate'||url.pathname.endsWith('.html')){
  event.respondWith((async()=>{
   try{const response=await fetch(req);if(response.ok){const cache=await caches.open(CACHE);await cache.put(req,response.clone())}return response}
   catch{return await caches.match(req)||await caches.match('./index.html')||Response.error()}
  })());return;
 }
 event.respondWith((async()=>{
  const hit=await caches.match(req);if(hit)return hit;
  const response=await fetch(req);
  if(response.ok){const cache=await caches.open(url.pathname.includes('/assets/')?GIF_CACHE:CACHE);await cache.put(req,response.clone())}
  return response;
 })());
});
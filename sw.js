/* FormaRota Solo v26: offline shell, without GIF downloads. */
const CACHE='formarota-solo-v26-shell';
const SHELL=['./','./index.html','./manifest.webmanifest','./icon-192.png','./icon-512.png','./apple-touch-icon.png','./assets/ui-compact-v23.css','./assets/ui-compact-v23.js','./assets/progress-compact-v25.css','./assets/progress-compact-v25.js','./assets/theme-minimal-v26.css','./assets/fitness-simple-v26.js'];
self.addEventListener('install',event=>event.waitUntil((async()=>{
 const shell=await caches.open(CACHE);
 const response=await fetch('./index.html',{cache:'reload'});
 if(!response.ok)throw new Error('Offline HTML cannot be installed');
 await shell.put('./index.html',response);
 await Promise.allSettled(SHELL.filter(x=>x!=='./index.html').map(async path=>{
  const r=await fetch(path,{cache:'reload'});if(r.ok)await shell.put(path,r);
 }));
 await self.skipWaiting();
})()));
self.addEventListener('activate',event=>event.waitUntil((async()=>{
 const keys=await caches.keys();
 await Promise.all(keys.filter(k=>k.startsWith('formarota-')&&k!==CACHE).map(k=>caches.delete(k)));
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
  if(response.ok){const cache=await caches.open(CACHE);await cache.put(req,response.clone())}
  return response;
 })());
});
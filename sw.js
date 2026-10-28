/* FormaRota Solo: offline app shell, coach modules, and optional exercise GIF cache. */
const CACHE='formarota-solo-v55-shell';
const GIF_CACHE='formarota-solo-v55-gifs';
const GIFS=['abs-floor-crunch','abs-reverse-crunch','abs-heel-touch','abs-plank','calf','dumbbell-row','extension','incline-fly','incline','lat','lateral','legcurl','legpress','overhead','pec','push','rear','row','zottman'].map(name=>'./assets/'+name+'.gif');
const SHELL=['./','./index.html','./manifest.webmanifest','./icon-192.png','./icon-512.png','./apple-touch-icon.png','./assets/ui-compact-v23.css','./assets/ui-compact-v23.js','./assets/progress-compact-v25.css','./assets/progress-compact-v25.js','./assets/theme-minimal-v26.css','./assets/fitness-simple-v26.js','./assets/hype-themes-v29.css','./assets/coach-v30.css','./assets/coach-engine-v35.js','./assets/coach-ui-v33.js','./assets/coach-fixes-v31.css','./assets/refinement-v32.css','./assets/refinement-v32.js','./assets/coach-quality-v33.css','./assets/fitness-record-editor.js','./assets/fitness-record-editor.css','./assets/nutrition-quality.css','./assets/readability-layout.css','./assets/compact-shell.css','./assets/settings-disclosure.css','./assets/final-motion.css','./assets/date-meal-polish.css','./assets/date-masthead.js','./assets/formarota-icon.svg','./assets/turkish-foods.js','./assets/dinner-coach.js','./assets/luxe-ui.css','./assets/luxe-ui.js','./assets/studio-relaunch.css','./assets/studio-relaunch.js','./assets/contrast-guard.css','./assets/studio-plus.css','./assets/studio-plus-engine.js','./assets/studio-plus.js','./assets/abs-engine.js','./assets/abs-workouts.js','./assets/abs-workouts.css'];
self.addEventListener('install',event=>event.waitUntil((async()=>{
 const shell=await caches.open(CACHE);
 const response=await fetch('./index.html',{cache:'reload'});
 if(!response.ok)throw new Error('Offline HTML cannot be installed');
 await shell.put('./index.html',response);
 await Promise.allSettled(SHELL.filter(x=>x!=='./index.html').map(async path=>{
  const r=await fetch(path,{cache:'reload'});if(r.ok)await shell.put(path,r);
 }));
 const gifCache=await caches.open(GIF_CACHE);
 await Promise.allSettled(GIFS.map(async path=>{
  const response=await fetch(path,{cache:'reload'});
  if(response.ok)await gifCache.put(path,response);
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
   try{const response=await fetch(req);if(response.ok){const cache=await caches.open(url.pathname.includes('/assets/')&&url.pathname.endsWith('.gif')?GIF_CACHE:CACHE);await cache.put(req,response.clone())}return response}
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
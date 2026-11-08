/* FormaRota Solo: offline app shell, coach modules, and optional exercise GIF cache. */
const CACHE='formarota-solo-v113-shell';
const GIF_CACHE='formarota-solo-v113-gifs';
const GIFS=['abs-floor-crunch','abs-reverse-crunch','abs-heel-touch','abs-plank','calf','dumbbell-row','extension','incline-fly','incline','lat','lateral','legcurl','legpress','overhead','pec','push','rear','row','zottman'].map(name=>'./assets/'+name+'.gif');
const HOME_GIFS=["incline-pushup","band-row","band-pulldown","squat","band-rdl","band-shoulder","band-lateral","band-curl","band-triceps","glute-bridge","dead-bug","pallof-press","tuck-hollow"].map(id=>'./assets/home-gifs/'+id+'.gif');
const SHELL=['./','./index.html','./manifest.webmanifest','./icon-192.png','./icon-512.png','./apple-touch-icon.png','./assets/ui-compact-v23.css','./assets/ui-compact-v23.js','./assets/progress-compact-v25.css','./assets/progress-compact-v25.js','./assets/theme-minimal-v26.css','./assets/fitness-simple-v26.js','./assets/hype-themes-v29.css','./assets/coach-v30.css','./assets/trainer-foundation.js','./assets/coach-engine-v35.js','./assets/trainer-adapter.js','./assets/trainer-insights-engine.js','./assets/trainer-insights-ui.js','./assets/coach-ui-v33.js','./assets/coach-fixes-v31.css','./assets/refinement-v32.css','./assets/refinement-v32.js','./assets/coach-quality-v33.css','./assets/fitness-record-editor.js','./assets/fitness-record-editor.css','./assets/nutrition-quality.css','./assets/food-units.css','./assets/food-units.js','./assets/drink-sugar.js','./assets/food-pieces.js','./assets/food-pieces.js?fr=110','./assets/food-pieces.css','./assets/route-map.js','./assets/route-map.css','./assets/calorie-deficit.js','./assets/calorie-deficit.css','./assets/drink-sugar.css','./assets/food-search-cache.js','./assets/readability-layout.css','./assets/compact-shell.css','./assets/settings-disclosure.css','./assets/nutrition-rewards.js','./assets/rank-system.js','./assets/final-motion.css','./assets/launch-quotes.js','./assets/date-meal-polish.css','./assets/date-masthead.js','./assets/formarota-icon.svg','./assets/turkish-foods.js','./assets/ready-desserts.js','./assets/prepared-foods.js','./assets/restaurant-foods.js','./assets/restaurant-foods.js?fr=110','./assets/food-variety.js','./assets/breakfast-sweets.js','./assets/dinner-coach.js','./assets/luxe-ui.css','./assets/luxe-ui.js','./assets/studio-relaunch.css','./assets/studio-relaunch.js','./assets/contrast-guard.css','./assets/studio-plus.css','./assets/studio-plus-engine.js','./assets/studio-plus.js','./assets/abs-engine.js','./assets/abs-workouts.js','./assets/home-calisthenics-engine.js','./assets/home-calisthenics-media.js','./assets/home-calisthenics.js','./assets/home-calisthenics.css','./assets/james-band-engine.js','./assets/james-band.js','./assets/james-band.css','./assets/abs-workouts.css','./assets/hybrid-premium-v1.css','./assets/hybrid-premium-v1.js','./assets/hybrid-premium-fitness.css','./assets/hybrid-premium-fitness.js','./assets/visual-identity-2-home.css','./assets/oled-edition.css','./assets/oled-home.css','./assets/oled-home.js','./assets/oled-screens.css','./assets/smart-rest.js','./assets/smart-rest-coach.css','./assets/flexible-weekly-plan.css','./assets/tablet-desktop-layout.css','./assets/exercise-technique.js','./assets/exercise-technique.css','./assets/rank-quests.js','./assets/rank-quests.css','./assets/oled-colorburst.css','./assets/restaurant-menu-entry.css','./assets/restaurant-menu-entry.css?fr=111','./assets/abs-workouts.js?fr=108','./assets/home-calisthenics-engine.js?fr=108','./assets/home-calisthenics-media.js?fr=108','./assets/home-calisthenics.js?fr=108','./assets/luxe-ui.js?fr=108','./assets/home-calisthenics.css?fr=108','./assets/james-band-engine.js?fr=113','./assets/james-band.js?fr=112','./assets/james-band.css?fr=112','./assets/abs-workouts.css?fr=108',...HOME_GIFS];
self.addEventListener('install',event=>event.waitUntil((async()=>{
 const shell=await caches.open(CACHE);
 const response=await fetch('./index.html',{cache:'reload'});
 if(!response.ok)throw new Error('Offline HTML cannot be installed');
 await shell.put('./index.html',response);
 await Promise.all(SHELL.filter(x=>x!=='./index.html').map(async path=>{
  const r=await fetch(path,{cache:'reload'});if(!r.ok)throw new Error('Offline asset cannot be installed: '+path);await shell.put(path,r);
 }));
 const gifCache=await caches.open(GIF_CACHE);
 await Promise.all(GIFS.map(async path=>{
  const response=await fetch(path,{cache:'reload'});
  if(!response.ok)throw new Error('Required exercise GIF unavailable: '+path);
  await gifCache.put(path,response);
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
 // Scripts and styles must track the latest HTML. Cached-first code could pair
 // the new program selector with an old handler that does not support "home".
 if(/\.(?:js|css|webmanifest)$/.test(url.pathname)){
  event.respondWith((async()=>{
   try{
    const response=await fetch(req,{cache:'no-store'});
    if(response.ok){
     try{const cache=await caches.open(CACHE);await cache.put(req,response.clone())}catch{}
    }
    if(response.ok)return response;
    return await caches.match(req)||await caches.match(req,{ignoreSearch:true})||response;
   }catch{
    return await caches.match(req)||await caches.match(req,{ignoreSearch:true})||Response.error();
   }
  })());return;
 }
 event.respondWith((async()=>{
  const hit=await caches.match(req);if(hit)return hit;
  const response=await fetch(req);
  if(response.ok){const cache=await caches.open(CACHE);await cache.put(req,response.clone())}
  return response;
 })());
});
const CACHE="formarota-pwa-v13";
const ASSETS=["./","./index.html","./manifest.webmanifest","./icon.svg","./icon-192.png","./icon-512.png","./apple-touch-icon.png","./cloud-config.js","./cloud-sync.js","./assets/calf.gif","./assets/dumbbell-row.gif","./assets/extension.gif","./assets/incline-fly.gif","./assets/incline.gif","./assets/lat.gif","./assets/lateral.gif","./assets/legcurl.gif","./assets/legpress.gif","./assets/overhead.gif","./assets/pec.gif","./assets/push.gif","./assets/rear.gif","./assets/row.gif","./assets/zottman.gif"];
self.addEventListener("install",event=>event.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS))));
self.addEventListener("activate",event=>event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k))))));
self.addEventListener("fetch",event=>{
 const url=new URL(event.request.url);
 if(event.request.method!=="GET" || url.origin!==location.origin)return;
 event.respondWith((url.pathname.endsWith(".html")||url.pathname.endsWith("/cloud-config.js")||url.pathname.endsWith("/cloud-sync.js")||url.pathname.endsWith("/sw.js"))?fetch(event.request).then(res=>{if(res.ok){const copy=res.clone();caches.open(CACHE).then(c=>c.put(event.request,copy))}return res}).catch(()=>caches.match(event.request)):caches.match(event.request).then(cached=>cached||fetch(event.request).then(res=>{
  if(res.ok){const copy=res.clone();caches.open(CACHE).then(c=>c.put(event.request,copy))}
  return res;
 }).catch(()=>caches.match(event.request))));
});
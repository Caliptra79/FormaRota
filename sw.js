const CACHE="formarota-solo-v18-icon";
const ASSETS=["./","./index.html","./manifest.webmanifest","./icon-192.png","./icon-512.png","./apple-touch-icon.png","./assets/calf.gif","./assets/dumbbell-row.gif","./assets/extension.gif","./assets/incline-fly.gif","./assets/incline.gif","./assets/lat.gif","./assets/lateral.gif","./assets/legcurl.gif","./assets/legpress.gif","./assets/overhead.gif","./assets/pec.gif","./assets/push.gif","./assets/rear.gif","./assets/row.gif","./assets/zottman.gif"];
self.addEventListener('install',event=>{event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(ASSETS)));self.skipWaiting()});
self.addEventListener('activate',event=>event.waitUntil(Promise.all([caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))),self.clients.claim()])));
self.addEventListener('fetch',event=>{const request=event.request;if(request.method!=='GET')return;const url=new URL(request.url);if(url.origin!==self.location.origin)return;
const navigate=request.mode==='navigate'||url.pathname.endsWith('.html');
if(navigate){event.respondWith(fetch(request).then(response=>{if(response.ok){const copy=response.clone();caches.open(CACHE).then(c=>c.put(request,copy)).catch(()=>{})}return response}).catch(()=>caches.match(request).then(hit=>hit||caches.match('./index.html'))));return}
event.respondWith(caches.match(request).then(hit=>hit||fetch(request).then(response=>{if(response.ok){const copy=response.clone();caches.open(CACHE).then(c=>c.put(request,copy)).catch(()=>{})}return response})));
});

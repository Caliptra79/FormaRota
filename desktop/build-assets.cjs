'use strict';
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const dest=path.join(__dirname,'app');
fs.rmSync(dest,{recursive:true,force:true});
fs.mkdirSync(dest,{recursive:true});
for(const filename of ['index.html','manifest.webmanifest','icon-192.png','icon-512.png','apple-touch-icon.png']){
 const src=path.join(root,filename);
 if(!fs.existsSync(src))throw Error('Missing desktop asset: '+filename);
 fs.copyFileSync(src,path.join(dest,filename));
}
fs.cpSync(path.join(root,'assets'),path.join(dest,'assets'),{recursive:true});
const index=path.join(dest,'index.html');
let html=fs.readFileSync(index,'utf8');
const sw="if('serviceWorker'in navigator&&location.protocol!=='file:')navigator.serviceWorker.register('./sw.js').catch(()=>{});";
if(!html.includes(sw))throw Error('Service worker marker changed; desktop packaging needs review');
html=html.replace(sw,'/* Desktop build: app:// origin uses its own offline bundle; do not register PWA service worker. */');
html=html.replaceAll('iPhone Dosyalar','Windows İndirilenler').replaceAll('bu telefonda saklanır','bu bilgisayarda saklanır');
fs.writeFileSync(index,html);
const bundled=fs.readdirSync(path.join(dest,'assets'));
const gifCount=bundled.filter(x=>x.endsWith('.gif')).length;
if(gifCount!==19)throw Error('Unexpected workout GIF count: '+gifCount);
console.log('Desktop bundle ready. Exercise GIFs:',gifCount);

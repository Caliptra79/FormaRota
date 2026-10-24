'use strict';
// Pure helpers kept outside Electron for automated security tests.
const path=require('node:path');
const MIME=Object.freeze({
 '.html':'text/html; charset=utf-8',
 '.css':'text/css; charset=utf-8',
 '.js':'text/javascript; charset=utf-8',
 '.mjs':'text/javascript; charset=utf-8',
 '.json':'application/json; charset=utf-8',
 '.webmanifest':'application/manifest+json; charset=utf-8',
 '.svg':'image/svg+xml',
 '.png':'image/png',
 '.gif':'image/gif',
 '.ico':'image/x-icon',
 '.woff':'font/woff',
 '.woff2':'font/woff2'
});
function resolveAsset(root,requestURL){
 let url;
 try{url=new URL(requestURL)}catch{return null}
 if(url.protocol!=='app:'||url.hostname!=='formarota'||url.port||url.username||url.password)return null;
 let pathname;
 try{pathname=decodeURIComponent(url.pathname)}catch{return null}
 if(pathname==='/'||pathname==='')pathname='/index.html';
 if(pathname.includes('\\')||pathname.includes('\0'))return null;
 if(pathname.split('/').some(p=>p==='.'||p==='..'||p.startsWith('.')))return null;
 const filePath=path.resolve(root,'.'+pathname);
 const relative=path.relative(root,filePath);
 if(!relative||relative.startsWith('..')||path.isAbsolute(relative))return null;
 const ext=path.extname(filePath).toLowerCase();
 if(!Object.hasOwn(MIME,ext))return null;
 return {filePath,contentType:MIME[ext]};
}
function externalURL(value){
 try{
  const url=new URL(value);
  if(url.protocol!=='https:')return null;
  if(url.username||url.password)return null;
  return url.toString();
 }catch{return null}
}
module.exports={resolveAsset,externalURL,MIME};

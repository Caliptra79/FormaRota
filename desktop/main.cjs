'use strict';
const path=require('node:path');
const fs=require('node:fs/promises');
const {app,BrowserWindow,Menu,protocol,session,shell}=require('electron');
const {resolveAsset,externalURL}=require('./security.cjs');

const APP_ORIGIN='app://formarota';
const APP_ENTRY=APP_ORIGIN+'/index.html#/anasayfa';
const APP_ID='com.formarota.personal';

// A fixed secure and standard origin keeps localStorage stable across restarts
// and portable/installer upgrades. It does not share data with the hosted PWA.
protocol.registerSchemesAsPrivileged([{
 scheme:'app',
 privileges:{standard:true,secure:true,supportFetchAPI:true}
}]);
app.setAppUserModelId(APP_ID);
app.setPath('userData',path.join(app.getPath('appData'),'FormaRota'));

let mainWindow=null;
const root=path.resolve(__dirname,'app');
function navigateExternally(candidate){
 const allowed=externalURL(candidate);
 if(allowed)shell.openExternal(allowed).catch(()=>{});
}
async function createWindow(){
 mainWindow=new BrowserWindow({
  width:1150,height:860,minWidth:390,minHeight:580,
  show:false,backgroundColor:'#0c141a',
  title:'FormaRota',autoHideMenuBar:true,
  icon:path.join(__dirname,'app','icon-512.png'),
  webPreferences:{
   contextIsolation:true,
   sandbox:true,
   nodeIntegration:false,
   webSecurity:true,
   webviewTag:false,
   partition:'persist:formarota'
  }
 });
 mainWindow.once('ready-to-show',()=>{if(mainWindow&&!mainWindow.isDestroyed())mainWindow.show()});
 mainWindow.webContents.setWindowOpenHandler(({url})=>{
  navigateExternally(url);
  return {action:'deny'};
 });
 mainWindow.webContents.on('will-navigate',(event,url)=>{
  if(!url.startsWith(APP_ORIGIN+'/index.html')){
   event.preventDefault();navigateExternally(url);
  }
 });
 mainWindow.on('closed',()=>{mainWindow=null});
 await mainWindow.loadURL(APP_ENTRY);
}
app.whenReady().then(async()=>{
 Menu.setApplicationMenu(null);
 const sess=session.fromPartition('persist:formarota');
 sess.setPermissionRequestHandler((_wc,_permission,done)=>done(false));
 sess.protocol.handle('app',async request=>{
  const asset=resolveAsset(root,request.url);
  if(!asset)return new Response('Not found',{status:404});
  try{
   const bytes=await fs.readFile(asset.filePath);
   return new Response(bytes,{status:200,headers:{'Content-Type':asset.contentType,'X-Content-Type-Options':'nosniff'}});
  }catch(error){
   return new Response(error.code==='ENOENT'?'Not found':'Unable to load file',{status:error.code==='ENOENT'?404:500});
  }
 });
 await createWindow();
}).catch(error=>{console.error('FormaRota Windows açılamadı:',error);app.quit()});
app.on('activate',()=>{if(BrowserWindow.getAllWindows().length===0)createWindow().catch(console.error)});
app.on('window-all-closed',()=>app.quit());

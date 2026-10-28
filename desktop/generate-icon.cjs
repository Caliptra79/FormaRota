'use strict';
const fs=require('node:fs');
const path=require('node:path');
const sharp=require('sharp');
const pngToIco=require('png-to-ico');
(async()=>{
 const root=path.resolve(__dirname,'..'),source=path.join(root,'assets','formarota-icon.svg');
 if(!fs.existsSync(source))throw Error('Approved FormaRota SVG icon is missing');
 const sizes=[16,24,32,48,64,128,256];
 const temp=fs.mkdtempSync(path.join(require('node:os').tmpdir(),'formarota-icon-'));
 try{
  const pngs=await Promise.all(sizes.map(async size=>{
   const filename=path.join(temp,'icon-'+size+'.png');
   await sharp(source).resize(size,size,{fit:'contain'}).png().toFile(filename);
   return filename;
  }));
  const ico=await pngToIco(pngs);
  fs.writeFileSync(path.join(__dirname,'formarota.ico'),ico);
 }finally{fs.rmSync(temp,{recursive:true,force:true})}
 await sharp(source).resize(512,512,{fit:'contain'}).png().toFile(path.join(__dirname,'formarota-window.png'));
 console.log('Generated Windows icon and window icon from approved FormaRota SVG.');
})().catch(err=>{console.error(err);process.exitCode=1});

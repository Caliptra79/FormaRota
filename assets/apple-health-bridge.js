/* FormaRota: offline, user-initiated Apple Health daily aggregate bridge.
 * iOS Shortcuts can read Health with permission; the PWA never reads HealthKit.
 * Imports are daily snapshots and NEVER modify walks, meal goals, or calorie math.
 */
(function(root){
 'use strict';
 const KEY='formarota-apple-health-v1',MAGIC='FORMAROTA_HEALTH_V1';
 const doc=root.document;
 const byId=id=>doc?.getElementById(id);
 const isoToday=()=>{
  const d=new Date();
  return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
 };
 function validDate(value,today=isoToday()){
  if(typeof value!=='string'||!/^20\d{2}-\d{2}-\d{2}$/.test(value)||value>today)return false;
  const [y,m,d]=value.split('-').map(Number),probe=new Date(y,m-1,d,12);
  return y===probe.getFullYear()&&m-1===probe.getMonth()&&d===probe.getDate();
 }
 function numeric(value,{integer=false,max=10000}={}){
  if(typeof value!=='number'&&typeof value!=='string')throw Error('Sayı yerine metin gönderilmiş.');
  let v=String(value).trim().replace(/\u00a0/g,' ').replace(/\s/g,'');
  if(integer&&/^\d{1,3}([.,]\d{3})+$/.test(v))v=v.replace(/[.,]/g,'');
  else if(/^\d+(?:[.,]\d+)?$/.test(v))v=v.replace(',','.');
  else throw Error('Geçersiz sayısal değer: '+String(value).slice(0,20));
  const n=Number(v);
  if(!Number.isFinite(n)||n<0||n>max||(integer&&!Number.isInteger(n)))throw Error('Değer aralık dışında.');
  return n;
 }
 function validated(input,today=isoToday()){
  if(!input||typeof input!=='object'||Array.isArray(input))throw Error('Veri biçimi tanınmadı.');
  if(!validDate(input.date,today))throw Error('Tarih geçersiz veya gelecekte.');
  const steps=numeric(input.steps,{integer:true,max:200000});
  const distanceKm=numeric(input.distanceKm,{max:250});
  const activeKcal=numeric(input.activeKcal,{max:15000});
  if(steps===0&&distanceKm===0&&activeKcal===0)throw Error('Üç değer de sıfır. Önce Sağlık verilerinin geldiğini kontrol et.');
  return Object.freeze({date:input.date,steps,distanceKm:Math.round(distanceKm*100)/100,activeKcal:Math.round(activeKcal*10)/10});
 }
 function parse(value,today=isoToday()){
  if(typeof value!=='string'||value.length>20000)throw Error('Aktarım metni çok büyük veya boş.');
  const raw=value.trim();let data;
  if(raw.startsWith('{')){
   try{data=JSON.parse(raw)}catch{throw Error('JSON metni okunamadı.')}
   if(data.format!==undefined&&data.format!==MAGIC)throw Error('Farklı aktarım biçimi.');
   return validated(data,today);
  }
  const lines=raw.split(/\r?\n/).map(x=>x.trim()).filter(Boolean);
  if(lines[0]!==MAGIC)throw Error('Bu metin FormaRota Sağlık aktarımı değil.');
  const map={};
  for(const line of lines.slice(1)){
   const equals=line.indexOf('=');
   if(equals<1)throw Error('Satır biçimi geçersiz.');
   const k=line.slice(0,equals).trim().toUpperCase(),v=line.slice(equals+1).trim();
   if(!['DATE','STEPS','DISTANCE_KM','ACTIVE_KCAL'].includes(k)||Object.hasOwn(map,k))throw Error('Bilinmeyen veya tekrarlanan alan: '+k);
   map[k]=v;
  }
  return validated({date:map.DATE,steps:map.STEPS,distanceKm:map.DISTANCE_KM,activeKcal:map.ACTIVE_KCAL},today);
 }
 function validateBackup(records,today=isoToday()){
  if(!records||typeof records!=='object'||Array.isArray(records)||Object.keys(records).length>3660)return false;
  return Object.entries(records).every(([day,value])=>{
   try{
    if(!validDate(day,today)||!value||typeof value!=='object'||value.date!==day)return false;
    validated(value,today);return true;
   }catch{return false}
  });
 }
 function read(){
  try{
   const data=JSON.parse(root.localStorage.getItem(KEY)||'{}');
   return validateBackup(data)?data:{};
  }catch{return {}}
 }
 function save(data){
  const result=validated(data),records=read(),before=records[result.date];
  records[result.date]={...result,source:'apple-shortcuts',importedAt:new Date().toISOString()};
  if(!validateBackup(records))throw Error('Sağlık kaydı doğrulanamadı.');
  try{root.localStorage.setItem(KEY,JSON.stringify(records));}
  catch{throw Error('Cihaz depolaması dolu. Eski kayıtlar değiştirilmedi.')}
  return {record:records[result.date],updated:Boolean(before)};
 }
 function format(value,digits=0){return new Intl.NumberFormat('tr-TR',{maximumFractionDigits:digits}).format(value)}
 function render(){
  const latest=byId('frHealthLatest'),box=byId('frHealthRecords');
  if(!latest&&!box)return;
  const entries=Object.values(read()).sort((a,b)=>b.date.localeCompare(a.date));
  if(latest)latest.textContent=entries.length?
   'Son kayıt: '+entries[0].date+' · '+format(entries[0].steps)+' adım · '+format(entries[0].distanceKm,2)+' km · '+format(entries[0].activeKcal,1)+' aktif kcal':
   'Henüz Apple Sağlık aktarımı yapılmadı.';
  if(box){
   box.replaceChildren();
   for(const entry of entries.slice(0,7)){
    const row=doc.createElement('div');row.className='fr-health-row';
    const date=doc.createElement('strong');date.textContent=entry.date;
    const detail=doc.createElement('span');
    detail.textContent=format(entry.steps)+' adım · '+format(entry.distanceKm,2)+' km · '+format(entry.activeKcal,1)+' aktif kcal';
    row.append(date,detail);box.append(row);
   }
  }
 }
 function message(value){
  const label=byId('frHealthStatus');if(label)label.textContent=value;
 }
 function importText(raw){
  const result=save(parse(raw));
  message((result.updated?'Günün değerleri güncellendi.':'Sağlık verileri kaydedildi.')+
   ' '+result.record.date+' · '+format(result.record.steps)+' adım · '+
   format(result.record.distanceKm,2)+' km · '+format(result.record.activeKcal,1)+' aktif kcal.');
  render();
  return result;
 }
 async function pickFile(ev){
  const file=ev.target.files?.[0];ev.target.value='';
  if(!file)return;
  if(file.size>100*1024){message('Dosya çok büyük. Yalnızca günlük özet metnini seç.');return}
  try{importText(await file.text())}catch(error){message(error.message)}
 }
 async function pasteClipboard(){
  try{
   if(!root.navigator?.clipboard?.readText)throw Error('Bu iPhone tarayıcısı doğrudan yapıştırmayı desteklemiyor.');
   const txt=await root.navigator.clipboard.readText();
   const input=byId('frHealthInput');
   if(input)input.value=txt;
   importText(txt);
  }catch(error){
   message('Otomatik yapıştırma izin vermedi. Metin kutusuna basılı tutup “Yapıştır” seç ve Kaydet düğmesine dokun.');
  }
 }
 function init(){
  const button=byId('frHealthImport');if(!button)return;
  render();
  button.addEventListener('click',()=>{
   try{importText(byId('frHealthInput')?.value||'')}catch(error){message(error.message)}
  });
  byId('frHealthPaste')?.addEventListener('click',pasteClipboard);
  byId('frHealthSelectFile')?.addEventListener('click',()=>byId('frHealthFile')?.click());
  byId('frHealthFile')?.addEventListener('change',pickFile);
  root.addEventListener('pageshow',render);
  doc.addEventListener('visibilitychange',()=>{if(doc.visibilityState==='visible')render()});
 }
 const api=Object.freeze({KEY,MAGIC,validDate,numeric,validated,parse,validateBackup,read,save,render,importText});
 if(typeof module!=='undefined'&&module.exports)module.exports=api;
 root.FormaRotaAppleHealth=api;
 if(doc){
  if(doc.readyState==='loading')doc.addEventListener('DOMContentLoaded',init,{once:true});
  else init();
 }
})(typeof window!=='undefined'?window:globalThis);

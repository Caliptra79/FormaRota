/* Koçluk v12 — Firebase Authentication + Firestore transaction-based document sync.
 * Static GitHub Pages compatible. Never uses or stores a Firebase Admin SDK private key.
 * This is opt-in. Local use works without a Firebase project or network.
 */
(() => {
'use strict';
const $ = id => document.getElementById(id);
const DATA_KEYS = [
 'kocluk-food-log-v2','kocluk-custom-foods-v1','kocluk-profile-v1','kocluk-weight-v1',
 'kocluk-goal-kcal','kocluk-goal-protein','kocluk-fitness-current-v1',
 'kocluk-fitness-weeks-v1','kocluk-fitness-config-v1','kocluk-fitness-history-v1',
 'kocluk-fitness-abs-v1','kocluk-fitness-variants-v1'
];
const KNOWN = new Set(DATA_KEYS);
const ACTIVE_KEY='kocluk-cloud-owner-v1';
const FIREBASE_KEY='kocluk-firebase-config-v1';
const ARCHIVE_KEY='kocluk-cloud-recovery-v1';
const AUTO_DELAY=2000;
let client=null, auth=null, db=null, user=null, account=null, busy=false, inRestore=false, waitingDecision=false;
let revision=null, baseHash=null, pending=false, pushTimer=null, setupTicket=0, switched=false;
let sdkReady=null;
const json=(v,f)=>{if(v==null)return f;try{const parsed=JSON.parse(v);return parsed==null?f:parsed}catch{return f}};
const scope=(projectId,id)=>`firebase:${projectId}:${id}`;
const stateKey=(id)=>'kocluk-cloud-meta-'+id;
const cacheKey=(id)=>'kocluk-cloud-cache-'+id;
const guestKey='kocluk-cloud-guest-v1';
const archiveKey=()=>ARCHIVE_KEY+'-'+account;
function archiveItems(){if(!account)return [];const a=json(localStorage.getItem(archiveKey()),[]);return Array.isArray(a)?a:[]}
function renderArchives(){const list=archiveItems(),panel=$('cloudRecoveryPanel');panel.classList.toggle('hidden',!user||!list.length);$('cloudExportRecovery').disabled=!user||!list.length;const select=$('cloudRecoveryVersion');select.replaceChildren();list.forEach((a,i)=>{const o=document.createElement('option');o.value=String(i);o.textContent=`${new Date(a.archivedAt).toLocaleString('tr-TR')} · ${a.which}`;select.append(o)})}
const defaults=()=>({version:1,values:{
 'kocluk-goal-kcal':'2600','kocluk-goal-protein':'160',
 'kocluk-profile-v1':JSON.stringify({age:25,height:196,target:96,sex:'male',activity:'1.375'}),
 'kocluk-weight-v1':JSON.stringify([])
}});
function snapshot(){const values={};for(const k of DATA_KEYS){let val=localStorage.getItem(k);if(val!==null)values[k]=val}return {version:1,values}}
function validSnapshot(s){return !!s&&s.version===1&&s.values&&typeof s.values==='object'&&!Array.isArray(s.values)&&Object.keys(s.values).every(k=>KNOWN.has(k)&&typeof s.values[k]==='string')}
// Stable lightweight change marker; not used as a security primitive.
function digest(s){const text=JSON.stringify(s),length=text.length;let a=2166136261;for(let i=0;i<length;i++){a^=text.charCodeAt(i);a=Math.imul(a,16777619)}return `${(a>>>0).toString(16)}:${length}`}
function saveAccountCache(){if(account){try{localStorage.setItem(cacheKey(account),JSON.stringify(snapshot()))}catch(e){status('Bu cihazın depolama alanına erişilemiyor; JSON yedeği al.',true)}}}
function archive(which,doc){if(!account||!validSnapshot(doc))return;try{const arr=archiveItems();arr.unshift({scope:account,which,archivedAt:new Date().toISOString(),snapshot:doc});localStorage.setItem(archiveKey(),JSON.stringify(arr.slice(0,6)));renderArchives()}catch(e){status('Kurtarma arşivi kaydedilemedi; önce JSON yedeği indir.',true)}}
function applySnapshot(doc){if(!validSnapshot(doc))throw Error('Buluttan gelen veri biçimi desteklenmiyor.');inRestore=true;try{for(const k of DATA_KEYS){localStorage.removeItem(k);if(Object.prototype.hasOwnProperty.call(doc.values,k))localStorage.setItem(k,doc.values[k])}refreshScreen()}finally{inRestore=false}saveAccountCache()}
function refreshScreen(){
 try{
  $('goalKcal').value=localStorage.getItem('kocluk-goal-kcal')||'2600';
  $('goalProtein').value=localStorage.getItem('kocluk-goal-protein')||'160';
  const p=getProfile();for(const [k,id] of [['age','profileAge'],['height','profileHeight'],['target','profileTarget'],['sex','profileSex'],['activity','profileActivity']])$(id).value=p[k]??'';
  fitCurrent=read(FIT_KEY,null);
  if(fitCurrent?.status==='running'){
    // Active timer remains in progress on the original device. Resume manually on this device.
    fitCurrent={...fitCurrent,status:'paused',elapsedMs:fitMsec(),runningSince:null,
     phase:fitCurrent.phase?{...fitCurrent.phase,elapsedMs:(fitCurrent.phase.elapsedMs||0)+(fitCurrent.phase.runningSince?Math.max(0,Date.now()-fitCurrent.phase.runningSince):0),runningSince:null}:null};
    localStorage.setItem(FIT_KEY,JSON.stringify(fitCurrent));
  }
  const f=fitConf();$('fitFrequency').value=f.frequency;$('fitDuration').value=f.durationMin;$('fitWorkSec').value=f.workSeconds;$('fitRestSec').value=f.restSeconds;
  renderTotals();renderProfile();renderTrend();renderCustomFoods();renderRecipeOptions();renderRecipe();fitDrawWeek();fitDrawExercises();fitDrawHistory();fitSyncClock();
 }catch(e){console.error('Cloud screen refresh',e);status('Veriler aktarıldı ancak ekran yenilenirken sorun oluştu. Sayfayı yeniden yükle.',true)}
}
function meaningful(s){const v=s?.values||{};for(const k of ['kocluk-food-log-v2','kocluk-custom-foods-v1','kocluk-fitness-history-v1'])if((json(v[k],[])||[]).length)return true;
 if(Object.keys(json(v['kocluk-fitness-weeks-v1'],{})||{}).length)return true;
 if(v['kocluk-fitness-current-v1'])return true;
 if(Object.keys(json(v['kocluk-fitness-abs-v1'],{})||{}).length)return true;
 if(Object.keys(json(v['kocluk-fitness-variants-v1'],{})||{}).length)return true;
 const f=json(v['kocluk-fitness-config-v1'],{});if(f&&Object.keys(f).length)return true;
 if(v['kocluk-goal-kcal']&&v['kocluk-goal-kcal']!=='2600')return true;
 if(v['kocluk-goal-protein']&&v['kocluk-goal-protein']!=='160')return true;
 const profile=json(v['kocluk-profile-v1'],null);if(profile&&(profile.age!==25||profile.height!==196||profile.target!==96||profile.sex!=='male'||profile.activity!=='1.375'))return true;
 const w=json(v['kocluk-weight-v1'],[]);if(Array.isArray(w)&&(w.length>1||w.some(x=>Number(x.kg)!==110)))return true;
 return false;
}
function state(s,message,problem=false){$('cloudBadge').textContent=s;$('cloudStatus').textContent=message;$('cloudStatus').classList.toggle('cloud-danger',problem);$('cloudStatus').classList.toggle('cloud-good',!problem&&!!user&&!waitingDecision)}
function status(message,problem=false){state(user?'Hesap açık':'Yalnızca bu cihaz',message,problem)}
function showConflict(remote,description){waitingDecision=true;remoteConflict=remote;$('cloudConflict').classList.remove('hidden');$('cloudConflictText').textContent=description||'Bu cihazdaki ve buluttaki kayıtlar farklı. Birini seçmeden otomatik eşitleme yapılmaz.';state('Seçim gerekli','Veriler farklı: Buluttan indir veya bu cihazı buluta gönder.',true)}
function hideConflict(){waitingDecision=false;remoteConflict=null;$('cloudConflict').classList.add('hidden')}
let remoteConflict=null;
function setMeta(rev,s){revision=rev;baseHash=digest(s);pending=false;try{localStorage.setItem(stateKey(account),JSON.stringify({revision:rev,hash:baseHash}))}catch(e){}saveAccountCache()}
function getMeta(){const raw=json(localStorage.getItem(stateKey(account)),null);return raw&&Number.isInteger(raw.revision)&&raw.revision>=0?raw:null}
function markDirty(k){if(!KNOWN.has(k)||inRestore)return;saveAccountCache();if(!user||!db||waitingDecision)return;pending=true;status(!navigator.onLine?'İnternet yok: değişiklikler cihazda saklandı.':'Yeni değişiklikler eşitlemeyi bekliyor.');schedule()}
function schedule(delay=AUTO_DELAY){clearTimeout(pushTimer);pushTimer=setTimeout(()=>syncNow(false).catch(e=>status('Eşitleme hatası: '+friendly(e),true)),delay)}
function friendly(e){return String(e?.message||e||'Bilinmeyen hata').slice(0,240)}
function safeCred(cfg){
 if(!cfg||typeof cfg!=='object')throw Error('Firebase yapılandırmasını JSON olarak gir.');
 const keys=['apiKey','authDomain','projectId','appId'];
 for(const k of keys)if(typeof cfg[k]!=='string'||!cfg[k].trim())throw Error('Firebase ayarında '+k+' eksik.');
 if(!/^[a-z0-9-]+$/i.test(cfg.projectId))throw Error('Geçersiz Project ID.');
 if(!/^[-a-z0-9.]+\.firebaseapp\.com$/i.test(cfg.authDomain)&&!/^[-a-z0-9.]+\.web\.app$/i.test(cfg.authDomain))throw Error('authDomain Firebase tarafından sağlanan alan adı olmalı.');
 const secretFields=['private_key','privateKey','client_email','clientEmail'];
 if(secretFields.some(k=>Object.prototype.hasOwnProperty.call(cfg,k)))throw Error('Servis hesabı / özel anahtar bilgisi yapıştırma.');
 return Object.fromEntries(Object.entries(cfg).filter(([k,v])=>typeof v==='string'&&['apiKey','authDomain','projectId','appId','messagingSenderId','storageBucket','measurementId','databaseURL'].includes(k)));
}
function config(){const external=window.COACH_FIREBASE||{};return Object.keys(json(localStorage.getItem(FIREBASE_KEY),{})||{}).length?json(localStorage.getItem(FIREBASE_KEY),{}):external}
function showConfig(){const cfg=config();$('cloudFirebaseConfig').value=Object.keys(cfg).length?JSON.stringify(cfg,null,2):'';$('cloudSetup').classList.remove('hidden');$('cloudAuth').classList.toggle('hidden',!auth||!!user);$('cloudSignedIn').classList.toggle('hidden',!user);$('cloudIdentity').textContent=user?`✓ ${user.email||'Oturum açık'}`:'';renderArchives()}
function loadScript(url){return new Promise((resolve,reject)=>{const t=document.createElement('script');t.src=url;t.onload=resolve;t.onerror=()=>reject(Error('Firebase SDK indirilemedi; internet bağlantını kontrol et.'));document.head.append(t)})}
async function sdk(){if(window.firebase?.firestore&&window.firebase?.auth)return window.firebase;if(sdkReady)return sdkReady;
 sdkReady=(async()=>{const prefix='https://www.gstatic.com/firebasejs/11.10.0/';await loadScript(prefix+'firebase-app-compat.js');await loadScript(prefix+'firebase-auth-compat.js');await loadScript(prefix+'firebase-firestore-compat.js');return window.firebase})().catch(e=>{sdkReady=null;throw e});return sdkReady}
function changeOwner(newId){const old=localStorage.getItem(ACTIVE_KEY);if(old===newId)return;
 if(old){try{localStorage.setItem(cacheKey(old),JSON.stringify(snapshot()))}catch(e){}}
 else if(meaningful(snapshot())){try{localStorage.setItem(guestKey,JSON.stringify(snapshot()))}catch(e){}}
 const cached=json(localStorage.getItem(cacheKey(newId)),null);
 if(validSnapshot(cached))applySnapshot(cached);
 else if(old){applySnapshot(defaults())} // Never expose one authenticated account's records in another account.
 localStorage.setItem(ACTIVE_KEY,newId);
}
function exitOwner(){const old=localStorage.getItem(ACTIVE_KEY);if(old){try{localStorage.setItem(cacheKey(old),JSON.stringify(snapshot()))}catch(e){}}
 localStorage.removeItem(ACTIVE_KEY);account=null;const guest=json(localStorage.getItem(guestKey),null);applySnapshot(validSnapshot(guest)?guest:defaults());revision=null;baseHash=null;pending=false;hideConflict();
}
function docRef(){if(!user||!db)throw Error('Önce hesabına giriş yap.');return db.collection('coaching_snapshots').doc(user.uid)}
async function readCloud(){const snap=await docRef().get({source:'server'});if(!snap.exists)return {revision:0,payload:null};const data=snap.data();if(!validSnapshot(data.payload))throw Error('Bulutta desteklenmeyen veri biçimi.');return {revision:Number(data.revision),payload:data.payload}}
async function postWithExpected(expected,doc){const ref=docRef();return db.runTransaction(async tx=>{const snap=await tx.get(ref);const actual=snap.exists?Number(snap.data().revision):0;if(actual!==expected)return {sync_status:'conflict',remote_revision:actual,remote_payload:snap.exists?snap.data().payload:null};tx.set(ref,{revision:actual+1,payload:doc,updatedAt:window.firebase.firestore.FieldValue.serverTimestamp()});return {sync_status:'saved',remote_revision:actual+1}})}
async function push(expected){if(!user||!db||!account)return;if(busy)return;busy=true;const accountAtStart=account;
 try{const doc=snapshot(),hash=digest(doc);state('Eşitleniyor','Değişiklikler Firebase’e gönderiliyor…');const row=await postWithExpected(expected,doc);if(account!==accountAtStart||!user)return;
 if(row.sync_status==='saved'){setMeta(row.remote_revision,doc);hideConflict();if(digest(snapshot())!==hash){pending=true;schedule(500)}else status('✓ Bulut güncel · '+new Date().toLocaleTimeString('tr-TR'))}
 else showConflict({revision:row.remote_revision,payload:row.remote_payload},'Başka cihaz yeni kayıt göndermiş. Sürümler çakışıyor; korunacak sürümü seç.');
 }catch(e){status('Firebase’e yüklenemedi; yerel veriler korundu. '+friendly(e),true)}finally{busy=false}}
async function syncNow(manual=false){if(!db||!user)return;if(busy||waitingDecision)return;
 const accountAtStart=account;
 try{
  if(!navigator.onLine){status('Çevrimdışı: kayıtların bu cihazda. İnternet gelince tekrar denenecek.',true);return}
  if(manual)state('Kontrol ediliyor','Buluttaki sürüm kontrol ediliyor…');
  const remote=await readCloud();if(accountAtStart!==account||!user)return;
  const mine=snapshot(),myHash=digest(mine),meta=getMeta();
  if(!remote.payload){
   if(meta&&meta.revision>0){showConflict(remote,'Daha önce eşitlenen bulut kaydı artık bulunamıyor. Buluta yeniden yazmak için açıkça seçim yap.');return}
   await push(0);return;
  }
  if(!meta){
   if(meaningful(mine)){showConflict(remote,'Bu cihazda mevcut beslenme/fitness kayıtların var, bulutta da veri var. İlk eşitlemede hangi sürümü kullanacağını seç.');return}
   applySnapshot(remote.payload);setMeta(remote.revision,snapshot());status('✓ Bulut kayıtları bu cihaza indirildi.');return;
  }
  if(remote.revision===meta.revision){
   if(myHash!==meta.hash||pending){await push(meta.revision)}else{revision=meta.revision;baseHash=meta.hash;status('✓ İki cihazda eşitlenmeye hazır; bulut güncel.')}
   return;
  }
  if(myHash!==meta.hash||pending){showConflict(remote,'Hem bu cihazda hem bulutta değişiklik var. Veri kaybını önlemek için eşitleme durduruldu.');return}
  if(fitCurrent?.status==='running'){status('Yeni bulut sürümü var. Devam eden antrenman bitince “Şimdi eşitle”ye bas.',true);return}
  applySnapshot(remote.payload);setMeta(remote.revision,snapshot());status('✓ Diğer cihazdan gelen kayıtlar güncellendi.');
 }catch(e){status('Bulutla bağlantı kurulamadı; veriler yerel tutuluyor. '+friendly(e),true)}
}
async function resolveConflict(useCloud){if(!user||!waitingDecision)return;const was=remoteConflict;
 if(!confirm(useCloud?'Buluttaki sürüm alınacak. Bu cihazdaki farklı kayıtlar kurtarma arşivine saklanacak. Devam edilsin mi?':'Bu cihazın sürümü buluta yazılacak. Önceki bulut sürümü kurtarma arşivine saklanacak. Devam edilsin mi?'))return;
 const current=snapshot();
 try{
  const freshest=await readCloud();if(!user)return;
  if(useCloud){if(!freshest.payload){status('Bulutta indirilecek kayıt yok; bu cihazın verisini yüklemeyi seçebilirsin.',true);return}
   archive('buluta geçmeden önceki yerel kayıt',current);applySnapshot(freshest.payload);setMeta(freshest.revision,snapshot());hideConflict();status('✓ Buluttaki kayıtlar indirildi; önceki yerel sürüm kurtarma arşivinde.');
  }else{
   if(freshest.payload)archive('üzerine yazılmadan önceki bulut kaydı',freshest.payload);
   hideConflict();await push(freshest.revision);
  }
 }catch(e){showConflict(was,'Seçim tamamlanamadı: '+friendly(e))}
}
async function onLoggedIn(authUser){const id=scope(config().projectId,authUser.uid);if(user?.uid===authUser.uid&&account===id)return;
 const ticket=++setupTicket;user=authUser;account=id;hideConflict();showConfig();
 changeOwner(id); // Do not fetch or mix another account's local dataset before switching.
 state('Bağlanıyor','Oturum açıldı; kayıt sürümleri kontrol ediliyor…');
 await syncNow(true);if(ticket!==setupTicket)return;
 showConfig();
}
async function initializeClient(){const cfg=config();if(!Object.keys(cfg).length){state('Yalnızca bu cihaz','Firebase bağlantısı henüz kurulmadı; yerel kullanım devam ediyor.');showConfig();return}
 try{safeCred(cfg);state('Bağlanıyor','Firebase kütüphanesi yükleniyor…');const lib=await sdk();client=lib.apps.length?lib.app():lib.initializeApp(cfg);auth=client.auth();db=client.firestore();
  auth.onAuthStateChanged(current=>{if(!current){const had=!!user;user=null;++setupTicket;if(had)exitOwner();showConfig();status('Çıkış yapıldı; hesaba ait kayıtlar bu görünümden ayrıldı.');return}
   setTimeout(()=>onLoggedIn(current).catch(e=>status('Giriş sonrası eşitleme hatası: '+friendly(e),true)),0)});
  showConfig();status('Firebase hazır; hesabına giriş yapabilirsin.');
 }catch(e){auth=null;db=null;client=null;showConfig();status('Firebase bağlantısı başlatılamadı: '+friendly(e),true)}}
function bindButtons(){
 $('cloudSaveConfig').onclick=()=>{try{const c=safeCred(JSON.parse($('cloudFirebaseConfig').value));localStorage.setItem(FIREBASE_KEY,JSON.stringify(c));location.reload()}catch(e){status('Yapılandırma hatası: '+friendly(e),true)}};
 $('cloudClearConfig').onclick=async()=>{if(!confirm('Firebase bağlantısı kaldırılacak. Hesaba özel cihaz önbelleği korunacak. Devam?'))return;try{if(auth)await auth.signOut()}catch{}if(localStorage.getItem(ACTIVE_KEY))exitOwner();localStorage.removeItem(FIREBASE_KEY);location.reload()};
 $('cloudSignup').onclick=async()=>{if(!auth)return;const email=$('cloudEmail').value.trim(),password=$('cloudPassword').value;if(password.length<8)return status('Şifre en az 8 karakter olmalı.',true);try{const result=await auth.createUserWithEmailAndPassword(email,password);await result.user.sendEmailVerification({url:location.origin+location.pathname}).catch(()=>{});$('cloudPassword').value='';status('Hesabın açıldı. Doğrulama e-postası gönderilebildiyse gelen kutunu kontrol et.')}catch(e){status('Kayıt başarısız: '+friendly(e),true)}};
 $('cloudLogin').onclick=async()=>{if(!auth)return;try{await auth.signInWithEmailAndPassword($('cloudEmail').value.trim(),$('cloudPassword').value);$('cloudPassword').value='';status('Giriş yapıldı; kayıtlar karşılaştırılıyor…')}catch(e){status('Giriş başarısız: '+friendly(e),true)}};
 $('cloudReset').onclick=async()=>{if(!auth)return;const email=$('cloudEmail').value.trim();if(!email)return status('Önce e-postanı gir.',true);try{await auth.sendPasswordResetEmail(email,{url:location.origin+location.pathname});status('Şifre yenileme bağlantısı gönderilebildiyse e-postanı kontrol et.')}catch(e){status('Şifre sıfırlama hatası: '+friendly(e),true)}};
 $('cloudUpdatePassword').onclick=async()=>{const p=$('cloudRecoveryPassword').value;if(p.length<8)return status('Şifre en az 8 karakter olmalı.',true);try{await auth.currentUser.updatePassword(p);$('cloudRecoveryPassword').value='';$('cloudNewPassword').classList.add('hidden');status('Şifre güncellendi.')}catch(e){status('Şifre güncellenemedi (yeniden giriş gerekebilir): '+friendly(e),true)}};
 $('cloudSignout').onclick=async()=>{if(!auth)return;if((pending||waitingDecision)&&!confirm('Eşitlenmemiş değişiklikler cihazda korunacak. Çıkış yapılsın mı?'))return;try{await auth.signOut()}catch(e){status('Çıkış hatası: '+friendly(e),true)}};
 $('cloudSyncNow').onclick=()=>syncNow(true);$('cloudUseCloud').onclick=()=>resolveConflict(true);$('cloudUseLocal').onclick=()=>resolveConflict(false);$('cloudExport').onclick=()=>$('exportBtn').click();
 $('cloudExportRecovery').onclick=()=>{const a=archiveItems();if(a.length)download('kocluk-kurtarma-arsivi.json',a)};
 $('cloudRestoreVersion').onclick=()=>{if(!user)return;const item=archiveItems()[Number($('cloudRecoveryVersion').value)];if(!item||!validSnapshot(item.snapshot))return status('Geçerli sürüm seç.',true);if(!confirm('Seçili kurtarma sürümünü geri getir? Mevcut sürüm ayrıca arşivlenecek.'))return;archive('geri yükleme öncesi yerel',snapshot());applySnapshot(item.snapshot);pending=true;hideConflict();schedule(300)};
 for(const id of ['goalKcal','goalProtein'])$(id).addEventListener('change',()=>markDirty('kocluk-goal-'+(id==='goalKcal'?'kcal':'protein')));
 window.addEventListener('online',()=>{if(user)schedule(650);else if(!auth&&Object.keys(config()).length)initializeClient()});
 window.addEventListener('focus',()=>{if(user&&!busy&&!waitingDecision)syncNow().catch(()=>{})});
 document.addEventListener('visibilitychange',()=>{if(!document.hidden&&user&&!busy&&!waitingDecision)syncNow().catch(()=>{})});
 window.addEventListener('beforeunload',saveAccountCache);
 window.addEventListener('storage',e=>{if(KNOWN.has(e.key)&&user&&!inRestore){pending=true;schedule(900)}});
 setInterval(()=>{if(user&&!busy&&!waitingDecision&&navigator.onLine&&!document.hidden)syncNow(false).catch(()=>{})},45000);
}
function download(filename,value){const blob=new Blob([JSON.stringify(value,null,2)],{type:'application/json'}),url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=filename;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000)}
window.CoachCloud={markDirty, syncNow, snapshot, validSnapshot, digest, applySnapshot, config, getStatus:()=>({account,revision,pending,waitingDecision,user:user?.email||null})};
bindButtons();showConfig();initializeClient();
})();

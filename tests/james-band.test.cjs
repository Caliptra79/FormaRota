'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const read=p=>fs.readFileSync(path.join(__dirname,'..',p),'utf8');
const E=require('../assets/james-band-engine.js');
const html=read('index.html'),sw=read('sw.js');
const DATE='2026-11-07';
function filled(s,reps=12,form='good',rir=3){
 for(const m of E.movesOf(s)){
  s.items[m.id]=Array.from({length:s.targetSets},()=>({done:true,reps,band:m.band,grip:'normal',rir,form}));
 }
 s.status='finished';s.endedAt=new Date().toISOString();
 return s;
}
test('James Grage library has named A/B training and a source for every technique',()=>{
 assert.equal(E.MOVES.length,13);
 assert.equal(E.PLANS.A.length,8);assert.equal(E.PLANS.B.length,8);
 assert.ok(E.MOVES.every(m=>m.id&&m.tr&&m.tip&&m.mistake&&m.source.startsWith('https://')&&m.low<m.high));
 assert.deepEqual(E.BAND_LEVELS,['none','10','20','30','40']);
 assert.ok(E.MOVES.some(m=>m.id==='pallof'));
 assert.ok(E.MOVES.every(m=>E.GUIDANCE[m.id]&&E.GUIDANCE[m.id].seconds>=30&&E.GUIDANCE[m.id].rest>=45));
 const initial=E.create(DATE,[]),durationA=E.estimateSession(initial);
 assert.ok(durationA.minutes>=25&&durationA.minutes<=50);
 assert.ok(E.estimateSession({...initial,variant:'B'}).minutes>durationA.minutes);
 assert.ok(E.MOVES.some(m=>m.id==='bent-row'));
 assert.equal(E.MOVES.find(m=>m.id==='band-squat').tr,'Bantla Overhead Squat');
});
test('separate A/B sessions progress on completed performances, not elapsed months',()=>{
 const h=[];let s=E.create(DATE,h);
 assert.equal(s.variant,'A');assert.equal(s.targetSets,2);assert.equal(s.stage,1);
 s.items['band-squat'][0]={done:true,reps:11,band:'10',grip:'normal',rir:2,form:'good'};
 assert.equal(E.count(s),1);assert.equal(E.complete(s),false);
 s.status='finished';assert.equal(E.finished(s),false,'incomplete session never counts as finished');
 s.status='stopped';h.push(s);
 assert.equal(E.create(DATE,h).variant,'A','partial sessions do not advance program');
 h.pop();
 for(let i=0;i<4;i++){
  const next=E.create(DATE,h);
  assert.equal(next.variant,i%2===0?'A':'B');
  h.push(filled(next));
 }
 assert.equal(E.stage(h),2);
 const next=E.create(DATE,h);
 assert.equal(next.targetSets,3);
 assert.equal(next.variant,'A');
 for(let i=0;i<8;i++)h.push(filled(E.create(DATE,h)));
 assert.equal(E.stage(h),3,'third phase depends on clean set history');
});
test('conservative repetition and band progression uses good technique and reported RIR',()=>{
 const first=filled(E.create(DATE,[]),8,'good',2);
 let r=E.recommend('band-squat',[first]);
 assert.equal(r.aim,9);
 assert.equal(r.band,'10');assert.equal(r.canTryBand,null);
 const b=filled(E.create(DATE,[first]),12,'good',4);
 const a=filled(E.create(DATE,[first,b]),12,'good',4);
 const b2=filled(E.create(DATE,[first,b,a]),12,'good',4);
 const a2=filled(E.create(DATE,[first,b,a,b2]),12,'good',4);
 r=E.recommend('band-squat',[first,b,a,b2,a2]);
 assert.equal(r.band,'10','a high performance must not silently change resistance');
 assert.equal(r.canTryBand,'20');
 const crunchHistory=[filled(E.create(DATE,[]),15,'good',4),filled(E.create(DATE,[]),15,'good',4)];
 assert.equal(E.recommend('band-crunch',crunchHistory).canTryBand,null,'bantsız crunch için bant önerilmez');
 assert.match(r.advice,/deneme setinde/);
 a2.items['band-squat'][0].form='poor';
 r=E.recommend('band-squat',[first,b,a,b2,a2]);
 assert.equal(r.canTryBand,null);
 assert.match(r.advice,/Form veya efor/);
});
test('set integrity, backup validation and independent storage keys',()=>{
 const s=filled(E.create(DATE,[]));
 assert.equal(E.finished(s),true);
 assert.equal(E.validateBackup({history:[s],current:null}),true);
 s.items['band-squat'][0].rir=8;assert.equal(E.finished(s),false);
 assert.equal(E.validateBackup({history:[s]}),false);
 const bad=E.create(DATE,[]);
 bad.items['band-squat'][0]={done:true,reps:0,band:'40',grip:'normal',rir:1,form:'good'};
 assert.equal(E.validateBackup({current:bad,history:[]}),false);
 assert.equal(E.validateBackup({history:[]}),true);
 assert.equal(E.validateBackup({history:'invalid'}),false);
 assert.equal(E.validateBackup({history:[{...bad,program:'home-calisthenics-v1'}]}),false);
 assert.ok(html.includes('formarota-james-band-current-v1'));
 assert.ok(html.includes('formarota-james-band-history-v1'));
 assert.ok(html.includes('bandWorkouts:{current:read('));
 assert.ok(html.includes('data.fitness?.bandWorkouts&&!window.FormaRotaBandEngine?.validateBackup?'));
});
test('fourth program is in fitness, weekly planner and home today choices',()=>{
 for(const item of ['data-workout-choice="band"','id="jamesBandPanel"','id="jamesBandMoves"','id="jamesBandHistory"','<option value="band">'])
  assert.ok(html.includes(item),item);
 assert.ok(html.includes("{value:'band',label:'James Grage · Direnç Bandı'"));
 assert.ok(read('assets/oled-home.js').includes("selected.type==='band'"));
 assert.ok(read('assets/abs-workouts.js').includes("['fullbody','abs','home','band']"));
 assert.ok(read('assets/coach-engine-v35.js').includes("'home','band'"));
 assert.ok(read('assets/coach-ui-v33.js').includes("band:'James Grage · Direnç Bandı'"));
});
test('offline shell loads scripts and optionally caches 12 supplied band pictures',()=>{
 for(const asset of ['james-band-engine.js','james-band.js','james-band.css']){
  assert.ok(html.includes('./assets/'+asset+'?fr=119'),asset);
  assert.ok(sw.includes("'./assets/"+asset+"'"),asset);
  assert.ok(sw.includes("'./assets/"+asset+"?fr=119'"),asset);
  if(asset.endsWith('.js'))assert.doesNotThrow(()=>new vm.Script(read('assets/'+asset)));
 }
 assert.match(sw,/formarota-solo-v119-shell/);
 assert.ok(read('assets/james-band.js').includes("assets/band-gifs/"));
 assert.ok(read('assets/james-band.js').includes("id+'.webp'"));
 assert.ok(read('assets/james-band.js').includes('E.estimateSession(preview)'));
 assert.ok(read('assets/james-band.js').includes('Bant ve sabitleme: '));
 assert.ok(read('assets/james-band.js').includes("CACHE_BAND_IMAGES"));
 assert.ok(sw.includes("const BAND_IMAGES="));
 assert.equal((sw.match(/'band-squat'/g)||[]).length,1);
 assert.ok(sw.includes("if(response.ok)await gifCache.put(path,response)"));
});


test('James band images do not stall behind hidden lazy-loading and report real failures only',()=>{
 const js=read('assets/james-band.js');
 assert.ok(js.includes("image.loading='eager'"),'image requests start without waiting for visible lazy images');
 assert.ok(!js.includes("image.loading='lazy'"),'no lazy-loaded hidden image');
 assert.ok(!js.includes("image.hidden=true;\n  const enlarge"),'image not hidden before fetch');
 assert.ok(js.includes("image.style.opacity='0'"));
 assert.ok(js.includes("image.addEventListener('load'"));
 assert.ok(js.includes("image.addEventListener('error'"));
 assert.ok(js.indexOf("Hareket görseli yükleniyor")<js.indexOf("image.addEventListener('error'"));
 assert.ok(js.includes("placeholder.textContent='Hareket görseli yüklenemedi"));
 assert.ok(sw.includes("const BAND_IMAGES="));
});

test('Band Studio has an accessible progress hero, visible set tracking and responsive workout cards',()=>{
 const js=read('assets/james-band.js'),css=read('assets/james-band.css');
 for(const id of ['jamesBandMeter','jamesBandMeterValue','jamesBandHeroPlan','jamesBandHeroSets','jamesBandHeroTime','jamesBandMoves','jamesBandStart','jamesBandFinish'])
  assert.ok(html.includes('id="'+id+'"'),id);
 assert.ok(html.includes('role="progressbar"'));
 for(const klass of ['james-band-card-layout','james-band-media','james-band-move-kicker','james-band-dots','james-band-set-fields','james-band-technique','james-band-coach-card'])
  assert.ok(js.includes(klass),klass);
 assert.ok(js.includes("E.validSet(m,x)"),'progress counts only valid saved sets');
 assert.ok(js.includes("if(s){"),'set entries appear only once a session exists');
 assert.ok(js.includes("saveSet(id,i,{"),'all set actions remain wired to the same persistence function');
 assert.ok(js.includes("meter.setAttribute('aria-valuenow'"),'meter reflects stored records');
 assert.ok(css.includes('@media(max-width:430px)')&&css.includes('@media(max-width:720px)'));
 assert.ok(css.includes('#jamesBandPanel .james-band-image'), 'images remain aspect-ratio preserved');
 assert.ok(html.includes('Bant güvenliği ve program kaynakları'), 'full safety notes remain accessible');
 assert.ok(css.includes('-webkit-text-fill-color:#fff!important'), 'dark hero stays legible in light and OLED themes');
});

test('exercise-specific calibration learns without unsafe automatic band jumps',()=>{
 const m=E.MOVES.find(x=>x.id==='bent-row');
 const fresh=E.calibration(m.id,[]);
 assert.equal(fresh.phase,'trial');assert.equal(fresh.band,'10');
 assert.equal(E.calibration('band-crunch',[]).phase,'none');
 const a=filled(E.create(DATE,[]),10,'good',2);
 const b=filled(E.create(DATE,[]),10,'good',3);
 assert.equal(E.calibration('band-squat',[a]).ready,false);
 const learned=E.calibration('band-squat',[a,b]);
 assert.equal(learned.ready,true);
 assert.equal(learned.band,'10');assert.equal(learned.grip,'normal');
 const hard=filled(E.create(DATE,[]),7,'poor',0);
 for(const x of hard.items['band-squat']){x.band='20';x.grip='short';}
 assert.equal(E.calibration('band-squat',[hard]).band,'10');
 assert.equal(E.calibration('band-squat',[hard]).grip,'relaxed');
 const easy=filled(E.create(DATE,[]),12,'good',5);
 const c=E.calibration('band-squat',[easy]);
 assert.equal(c.band,'10','easy single trial must not automatically advance to 20 kg');
 assert.match(c.advice,/20 kg/);
 const stopped=E.create(DATE,[]);stopped.status='stopped';stopped.items['band-squat'][0]={done:true,reps:10,band:'10',grip:'normal',rir:2,form:'good'};
 const partial=E.calibration('band-squat',[stopped]);
 assert.equal(partial.trials,1);assert.equal(partial.ready,false);
 assert.equal(E.calibration('missing',[]),null);
});
test('band rest notification uses local timer, accessible mute, no changes to gym timers',()=>{
 const js=read('assets/james-band.js'),css=read('assets/james-band.css');
 for(const id of ['jamesBandRestRemaining','jamesBandRestStatus','jamesBandSoundToggle','jamesBandRestSkip'])
  assert.ok(html.includes('id="'+id+'"'),id);
 for(const part of ['E.calibration(id,h)','cal.advice','earlier?.band||cal.band',
 'beginRest(E.GUIDANCE[id]?.rest||75','soundEnabled=!soundEnabled','root.AudioContext||root.webkitAudioContext',
 "root.setInterval?.(updateRest,500)","if(!wasSaved)","stopRest('Antrenman kaydedildi.')" ])
  assert.ok(js.includes(part),part);
 assert.ok(js.includes("doc.visibilityState==='hidden'"));
 assert.ok(js.includes("meter.setAttribute('aria-valuenow'"));
 assert.ok(css.includes('.james-band-rest-bar')&&css.includes('.james-band-calibration-badge'));
});

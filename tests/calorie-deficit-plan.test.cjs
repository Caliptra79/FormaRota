'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const source=p=>fs.readFileSync(path.join(__dirname,'..',p),'utf8');
const html=source('index.html'),sw=source('sw.js'),css=source('assets/calorie-deficit.css');
function engine(){const window={};vm.runInNewContext(source('assets/calorie-deficit.js'),{window});return window.FormaRotaCaloriePlan}
const api=engine(),profile={age:25,height:196,target:96,sex:'male',activity:'1.375'};
test('25y 196cm 110kg male: RMR 2205, day baseline 2646, net 5km about 323',()=>{
 const p=api.estimate(profile,110,api.DEFAULTS);
 assert.equal(p.bmr,2205);
 assert.equal(p.baseline,2646);
 assert.equal(p.walk,323);
 assert.equal(p.maintenance,2969);
 assert.equal(p.suggestedGoal,2450);
 assert.equal(p.deficit,500);
 assert.ok(p.estimatedDeficit>=450&&p.estimatedDeficit<=550);
});
test('day movement included in baseline, not automatically double counted as +500',()=>{
 const normal=api.estimate(profile,110,{walkKm:5,deficit:500,extraDayKcal:0});
 const verified=api.estimate(profile,110,{walkKm:5,deficit:500,extraDayKcal:500});
 assert.equal(normal.maintenance,2969);
 assert.equal(verified.maintenance,normal.maintenance+500);
 assert.equal(verified.suggestedGoal,normal.suggestedGoal+500);
 assert.equal(api.normalizeConfig({}).extraDayKcal,0);
});
test('walking calories are net above resting and depend on distance and body weight',()=>{
 assert.equal(api.netWalkingKcal(110,0),0);
 assert.equal(api.netWalkingKcal(110,5),323);
 assert.ok(api.netWalkingKcal(110,7)>api.netWalkingKcal(110,5));
 assert.ok(api.netWalkingKcal(96,5)<api.netWalkingKcal(110,5));
 assert.equal(api.netWalkingKcal(110,-2),null);
 assert.equal(api.netWalkingKcal(110,101),null);
});
test('changing planned walking or deficit sets a stable meal target, no earned-food bonus',()=>{
 const noWalk=api.estimate(profile,110,{walkKm:0,deficit:500,extraDayKcal:0});
 const withWalk=api.estimate(profile,110,{walkKm:5,deficit:500,extraDayKcal:0});
 assert.equal(noWalk.suggestedGoal,2150);
 assert.equal(withWalk.suggestedGoal,2450);
 const lighter=api.estimate(profile,110,{walkKm:5,deficit:300,extraDayKcal:0});
 assert.equal(lighter.suggestedGoal,2650);
 assert.ok(source('assets/calorie-deficit.js').includes('const baseline=Math.round(bmr*1.2)'));
 assert.ok(!source('assets/calorie-deficit.js').includes('getItem'));
});
test('invalid plans and incomplete profiles never generate unsafe numeric suggestions',()=>{
 for(const malformed of [null,{},[],{walkKm:-99,deficit:9000,extraDayKcal:9999}]){
  const r=api.normalizeConfig(malformed);
  assert.ok(r.walkKm>=0&&r.walkKm<=12);
  assert.ok([300,500,700].includes(r.deficit));
  assert.ok([0,100,200,300,500].includes(r.extraDayKcal));
 }
 assert.equal(api.estimate({...profile,sex:''},110,{}),null);
 assert.equal(api.estimate({...profile,age:15},110,{}),null);
 assert.equal(api.estimate(profile,NaN,{}),null);
 const huge=api.estimate({...profile,sex:'female',age:80,height:150},50,{walkKm:0,deficit:700,extraDayKcal:0});
 assert.ok(huge.suggestedGoal>=1500);
});
test('calorie plan is explicit opt-in; changing options does not overwrite existing goal',()=>{
 const chunk=html.slice(html.indexOf('function renderDeficitPlan(){'),html.indexOf('function saveDeficitOptions(){'));
 assert.ok(chunk.includes("const currentGoal=Number($('goalKcal').value)||2600"));
 const change=html.slice(html.indexOf('function saveDeficitOptions(){'),html.indexOf('function renderTrend(){'));
 assert.ok(change.includes('write(CALORIE_PLAN_KEY,opts)'));
 assert.ok(!change.includes("localStorage.setItem('kocluk-goal-kcal'"));
 const pos=html.indexOf("$('frCdpApply').addEventListener('click'");
 assert.ok(pos>0);
 const apply=html.slice(pos,pos+360);
 assert.ok(apply.includes("localStorage.setItem('kocluk-goal-kcal'"));
 assert.ok(apply.includes('renderTotals()'));
});
test('new card is reachable from Nutrition and responsive with zero fitness changes',()=>{
 for(const id of ['frCaloriePlan','frCdpDeficit','frCdpWalk','frCdpExtra','frCdpBmr','frCdpBase','frCdpWalkBurn','frCdpMaintenance','frCdpSuggested','frCdpCurrent','frCdpApply','frCdpActual']){
  assert.equal(html.split('id="'+id+'"').length-1,1,id);
 }
 const card=html.slice(html.indexOf('id="frCaloriePlan"'),html.indexOf('id="v21Recents"'));
 assert.ok(card.includes('normal rutinin dışında'));
 assert.ok(card.includes('500 kcal'));
 assert.ok(card.includes('otomatik değiştirilmez'));
 assert.ok(css.includes('@media(max-width:480px)'));
 assert.ok(html.includes('function fitStartSession(){if(fitCurrent)return;'));
 assert.equal(fs.readdirSync(path.join(__dirname,'../assets')).filter(x=>x.endsWith('.gif')).length,19);
});
test('backups keep plan preferences and accept older backup without overwriting local plan',()=>{
 assert.ok(html.includes('caloriePlan:read(CALORIE_PLAN_KEY,{})'));
 assert.ok(html.includes('if(data.caloriePlan!=null)changes.push([CALORIE_PLAN_KEY,window.FormaRotaCaloriePlan.normalizeConfig(data.caloriePlan)])'));
 assert.ok(html.includes('if(data.caloriePlan!=null&&(!data.caloriePlan'));
 assert.ok(html.includes('renderProfile();renderDeficitPlan();renderTrend();'));
 assert.ok(html.includes('function collectBackup(){return{version:7'));
});
test('new calculation module is loaded and precached offline, legacy app preserved',()=>{
 const loader='<script src="./assets/calorie-deficit.js"></script>';
 assert.ok(html.includes(loader)&&html.includes('<link rel="stylesheet" href="./assets/calorie-deficit.css"/>'));
 assert.ok(html.indexOf(loader)<html.indexOf('function energyEstimate(){'));
 assert.ok(sw.includes("'./assets/calorie-deficit.js'"));
 assert.ok(sw.includes("'./assets/calorie-deficit.css'"));
 assert.match(sw,/formarota-solo-v93-shell/);
 assert.match(sw,/formarota-solo-v93-gifs/);
 assert.ok(html.includes('id="goalKcal" min="0"'));
});

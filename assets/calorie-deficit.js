/* FormaRota: conservative daily calorie deficit planning.
 * Mifflin-St Jeor RMR; 1.2 baseline factor for routine sedentary life.
 * The baseline ALREADY includes ordinary standing and light movement.
 * Extra walking is computed as NET MET above resting (MET-1), not gross.
 * Do not automatically add a claimed 500 kcal walk + 500 kcal daily activity;
 * avoid double counting workday movements and 5-km evening walking.
 * 2024 Compendium: level walking 2.8–3.4 mph ~3.8 MET.
 */
(function(root){
 'use strict';
 const KEY='formarota-deficit-plan-v1';
 const DEFAULTS=Object.freeze({walkKm:5,deficit:500,extraDayKcal:0});
 const ALLOWED_EXTRA=Object.freeze([0,100,200,300,500]);
 const round50=x=>Math.round(x/50)*50;
 function normalizeConfig(value){
  const v=value&&typeof value==='object'&&!Array.isArray(value)?value:{};
  const walkKm=Number(v.walkKm);
  const deficit=Number(v.deficit);
  const extraDayKcal=Number(v.extraDayKcal);
  return Object.freeze({
   walkKm:Number.isFinite(walkKm)&&walkKm>=0&&walkKm<=12?Math.round(walkKm*10)/10:DEFAULTS.walkKm,
   deficit:[300,500,700].includes(deficit)?deficit:DEFAULTS.deficit,
   extraDayKcal:ALLOWED_EXTRA.includes(extraDayKcal)?extraDayKcal:DEFAULTS.extraDayKcal
  });
 }
 function netWalkingKcal(weight,km){
  const w=Number(weight),d=Number(km);
  if(!Number.isFinite(w)||w<35||w>350||!Number.isFinite(d)||d<0||d>100)return null;
  const hours=d/5; // 5 km/h level-ground walking, ~3.8 MET
  return Math.round(Math.max(0,(3.8-1)*3.5*w/200*hours*60));
 }
 function estimate(profile,weight,options){
  const p=profile||{},w=Number(weight),height=Number(p.height),age=Number(p.age);
  const sex=p.sex,settings=normalizeConfig(options);
  if(!['male','female'].includes(sex)||!Number.isFinite(w)||w<35||w>350||
     !Number.isFinite(height)||height<100||height>250||
     !Number.isFinite(age)||age<18||age>100)return null;
  const bmr=10*w+6.25*height-5*age+(sex==='male'?5:-161);
  const baseline=Math.round(bmr*1.2);
  const walk=netWalkingKcal(w,settings.walkKm);
  const maintenance=baseline+walk+settings.extraDayKcal;
  const minGoal=sex==='male'?1800:1500;
  const suggestedGoal=round50(Math.max(minGoal,maintenance-settings.deficit));
  return Object.freeze({
   bmr:Math.round(bmr),baseline,walk,extraDay:settings.extraDayKcal,
   maintenance,deficit:settings.deficit,suggestedGoal,
   estimatedDeficit:maintenance-suggestedGoal,
   settings,weight:w
  });
 }
 root.FormaRotaCaloriePlan=Object.freeze({KEY,DEFAULTS,normalizeConfig,netWalkingKcal,estimate});
})(window);

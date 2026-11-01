/* FormaRota sustainable nutrition rewards: quality and consistency, never under-eating.
 * Reward a complete logged day within a non-escalating target band.
 * No more points for a larger deficit or for omitting meals.
 * The calorie goal is a PLANNED intake, not a maintenance requirement.
 */
(function(root){
 'use strict';
 const MIN_DEFAULT=1500,MIN_MALE=1800,LOW_RATIO=.95,HIGH_RATIO=1.05,MIN_PROTEIN_RATIO=.9;
 const MAIN_MEALS=Object.freeze(['Kahvaltı','Öğle yemeği','Akşam yemeği']);
 function nonnegative(v){
  if(v===null||v===undefined||String(v).trim()==='')return null;
  const n=Number(v);return Number.isFinite(n)&&n>=0?n:null;
 }
 function evaluate(records,goals={}){
  const rows=Array.isArray(records)?records.filter(x=>x&&typeof x==='object'&&Number(x.amount)>0):[];
  const calorieTarget=nonnegative(goals.kcal),proteinTarget=nonnegative(goals.protein);
  const minimum=goals.sex==='male'?MIN_MALE:MIN_DEFAULT;
  const validTargets=calorieTarget!==null&&calorieTarget>=minimum&&
   calorieTarget<=10000&&proteinTarget!==null&&proteinTarget>0&&proteinTarget<=500;
  const meals=new Set(rows.map(x=>x.meal));
  const completeMeals=MAIN_MEALS.every(x=>meals.has(x));
  const completeValues=rows.length>0&&rows.every(x=>nonnegative(x.kcal)!==null&&nonnegative(x.protein)!==null);
  const kcal=completeValues?rows.reduce((n,x)=>n+Number(x.kcal),0):null;
  const protein=completeValues?rows.reduce((n,x)=>n+Number(x.protein),0):null;
  const low=validTargets?Math.max(minimum,calorieTarget*LOW_RATIO):null;
  const high=validTargets?calorieTarget*HIGH_RATIO:null;
  const inPlan=Boolean(completeValues&&validTargets&&kcal>=low&&kcal<=high);
  const proteinMet=Boolean(completeValues&&validTargets&&protein>=MIN_PROTEIN_RATIO*proteinTarget);
  // If the user's own estimate says the target equals or exceeds maintenance,
  // do not claim a deficit plan was followed.
  const maintenance=nonnegative(goals.maintenance);
  const deficitPlan=maintenance===null||maintenance>calorieTarget;
  const balanced=completeMeals&&inPlan&&proteinMet&&deficitPlan;
  return Object.freeze({
   hasFood:rows.length>0,mealCount:meals.size,completeMeals,completeValues,
   kcal,protein,low,high,minimum,inPlan,proteinMet,deficitPlan,balanced
  });
 }
 const api=Object.freeze({MAIN_MEALS,LOW_RATIO,HIGH_RATIO,MIN_PROTEIN_RATIO,evaluate});
 if(typeof module!=='undefined'&&module.exports)module.exports=api;
 root.FormaRotaNutritionRewards=api;
})(typeof window!=='undefined'?window:globalThis);

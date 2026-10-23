/* FormaRota: conservative, explainable dinner estimates. No external AI service.
 * Works only from stored meal entries and estimated per-100g dish composition.
 */
(function(global){
'use strict';
const clamp=(x,min,max)=>Math.max(min,Math.min(max,x));
const finite=x=>typeof x==='number'&&Number.isFinite(x)&&x>=0;
const round=x=>Math.round(x*10)/10;
const dateOK=x=>typeof x==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(x)&&!Number.isNaN(Date.parse(x+'T12:00:00Z'));
function recent(date,asOf,days=7){
 if(!dateOK(date)||!dateOK(asOf)||date>=asOf)return false;
 const d=Math.round((Date.parse(asOf+'T12:00:00Z')-Date.parse(date+'T12:00:00Z'))/86400000);
 return d>=1&&d<=days;
}
function totals(items,lookup){
 const result={kcal:0,protein:0,carbs:0,fat:0};
 for(const [id,grams] of items){
  const food=lookup(id),g=Number(grams);
  if(!food||!finite(food.kcal)||!finite(food.protein)||!Number.isFinite(g)||g<=0)return null;
  result.kcal+=food.kcal*g/100;result.protein+=food.protein*g/100;
  if(finite(food.carbs))result.carbs+=food.carbs*g/100;
  if(finite(food.fat))result.fat+=food.fat*g/100;
 }
 return Object.fromEntries(Object.entries(result).map(([k,v])=>[k,round(v)]));
}
function context(logs,date,kcalGoal,proteinGoal){
 const day=Array.isArray(logs)?logs.filter(x=>x&&x.date===date):[];
 const sum=field=>day.reduce((n,x)=>n+(finite(Number(x[field]))?Number(x[field]):0),0);
 const eatenKcal=round(sum('kcal')),eatenProtein=round(sum('protein'));
 const limitKcal=finite(Number(kcalGoal))&&Number(kcalGoal)>0?Number(kcalGoal):2600;
 const limitProtein=finite(Number(proteinGoal))&&Number(proteinGoal)>0?Number(proteinGoal):160;
 return {eatenKcal,eatenProtein,remainingKcal:round(Math.max(0,limitKcal-eatenKcal)),
  remainingProtein:round(Math.max(0,limitProtein-eatenProtein)),recordedMeals:day.length};
}
function recentMenus(date,logs,plans){
 const recentNames=new Set(),recentFoodIds=new Set();
 for(const log of Array.isArray(logs)?logs:[]){
  if(!log||log.meal!=='Akşam yemeği'||!recent(log.date,date))continue;
  if(log.foodId)recentFoodIds.add(log.foodId);
 }
 for(const [day,plan] of Object.entries(plans&&typeof plans==='object'&&!Array.isArray(plans)?plans:{})){
  if(recent(day,date)&&plan?.eaten&&plan.name)recentNames.add(plan.name);
 }
 return {recentNames,recentFoodIds};
}
function recommend({menus=[],lookup,logs=[],date,goalKcal=2600,goalProtein=160,plans={},mode='balanced',vegetarian=false,limit=3}={}){
 if(typeof lookup!=='function'||!dateOK(date))return {context:null,options:[],reason:'Tarih veya besin verisi geçersiz.'};
 const ctx=context(logs,date,goalKcal,goalProtein);
 if(ctx.remainingKcal<230)return {context:ctx,options:[],reason:'Kaydedilen öğünlere göre günlük kalori hedefinde az yer kaldı. Yeni tam akşam menüsü önerilmiyor.'};
 const target=mode==='light'?420:700;
 const targetKcal=Math.min(ctx.remainingKcal,target);
 const targetProtein=Math.min(ctx.remainingProtein,mode==='protein'?60:mode==='light'?30:45);
 const {recentNames,recentFoodIds}=recentMenus(date,logs,plans);
 const candidates=[];
 for(const menu of menus){
  if(!menu||!Array.isArray(menu.items)||!menu.items.length||!menu.name)continue;
  if(vegetarian&&!menu.vegetarian)continue;
  const original=totals(menu.items,lookup);
  if(!original||original.kcal<110)continue;
  const step=clamp(targetKcal/original.kcal,0.55,1.35);
  const items=menu.items.map(([id,g])=>[id,Math.max(15,Math.round(Number(g)*step/5)*5)]);
  const nutrition=totals(items,lookup);
  if(!nutrition||nutrition.kcal>ctx.remainingKcal+15||nutrition.kcal<150)continue;
  const repeat=recentNames.has(menu.name)||(menu.items[0]&&recentFoodIds.has(menu.items[0][0]));
  const difference=Math.abs(nutrition.kcal-targetKcal)/Math.max(240,targetKcal);
  const proteinDeficit=Math.max(0,targetProtein-nutrition.protein)/Math.max(20,targetProtein);
  const kcalOver=Math.max(0,nutrition.kcal-targetKcal)/Math.max(240,targetKcal);
  const score=difference*1.25+proteinDeficit*(mode==='protein'?1.65:.85)+kcalOver*.7+(repeat?.42:0);
  const explain=[ 'Yaklaşık '+Math.round(nutrition.kcal)+' kcal ve '+round(nutrition.protein)+' g protein'];
  if(Math.abs(step-1)>.07)explain.push('Porsiyon günün kalan hedefine göre ayarlandı');
  else explain.push('Standart porsiyonla önerildi');
  if(repeat)explain.push('Benzer yemek son günlerde kaydedildi');
  else explain.push('Yakın zamandaki akşam kayıtlarında tekrar görünmedi');
  candidates.push({...menu,items,total:nutrition,score,reason:explain.join(' · '),
   recentRepeat:repeat,originalKcal:original.kcal,mode});
 }
 candidates.sort((a,b)=>a.score-b.score||a.name.localeCompare(b.name,'tr'));
 const chosen=[],primary=new Set();
 for(const item of candidates){
  const key=item.items[0]?.[0]||item.name;
  if(primary.has(key))continue;
  chosen.push(item);primary.add(key);
  if(chosen.length>=limit)break;
 }
 if(chosen.length<limit)for(const item of candidates){
  if(chosen.some(x=>x.name===item.name))continue;
  chosen.push(item);if(chosen.length>=limit)break;
 }
 return {context:ctx,options:chosen,reason:chosen.length?'':'Kalan hedefe uygun yeterli menü bulunamadı.'};
}
global.FormaRotaDinnerCoach=Object.freeze({context,totals,recommend,recent});
})(window);

/* FormaRota: optional table sugar for explicitly unsweetened local tea/coffee.
 * One level teaspoon or a small sugar cube is estimated as 4 g (~16 kcal).
 * This NEVER guesses sugar already present in a packaged/sweetened drink.
 */
(function(root){
 'use strict';
 const MAX=6,GRAMS=4,KCAL=16;
 function eligible(food){
  return food?.sugarEligible===true&&food?.nutritionBasis==='100ml'&&food?.unit==='ml'&&
   typeof food?.id==='string'&&food.id.startsWith('variety-drink-');
 }
 function count(value){
  const n=Number(value);return Number.isInteger(n)&&n>=0&&n<=MAX?n:null;
 }
 function extras(value){
  const cubes=count(value);
  return cubes===null?null:{sugarCubes:cubes,sugarGrams:cubes*GRAMS,kcal:cubes*KCAL,carbs:cubes*GRAMS};
 }
 function compute(food,amount,cubes=0){
  const n=Number(amount),bonus=extras(cubes);
  if(!Number.isFinite(n)||n<=0||n>3000||bonus===null||(!eligible(food)&&bonus.sugarCubes>0))return null;
  if(!Number.isFinite(Number(food?.kcal))||!Number.isFinite(Number(food?.protein)))return null;
  const scaled=k=>food[k]==null?null:Number(food[k])*n/100;
  return {kcal:scaled('kcal')+bonus.kcal,protein:scaled('protein'),
   carbs:scaled('carbs')==null?null:scaled('carbs')+bonus.carbs,fat:scaled('fat'),
   sugarCubes:bonus.sugarCubes,sugarGrams:bonus.sugarGrams};
 }
 function recalculate(record,newAmount,newCubes){
  const amount=Number(newAmount),old=Number(record?.amount);
  const oldCubes=count(record?.sugarCubes??0),bonus=extras(newCubes);
  if(!Number.isFinite(amount)||amount<=0||amount>3000||!Number.isFinite(old)||old<=0||
   oldCubes===null||bonus===null||(oldCubes>0&&record?.unit!=='ml'))return null;
  const previous=extras(oldCubes),ratio=amount/old;
  const scaled=(k,extra)=>record[k]==null?null:Math.round(((Number(record[k])-extra)*ratio)*10000)/10000;
  const result={
   kcal:scaled('kcal',previous.kcal)+bonus.kcal,
   protein:scaled('protein',0),
   carbs:record.carbs==null?null:scaled('carbs',previous.carbs)+bonus.carbs,
   fat:scaled('fat',0),
   sugarCubes:bonus.sugarCubes,sugarGrams:bonus.sugarGrams
  };
  if(!Number.isFinite(result.kcal)||!Number.isFinite(result.protein)||
   result.kcal<0||result.protein<0||result.carbs!=null&&(!Number.isFinite(result.carbs)||result.carbs<0))return null;
  return result;
 }
 root.FormaRotaDrinkSugar=Object.freeze({eligible,count,extras,compute,recalculate,GRAMS,KCAL,MAX});
})(window);

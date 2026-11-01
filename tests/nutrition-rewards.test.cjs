'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const E=require('../assets/nutrition-rewards.js');
const file=name=>fs.readFileSync(path.join(__dirname,'..',name),'utf8');
const goals={kcal:2000,protein:160,sex:'male',maintenance:3000};
function fullDay(kcal=2000,protein=160){
 return [
  {date:'2026-11-01',meal:'Kahvaltı',amount:200,kcal:kcal*.22,protein:protein*.25},
  {date:'2026-11-01',meal:'Öğle yemeği',amount:350,kcal:kcal*.38,protein:protein*.35},
  {date:'2026-11-01',meal:'Akşam yemeği',amount:400,kcal:kcal*.40,protein:protein*.40}
 ];
}
test('a configured calorie target is planned intake, not a need to eat exactly or to maximize deficit',()=>{
 const atGoal=E.evaluate(fullDay(2000),goals);
 assert.equal(atGoal.balanced,true,'target itself can represent a deficit');
 assert.equal(E.evaluate(fullDay(1900),goals).balanced,true,'95% of plan also earns the same bonus');
 assert.equal(E.evaluate(fullDay(2050),goals).balanced,true);
 assert.equal(E.evaluate(fullDay(1800),goals).balanced,false,'very low intake gets no bonus');
 assert.equal(E.evaluate(fullDay(1200),goals).balanced,false);
 assert.equal(E.evaluate(fullDay(2250),goals).balanced,false);
 assert.equal(E.evaluate(fullDay(1900),{...goals,maintenance:1900}).balanced,false,'target above/equal maintenance does not count as planned deficit');
 assert.equal(E.evaluate(fullDay(1900),{...goals,maintenance:2500}).balanced,true);
});
test('no premium for skipped meals, empty records, missing or insufficient protein',()=>{
 assert.equal(E.evaluate([],goals).balanced,false);
 assert.equal(E.evaluate(fullDay(2000).slice(0,2),goals).balanced,false);
 assert.equal(E.evaluate(fullDay(2000,80),goals).balanced,false);
 assert.equal(E.evaluate(fullDay(2000,144),goals).balanced,true);
 const missed=fullDay(2000);missed[1].protein=null;
 assert.equal(E.evaluate(missed,goals).balanced,false);
 const unknown=fullDay(2000);unknown[2].kcal=undefined;
 assert.equal(E.evaluate(unknown,goals).balanced,false);
 const onlyOne=fullDay(2000);onlyOne[1].meal='Kahvaltı';onlyOne[2].meal='Kahvaltı';
 assert.equal(E.evaluate(onlyOne,goals).balanced,false);
});
test('low-value user goals cannot manufacture a high-restriction reward',()=>{
 assert.equal(E.evaluate(fullDay(1400),{...goals,kcal:1400}).balanced,false,'male plan below 1800');
 assert.equal(E.evaluate(fullDay(1480),{...goals,kcal:1480,sex:'female'}).balanced,false,'plan below 1500');
 assert.equal(E.evaluate(fullDay(1800),{...goals,kcal:1800}).balanced,true,'male floor');
 assert.equal(E.evaluate(fullDay(1700),{...goals,kcal:1800}).balanced,false);
 assert.equal(E.evaluate(fullDay(0),{...goals,kcal:2000}).balanced,false);
 assert.equal(E.evaluate(fullDay(1950),{...goals,kcal:2000,maintenance:0}).balanced,false);
 assert.equal(E.evaluate(fullDay(1950),{...goals,kcal:0}).balanced,false);
});
test('rank, weekly progress, and home copy all use the same reward engine',()=>{
 const rank=file('assets/rank-system.js'),html=file('index.html'),home=file('assets/oled-home.js'),sw=file('sw.js');
 assert.match(rank,/FormaRotaNutritionRewards\?\.evaluate/);
 assert.doesNotMatch(rank,/k>=\.85\*kcalGoal|k<=1\.15\*kcalGoal/);
 assert.match(rank,/categories\.Beslenme\+=25/);
 assert.match(rank,/categories\.Beslenme\+=15/);
 assert.match(rank,/seven-balanced-food-days/);
 assert.match(rank,/thirty-balanced-food-days/);
 assert.match(html,/Dengeli beslenme günü/);
 assert.match(html,/FormaRotaNutritionRewards\?\.evaluate\?\.\(d\.logs/);
 assert.match(home,/FormaRotaNutritionRewards\?\.evaluate/);
 assert.doesNotMatch(home,/Günlük hedefe ulaştın|kcal hedefe kaldı/);
 assert.match(html,/assets\/nutrition-rewards\.js/);
 assert.match(sw,/'\.\/assets\/nutrition-rewards\.js'/);
 assert.match(sw,/formarota-solo-v101-shell/);
 assert.match(html,/function collectBackup\(\)\{return\{version:7/);
 assert.match(html,/id="absManualToggle"/);
});

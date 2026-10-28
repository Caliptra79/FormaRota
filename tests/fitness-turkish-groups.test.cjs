const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const html=fs.readFileSync(path.join(__dirname,'..','index.html'),'utf8');
const studio=fs.readFileSync(path.join(__dirname,'..','assets/studio-plus.js'),'utf8');
const css=fs.readFileSync(path.join(__dirname,'..','assets/studio-plus.css'),'utf8');
const sw=fs.readFileSync(path.join(__dirname,'..','sw.js'),'utf8');
test('all 7 training muscle groups have Turkish readable labels',()=>{
 const labels={Back:'Sırt',Chest:'Göğüs',Shoulders:'Omuz',Triceps:'Arka kol',Biceps:'Ön kol',Legs:'Bacak',Calves:'Baldır'};
 const block=html.match(/const FIT_GROUP_TR=Object\.freeze\(\{([^}]+)\}\)/)?.[1];
 assert.ok(block,'mapping must be defined before exercise catalog');
 for(const [id,tr] of Object.entries(labels))assert.ok(block.includes(id+":'"+tr+"'"),id);
 assert.ok(html.includes('tag.textContent=FIT_GROUP_TR[move.group]||move.group;'));
 assert.ok(html.includes('window.formaRotaFitnessGroupLabels=FIT_GROUP_TR;'));
 assert.ok(studio.includes('root.formaRotaFitnessGroupLabels?.[move.group]||move.group'));
});
test('original group IDs remain stable for muscle color themes, backups and exercise catalog',()=>{
 for(const id of ['Back','Chest','Shoulders','Triceps','Biceps','Legs','Calves']){
  assert.ok(html.includes("group:'"+id+"'"),id);
 }
 for(const id of ['Back','Chest','Shoulders','Legs','Biceps','Triceps']){
  assert.ok(css.includes('[data-group="'+id+'"]'),id);
 }
 assert.ok(studio.includes("card.dataset.group=move.group||'Other'"));
 assert.ok(html.includes('function collectBackup(){return{version:7'));
 assert.ok(html.includes('const FIT_MOVES=['));
});
test('localized labels are cached offline on installed iPhones and original scripts parse',()=>{
 assert.match(sw,/formarota-solo-v\d+-shell/);
 assert.ok(sw.includes("'./assets/studio-plus.js'"));
 for(const m of html.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/g)){
  assert.doesNotThrow(()=>new vm.Script(m[1]));
 }
 assert.doesNotThrow(()=>new vm.Script(studio));
});

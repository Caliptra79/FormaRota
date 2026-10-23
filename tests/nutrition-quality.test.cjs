const {test}=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const fs=require('node:fs'),path=require('node:path');
const html=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');
function slice(start,end){
 const a=html.indexOf(start),b=html.indexOf(end,a+start.length);
 assert.ok(a>=0&&b>a,'Expected code section: '+start);
 return html.slice(a,b);
}
const nutritionFns=slice('function nutritionMacrosValid(f){','async function search(){');
test('packaged products use 100g kcal rather than serving kcal',()=>{
 const ctx={};vm.runInNewContext(nutritionFns+';this.parse=offProductToFood;this.valid=nutritionMacrosValid;',ctx);
 const product={code:'12345678',product_name:'Test',nutriments:{'energy-kcal':450,'proteins_100g':10}};
 assert.equal(ctx.parse(product),null);
 product.nutriments['energy-kcal_100g']=200;
 const food=ctx.parse(product);
 assert.equal(food.kcal,200);assert.equal(food.protein,10);assert.equal(food.verified,false);
 assert.equal(food.carbs,null);
 assert.match(food.source,/etiket kontrolü/);
});
test('reject missing calorie or protein values and implausible per-100g numbers',()=>{
 const ctx={};vm.runInNewContext(nutritionFns+';this.valid=nutritionMacrosValid;',ctx);
 assert.equal(ctx.valid({kcal:50,protein:0}),true);
 for(const food of [{kcal:null,protein:4},{kcal:30,protein:null},{kcal:-1,protein:10},{kcal:1001,protein:10},{kcal:10,protein:101}])
 assert.equal(ctx.valid(food),false);
});
test('manual food logging rejects incomplete macros and saves missing optional macros as unknown',()=>{
 const fn=slice('function addFood(food){','async function barcodeSearch(){');
 const map=[];
 const nodes={amount:{value:'125'},date:{value:'2026-10-24'},meal:{value:'Öğle yemeği'},status:{textContent:''}};
 const env={
  $:x=>nodes[x],nutritionMacrosValid:f=>f.kcal!=null&&f.protein!=null,
  getLogs:()=>map,write:(key,val)=>{map.length=0;map.push(...val)},logKey:'logs',fmt:x=>String(x),renderTotals:()=>{},
  crypto:{randomUUID:()=>'test-id'}
 };
 vm.runInNewContext(fn+';this.add=addFood;',env);
 env.add({id:'unknown',name:'Incomplete food',kcal:null,protein:14});
 assert.equal(map.length,0);
 env.add({id:'test',name:'Sample',kcal:100,protein:10,carbs:null,fat:null,source:'Test'});
 assert.equal(map.length,1);assert.equal(map[0].kcal,125);assert.equal(map[0].protein,12.5);
 assert.equal(map[0].carbs,null);assert.equal(map[0].fat,null);
});
class FakeEl{
 constructor(tag){this.tag=tag;this.children=[];this.textContent='';this.value='';this.onclick=null;this.className='';this.type='';}
 append(...children){this.children.push(...children)}
 after(element){this.following=element}
 setAttribute(){}
 focus(){}
 remove(){this.removed=true}
}
function nutritionFixture(){
 const logs=[{id:'meal1',date:'2026-10-24',meal:'Öğle yemeği',foodId:'cooked-chicken',
 name:'Tavuk göğsü',amount:180,kcal:297,protein:55.8,carbs:null,fat:6.48,baseKcal:165,baseProtein:31,baseCarbs:null,baseFat:3.6}];
 const storage=new Map([['logs',JSON.stringify(logs)]]),alerts=[],rows=[];
 let failKey=null,refresh=0;
 const localStorage={
  getItem:key=>storage.get(key)??null,
  setItem:(key,val)=>{if(key===failKey)throw Error('Quota');storage.set(key,String(val))},
  removeItem:key=>storage.delete(key)
 };
 const document={createElement:tag=>new FakeEl(tag),querySelectorAll:()=>[]};
 const env={
  document,localStorage,read:(key,fallback)=>JSON.parse(storage.get(key)||JSON.stringify(fallback)),
  getLogs:()=>JSON.parse(storage.get('logs')||'[]'),write:(key,v)=>localStorage.setItem(key,JSON.stringify(v)),
  logKey:'logs',makeId:()=>'change-1',renderTotals:()=>{refresh++},
  alert:msg=>alerts.push(msg),confirm:()=>true
 };
 vm.runInNewContext(slice('function nutritionEditLog(id,row){','function makeId(){')+';this.edit=nutritionEditLog;',env);
 return {env,localStorage,storage,alerts,rows,setFail:k=>failKey=k,getRefresh:()=>refresh,edit:()=>{const row=new FakeEl('div');env.edit('meal1',row);return row.following}};
}
test('meal portion correction rescales macros and preserves record identity and provenance',()=>{
 const f=nutritionFixture(),panel=f.edit(),label=panel.children[0],input=label.children[0],actions=panel.children[1],save=actions.children[1];
 input.value='200';save.onclick();
 const data=JSON.parse(f.storage.get('logs'))[0],journal=JSON.parse(f.storage.get('formarota-nutrition-edits-v1'));
 assert.equal(data.id,'meal1');assert.equal(data.amount,200);assert.equal(data.kcal,330);assert.equal(data.protein,62);
 assert.equal(data.carbs,null);assert.equal(data.foodId,'cooked-chicken');
 assert.equal(journal.length,1);assert.equal(journal[0].oldAmount,180);
 assert.equal(f.getRefresh(),1);
});
test('meal portion correction failure restores old local record',()=>{
 const f=nutritionFixture(),panel=f.edit(),input=panel.children[0].children[0],save=panel.children[1].children[1];
 f.setFail('formarota-nutrition-edits-v1');input.value='200';save.onclick();
 assert.equal(JSON.parse(f.storage.get('logs'))[0].amount,180);
 assert.equal(f.getRefresh(),0);
 assert.ok(f.alerts.some(x=>/Kayıt güncellenemedi/.test(x)));
});
test('nutrition integrity maintains backup keys, original breakfast and themes',()=>{
 const sw=fs.readFileSync(path.join(__dirname,'../sw.js'),'utf8');
 assert.match(html,/nutritionEdits:read\('formarota-nutrition-edits-v1',\[\]\)/);
 assert.ok(html.includes("'formarota-nutrition-edits-v1',Array.isArray(data.nutritionEdits)?data.nutritionEdits:[]"));
 assert.ok(html.includes('presetBreakfast:true'));
 assert.ok(html.includes("name:'Tavuk, pilav ve yoğurt'"));
 assert.ok(html.includes('./assets/nutrition-quality.css'));
 assert.ok(sw.includes('./assets/nutrition-quality.css'));
 assert.ok(sw.includes('./assets/coach-engine-v35.js'));
});
test('dinner suggestions subtract already recorded dinner and all other meals',()=>{
 const a=slice('function renderDinnerRecommendations(){','function renderResults(');
 const b=slice('function v21SmartDinner(){','function v21Svg(');
 assert.ok(a.includes('prior=logs;'));
 assert.ok(b.includes("prior=getLogs().filter(x=>x.date===dt)"));
 assert.ok(!a.includes("logs.filter(x=>x.meal!=='Akşam yemeği')"));
});

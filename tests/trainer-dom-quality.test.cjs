'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const sourceFile=name=>fs.readFileSync(path.join(__dirname,'..',name),'utf8');
class FakeElement{
 constructor(tag,doc){
  this.tagName=tag;this.doc=doc;this.dataset={};this.listeners={};this.children=[];
  this.textContent='';this.innerHTML='';this.value='';this.open=false;this.checked=false;
  this._id='';
 }
 set id(id){this._id=id;this.doc.items.set(id,this);}
 get id(){return this._id;}
 append(...nodes){this.children.push(...nodes);}
 add(option){this.children.push(option);if(!this.value)this.value=option.value;}
 before(){}
 after(){}
 replaceChildren(...nodes){this.children=[...nodes];this.textContent='';}
 addEventListener(event,fn){(this.listeners[event]??=[]).push(fn);}
 dispatch(event){for(const fn of this.listeners[event]||[])fn();}
}
function setup(opts={}){
 const items=new Map();
 const document={items,readyState:'complete',createElement(tag){return new FakeElement(tag,this);},
  createTextNode(value){return {textContent:value};},
  getElementById(id){return items.get(id)||null;}
 };
 const element=(id,tag='div')=>{const el=document.createElement(tag);el.id=id;return el;};
 const chart=element('v21ExerciseChart'),select=element('v21Exercise','select');
 select.value='lat';
 element('v21ExercisePrevious');element('coachOverview');
 element('confirmImport','button');
 const history=opts.history||[
  {date:'2026-10-23',status:'finished',items:{lat:[12,12,12].map(reps=>({done:true,name:'Lat Pulldown',weight:40,reps}))}},
  {date:'2026-10-28',status:'finished',items:{lat:[12,12,12].map(reps=>({done:true,name:'Lat Pulldown',weight:40,reps}))}}
 ];
 const stored={
  'kocluk-fitness-history-v1':JSON.stringify(history),
  'formarota-sleep-energy-v1':JSON.stringify(opts.sleep||{}),
  'kocluk-fitness-variants-v1':JSON.stringify({})
 };
 const localStorage={getItem:k=>Object.prototype.hasOwnProperty.call(stored,k)?stored[k]:null,
  setItem:(k,v)=>stored[k]=String(v)};
 const catalog=[
  {id:'lat',name:'Lat Pulldown',reps:'8–12'},
  {id:'row',name:'Seated Cable Row',reps:'8–12',options:[{name:'Seated Cable Row'},{name:'Dumbbell Row'}]}
 ];
 const calls={chart:0,training:0,report:0};
 const window={formaRotaFitnessCatalog:catalog,today:()=> '2026-10-29',
  v21Svg:(rows)=>'<svg>trend:'+rows.map(x=>String(x.v)).join(',')+'</svg>',
  v21ExerciseGraph:()=>{calls.chart++;chart.innerHTML='<svg>Original weight chart</svg>';},
  fitDrawExercises:()=>{calls.training++;},
  v21Report:()=>{calls.report++;}
 };
 const context=vm.createContext({window,document,localStorage,queueMicrotask:cb=>cb()});
 for(const name of [
  'assets/trainer-foundation.js','assets/coach-engine-v35.js',
  'assets/trainer-insights-engine.js','assets/trainer-insights-ui.js'
 ])vm.runInContext(sourceFile(name),context,{filename:name});
 return {document,window,chart,select,calls,catalog,stored,history};
}
test('new graphic selector appears in existing chart without duplicating cards',()=>{
 const {document,window,chart}=setup();
 const selector=document.getElementById('trainerGraphMetric');
 assert.ok(selector);
 assert.equal(selector.children.length,4);
 assert.equal(document.getElementById('trainerGraphSummary')?.id,'trainerGraphSummary');
 assert.ok(document.getElementById('trainerRecovery'));
 const first=selector;
 window.FormaRotaTrainerInsightsUI.renderGraph();
 assert.equal(first,document.getElementById('trainerGraphMetric'));
 assert.equal(chart.innerHTML,'');
});
test('choosing volume refreshes graph and returns complete kg×reps series',()=>{
 const {document,window,chart}=setup();
 const metric=document.getElementById('trainerGraphMetric');
 metric.value='volume';metric.dispatch('change');
 assert.match(chart.innerHTML,/trend:1440,1440/);
 const label=document.getElementById('trainerGraphSummary').textContent;
 assert.match(label,/Hacim 1\.440 kg×tekrar/);
});
test('choosing total repetitions refreshes chart instead of stale kilogram trend',()=>{
 const {document,chart}=setup();
 const metric=document.getElementById('trainerGraphMetric');
 metric.value='totalReps';metric.dispatch('change');
 assert.match(chart.innerHTML,/trend:36,36/);
});
test('switching exercise variant never displays previously selected exercise records',()=>{
 const {document,window,chart,select}=setup();
 const picker=document.createElement('select');picker.id='coachGraphVariant';
 picker.dataset.forMove='row';picker.value='Dumbbell Row';select.value='row';
 const metric=document.getElementById('trainerGraphMetric');metric.value='volume';
 window.v21ExerciseGraph();
 assert.match(document.getElementById('trainerGraphSummary').textContent,/Bu alternatif için/);
 assert.doesNotMatch(document.getElementById('trainerGraphSummary').textContent,/1\.440/);
});
test('pain report blocks coach increase, unchecking restores prior optional advice',()=>{
 const {document,window,history,calls,stored}=setup();
 const cb=document.getElementById('trainerPainNow');
 const E=window.FormaRotaCoachEngine,lat=window.formaRotaFitnessCatalog[0];
 assert.equal(E.assess(lat,lat.name,history,2.5,'2026-10-29').status,'increase');
 cb.checked=true;cb.dispatch('change');
 assert.equal(window.FormaRotaTrainerInsightsUI.getPainReported(),true);
 assert.equal(E.assess(lat,lat.name,history,2.5,'2026-10-29').status,'caution');
 assert.ok(calls.training>=1);assert.ok(calls.report>=1);
 cb.checked=false;cb.dispatch('change');
 assert.equal(E.assess(lat,lat.name,history,2.5,'2026-10-29').status,'increase');
 assert.deepEqual(JSON.parse(stored['kocluk-fitness-history-v1']),history);
 assert.equal(stored['formarota-trainer-pain-v1'],undefined);
});
test('low sleep plus low energy visibly flags caution without any manual pain checkbox',()=>{
 const {document,window,history}=setup({sleep:{'2026-10-28':{hours:5,energy:2}}});
 assert.match(document.getElementById('trainerRecoveryResult').children[0].textContent,/Yüksek yorgunluk/i);
 const E=window.FormaRotaCoachEngine,lat=window.formaRotaFitnessCatalog[0];
 assert.equal(E.assess(lat,lat.name,history,2.5,'2026-10-29').status,'caution');
});
test('empty or invalid workout records are not counted as recovery observations',()=>{
 const history=[{date:'2026-10-28',status:'stopped',items:{lat:[null,{done:false,weight:40,reps:12}]}}];
 const {document,window}=setup({history});
 const M=window.FormaRotaTrainerInsights;
 const r=M.recovery({asOf:'2026-10-29',fullHistory:history,moves:window.formaRotaFitnessCatalog,coach:window.FormaRotaCoachEngine});
 assert.equal(r.status,'insufficient');
 assert.equal(r.latestWorkoutDate,null);
 assert.match(document.getElementById('trainerRecoveryResult').children[0].textContent,/Henüz yeterli veri/);
});
test('desktop/iPhone offline shell has both trainer modules, and original nutritional script intact',()=>{
 const index=sourceFile('index.html'),sw=sourceFile('sw.js');
 for(const a of ['trainer-insights-engine.js','trainer-insights-ui.js']){
  assert.ok(index.includes('src="./assets/'+a+'"'));
  assert.ok(sw.includes("'./assets/"+a+"'"));
 }
 assert.ok(index.includes('dinner-coach.js'));
 assert.ok(index.includes('abs-engine.js'));
});

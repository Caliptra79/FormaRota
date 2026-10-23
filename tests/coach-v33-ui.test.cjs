// Run: node --test tests/coach-v33-ui.test.cjs
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
class El {
 constructor(tag){
  this.tagName=tag.toUpperCase();this.id='';this.className='';this.children=[];
  this.parentElement=null;this.dataset={};this.listeners={};this.hidden=false;
  this.textContent='';this.title='';this.value='';this.open=false;this.type='';
  this.classList={contains:x=>this.className.split(' ').includes(x)};
 }
 append(...values){for(const x of values){
  if(x.parentElement)x.parentElement.children=x.parentElement.children.filter(y=>y!==x);
  x.parentElement=this;this.children.push(x);
 }}
 appendChild(x){this.append(x);return x}
 add(x){this.append(x);if(this.tagName==='SELECT'&&this.children.length===1&&!this.value)this.value=x.value}
 replaceChildren(...values){this.children=[];this.append(...values)}
 before(x){const p=this.parentElement;if(!p)throw Error('missing parent');
  if(x.parentElement)x.parentElement.children=x.parentElement.children.filter(y=>y!==x);
  p.children.splice(p.children.indexOf(this),0,x);x.parentElement=p;
 }
 after(x){const p=this.parentElement;if(!p)throw Error('missing parent');
  if(x.parentElement)x.parentElement.children=x.parentElement.children.filter(y=>y!==x);
  p.children.splice(p.children.indexOf(this)+1,0,x);x.parentElement=p;
 }
 insertBefore(x,y){if(x.parentElement)x.parentElement.children=x.parentElement.children.filter(z=>z!==x);
  const index=this.children.indexOf(y);this.children.splice(index<0?this.children.length:index,0,x);x.parentElement=this;
 }
 remove(){if(this.parentElement)this.parentElement.children=this.parentElement.children.filter(x=>x!==this)}
 descendants(){return this.children.flatMap(x=>[x,...x.descendants()])}
 matches(s){
  if(s.startsWith('#'))return this.id===s.slice(1);
  if(s==='details.fit-fold')return this.tagName==='DETAILS'&&this.className.split(' ').includes('fit-fold');
  if(s.startsWith('.'))return s.slice(1).split('.').every(x=>this.className.split(' ').includes(x));
  return this.tagName.toLowerCase()===s;
 }
 querySelector(selector){return this.descendants().find(x=>x.matches(selector))||null}
 querySelectorAll(selector){return this.descendants().filter(x=>x.matches(selector))}
 addEventListener(name,fn){(this.listeners[name]??=[]).push(fn)}
 dispatch(name){for(const fn of this.listeners[name]||[])fn()}
 scrollIntoView(){}
 get lastChild(){return this.children.at(-1)||null}
}
function fixture(){
 const document={readyState:'complete',roots:[],createElement:tag=>new El(tag),
  getElementById(id){return this.roots.flatMap(r=>[r,...r.descendants()]).find(x=>x.id===id)||null}
 };
 const make=(tag,id='',className='')=>{const x=document.createElement(tag);x.id=id;x.className=className;return x};
 const main=make('main');document.roots.push(main);
 const workout=make('section','fitnessRoot');main.append(workout);
 const timer=make('section','fitSessionPanel'),schedule=make('section','fitSchedulePanel'),exercisePanel=make('section','fitExercisePanel');
 workout.append(timer,schedule,exercisePanel);schedule.append(make('details','','fit-fold'));
 const list=make('div','fitExerciseList');exercisePanel.append(list);
 const card=make('article','','fit-card');card.dataset.move='lat';list.append(card);
 const content=make('div');card.append(content);content.append(make('div','','fit-nametop'),make('div','','fit-settable'));
 const insights=make('section');main.append(insights);
 const selector=make('select','v21Exercise');selector.value='lat';
 insights.append(selector,make('div','v21ExercisePrevious'),make('div','v21Report'));
 main.append(make('button','confirmImport'));
 const storage=new Map();const localStorage={getItem:key=>storage.has(key)?storage.get(key):null,setItem:(key,value)=>storage.set(key,String(value))};
 const lat={id:'lat',name:'Lat Pulldown',reps:'8–12'};
 function session(date){return {date,status:'finished',items:{lat:[1,2,3].map(()=>({done:true,name:'Lat Pulldown',weight:30,reps:12}))}}}
 const history=[session('2026-10-09'),session('2026-10-16')];
 const window={};vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../assets/coach-engine-v33.js'),'utf8'),{window});
 let draws=0;
 window.fitDrawExercises=()=>{draws++};
 window.fitDrawWeek=()=>{};window.fitDrawHistory=()=>{};window.v21ExerciseGraph=()=>{};
 window.v21Report=()=>{};window.v21RenderInsights=()=>{};window.showView=()=>{};
 const read=(key,def)=>key==='kocluk-fitness-weeks-v1'?{}:key==='kocluk-fitness-variants-v1'?{}:def;
 const code=fs.readFileSync(path.join(__dirname,'../assets/coach-ui-v33.js'),'utf8');
 vm.runInNewContext(code,{window,document,localStorage,FIT_MOVES:[lat],fitGetHist:()=>history,read,
  today:()=> '2026-10-24',fitConf:()=>({frequency:2}),v21ReportOffset:0,
  v21ExerciseGraph:()=>{}});
 return {document,window,card,history,localStorage,get draws(){return draws}};
}
test('coach renders a single accessible explanation with real evidence and no duplicates',()=>{
 const f=fixture(),r=f.card.querySelector('.coach-reason');
 assert.ok(r);assert.equal(r.tagName,'DETAILS');
 assert.equal(r.open,false);
 assert.equal(r.querySelector('summary').textContent,'Bu öneri neden verildi?');
 const body=r.querySelector('.coach-reason-body');
 const lines=body.children.map(x=>x.textContent).join('\n');
 assert.match(lines,/9 Eki/);assert.match(lines,/16 Eki/);
 assert.match(lines,/30 kg/);
 assert.match(lines,/Kayıt durumu/);
 const hint=f.card.querySelector('.coach-inline-value');
 assert.match(hint.textContent,/32,5 kg/);
 f.window.fitDrawExercises();
 assert.equal(f.card.querySelectorAll('.coach-reason').length,1);
 assert.equal(f.draws,1);
});
test('weight increment changing from 2.5 to 5 updates suggestion and evidence without losing open state',()=>{
 const f=fixture();
 const inc=f.document.getElementById('coachIncrement');
 const fold=f.card.querySelector('.coach-reason');fold.open=true;
 inc.value='5';inc.dispatch('change');
 assert.match(f.card.querySelector('.coach-inline-value').textContent,/35 kg/);
 assert.equal(f.card.querySelector('.coach-reason').open,true);
 assert.equal(f.localStorage.getItem('formarota-coach-increment-v1'),'5');
 assert.equal(f.history[0].items.lat[0].weight,30);
});
test('weekly overview distinguishes unconfirmed schedule, days and completed sessions',()=>{
 const f=fixture();const summary=f.document.getElementById('coachWeekSummary').textContent;
 assert.match(summary,/0 \/ 2 farklı gün/);
 assert.match(summary,/Öneri günleri/);
 const strip=f.document.getElementById('coachWeekStrip');
 assert.equal(strip.children.length,7);
 assert.ok(f.document.getElementById('coachReport'));
});
test('coach reports and progress analysis can render without rewriting training data',()=>{
 const f=fixture(),before=JSON.stringify(f.history);
 assert.ok(f.document.getElementById('coachAnalysis'));
 assert.equal(JSON.stringify(f.history),before);
 assert.ok(f.document.getElementById('coachReport'));
 assert.ok(f.document.getElementById('coachOverview'));
});

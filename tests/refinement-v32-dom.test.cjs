// Run: node --test tests/refinement-v32-dom.test.cjs
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
class FakeElement {
 constructor(tag,id='',className=''){
  this.tagName=tag.toUpperCase();this.id=id;this.className=className;
  this.children=[];this.parentElement=null;this.textContent='';this.dataset={};this.attributes={};
  this.classList={
   contains:value=>this.className.split(' ').includes(value),
   add:value=>{if(!this.classList.contains(value))this.className=(this.className+' '+value).trim()}
  };
 }
 append(...items){for(const item of items){
  if(item.parentElement)item.parentElement.children=item.parentElement.children.filter(x=>x!==item);
  item.parentElement=this;this.children.push(item);
 }}
 after(item){
  if(item.parentElement)item.parentElement.children=item.parentElement.children.filter(x=>x!==item);
  const p=this.parentElement,i=p.children.indexOf(this);p.children.splice(i+1,0,item);item.parentElement=p;
 }
 before(item){
  if(item.parentElement)item.parentElement.children=item.parentElement.children.filter(x=>x!==item);
  const p=this.parentElement,i=p.children.indexOf(this);p.children.splice(i,0,item);item.parentElement=p;
 }
 get nextElementSibling(){return this.parentElement?.children[this.parentElement.children.indexOf(this)+1]||null}
 matches(sel){
  if(sel==='p.muted')return this.tagName==='P'&&this.classList.contains('muted');
  if(sel[0]==='.')return this.classList.contains(sel.slice(1));
  return sel.toUpperCase()===this.tagName;
 }
 descendants(){return this.children.flatMap(x=>[x,...x.descendants()])}
 querySelector(sel){
  if(sel==='.fit-headline h2'){
   return this.descendants().find(x=>x.classList.contains('fit-headline'))?.querySelector('h2')||null;
  }
  const direct=sel.startsWith(':scope > '),key=direct?sel.slice(9):sel;
  return (direct?this.children:this.descendants()).find(x=>x.matches(key))||null;
 }
 closest(sel){for(let p=this;p;p=p.parentElement)if(p.matches(sel))return p;return null}
 setAttribute(key,value){this.attributes[key]=String(value)}
}
function fixture(){
 const nodes={};
 const create=(tag,id='',className='')=>{
  const node=new FakeElement(tag,id,className);
  if(id)nodes[id]=node;return node;
 };
 const main=create('main'),nutrition=create('section','nutritionTop');
 const macroStats=create('div','','stats'),budget=create('section','v21Budget'),meals=create('section','mealQuickPanel');
 const breakfast=create('section','breakfastPanel');
 nutrition.append(create('div','','row'),macroStats);
 breakfast.append(create('h2'),create('p','','muted'),create('div','breakfastStatus'),create('button','breakfastToggle'),create('p','','muted'));
 main.append(nutrition,budget,meals,breakfast);
 const profile=create('section','profilePanel'),heading=create('div','','split'),preferences=create('details','','progress-preferences'),weightRow=create('div','','row'),saveRow=create('div','','row'),stats=create('div','','stats'),save=create('button','saveWeight');
 saveRow.append(save);profile.append(heading,preferences,weightRow,saveRow,stats);main.append(profile);
 const fitness=create('section'),coach=create('section','coachOverview'),timer=create('section','fitSessionPanel'),schedule=create('section','fitSchedulePanel'),exercises=create('section','fitExercisePanel'),fitHeading=create('div','','fit-headline'),fitTitle=create('h2');
 fitHeading.append(fitTitle);exercises.append(fitHeading);fitness.append(coach,timer,exercises,schedule);main.append(fitness);
 const document={readyState:'complete',documentElement:create('html'),getElementById:id=>nodes[id]||null,createElement:tag=>create(tag)};
 return {document,nodes,breakfast,nutrition,macroStats,budget,meals,profile,heading,preferences,saveRow,stats,coach,schedule,fitTitle};
}
test('all v32 visual relocations preserve tracking nodes, IDs and expected ordering',()=>{
 const f=fixture();
 const code=fs.readFileSync(path.join(__dirname,'../assets/refinement-v32.js'),'utf8');
 vm.runInNewContext(code,{document:f.document});
 assert.equal(f.document.documentElement.dataset.frDesign,'32');
 assert.equal(f.budget.parentElement,f.nutrition);
 assert.equal(f.macroStats.nextElementSibling,f.budget);
 assert.equal(f.breakfast.nextElementSibling,f.meals);
 assert.equal(f.breakfast.querySelector('.fr32-breakfast-details').children.length,3);
 assert.ok(f.nodes.breakfastToggle);
 assert.ok(f.nodes.breakfastStatus);
 assert.equal(f.heading.nextElementSibling,f.stats);
 assert.equal(f.saveRow.nextElementSibling,f.preferences);
 assert.equal(f.coach.nextElementSibling,f.schedule);
 assert.equal(f.fitTitle.textContent,'Hareketlerim ve setlerim');
});

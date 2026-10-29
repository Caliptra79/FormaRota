'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const src=p=>fs.readFileSync(path.join(__dirname,'..',p),'utf8');
const html=src('index.html');
const css=src('assets/oled-home.css');
const sw=src('sw.js');
const a=html.indexOf('function waterGoal(){'),b=html.indexOf('/* Single workout view: all exercise cards are always shown. */',a);
assert.ok(a>0&&b>a);
const section=html.slice(a,b);
const TODAY='2026-10-29',OLD='2026-10-25';
function setup(){
 const map=new Map([
  ['formarota-water-v1',JSON.stringify({[TODAY]:500,[OLD]:1500})],
  ['formarota-walks-v1',JSON.stringify({[TODAY]:5,[OLD]:3.2})],
  ['formarota-water-goal-v1','2500']
 ]);
 const handlers={},nodes={};
 for(const key of ['trackerDate','trackerToday','trackerDateNote','waterGoal','waterCount','walkCount','walkKm',
   'walkToggle','waterPlus','waterMinus']){
  nodes[key]={value:'',textContent:'',max:'',disabled:false,handlers:{},addEventListener(event,fn){this.handlers[event]=fn}};
 }
 nodes.walkKm.value='0';
 const storage={
  getItem:key=>map.has(key)?map.get(key):null,
  setItem:(key,val)=>{map.set(key,String(val))},
  removeItem:key=>map.delete(key)
 };
 const dateFromISO=s=>{const [year,month,day]=s.split('-').map(Number);return new Date(year,month-1,day,12)};
 const isoDate=d=>[d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-');
 const ctx={
  localStorage:storage,homeDay:()=>TODAY,
  read:(key,fallback)=>JSON.parse(map.get(key)||JSON.stringify(fallback)),
  write:(key,val)=>storage.setItem(key,JSON.stringify(val)),
  WATER_KEY:'formarota-water-v1',WALK_KEY:'formarota-walks-v1',
  WATER_GOAL_KEY:'formarota-water-goal-v1',
  $:id=>{assert.ok(nodes[id],id);return nodes[id]},
  dateFromISO,isoDate,fmt:n=>String(n),document:{activeElement:null},
  alert:msg=>{throw Error(msg)}
 };
 vm.runInNewContext(section+'\nthis.getTrackerDay=trackerDay;this.draw=renderWaterWalk;',ctx);
 ctx.renderHome=()=>ctx.draw();
 const data=key=>JSON.parse(map.get(key)||'{}');
 return {ctx,nodes,data,storage,handlers};
}
test('date picker is scoped to water/walk and is accessible in home',()=>{
 for(const id of ['trackerDate','trackerToday','trackerDateNote']){
  assert.equal((html.match(new RegExp('id="'+id+'"','g'))||[]).length,1);
 }
 assert.match(html,/id="trackerDate" type="date"/);
 assert.match(html,/Su ve yürüyüş kayıt günü/);
 assert.ok(css.includes('#trackerDate'));
 assert.ok(css.includes('min-height:44px'));
 assert.ok(sw.includes("'./assets/oled-home.css'"));
});
test('default tracker date is today, preserving todays data and counts',()=>{
 const f=setup();f.ctx.draw();
 assert.equal(f.nodes.trackerDate.value,TODAY);
 assert.equal(f.nodes.trackerDate.max,TODAY);
 assert.equal(f.nodes.trackerToday.disabled,true);
 assert.equal(f.nodes.waterCount.textContent,'500 / 2500 ml');
 assert.equal(f.nodes.walkCount.textContent,'5 / 5 km');
 assert.equal(f.nodes.walkKm.value,'5');
 assert.match(f.nodes.trackerDateNote.textContent,/Bugünün/);
});
test('past water and walking updates do not overwrite current-day values',()=>{
 const f=setup();
 f.ctx.draw();f.nodes.trackerDate.value=OLD;f.nodes.trackerDate.handlers.change();
 assert.equal(f.nodes.waterCount.textContent,'1500 / 2500 ml');
 assert.equal(f.nodes.walkCount.textContent,'3.2 / 5 km');
 assert.equal(f.nodes.trackerToday.disabled,false);
 f.nodes.waterPlus.handlers.click();
 assert.equal(f.data('formarota-water-v1')[OLD],1750);
 assert.equal(f.data('formarota-water-v1')[TODAY],500);
 f.nodes.waterMinus.handlers.click();
 assert.equal(f.data('formarota-water-v1')[OLD],1500);
 f.nodes.walkToggle.handlers.click();
 assert.equal(f.data('formarota-walks-v1')[OLD],5);
 assert.equal(f.data('formarota-walks-v1')[TODAY],5);
 f.nodes.walkToggle.handlers.click();
 assert.equal(f.data('formarota-walks-v1')[OLD],0);
 f.nodes.walkKm.value='4.3';f.nodes.walkKm.handlers.change();
 assert.equal(f.data('formarota-walks-v1')[OLD],4.3);
 assert.equal(f.data('formarota-walks-v1')[TODAY],5);
 assert.match(f.nodes.trackerDateNote.textContent,/Üstteki günlük özet bugüne aittir/);
});
test('today button restores original daily tracker without discarding historical entries',()=>{
 const f=setup();f.ctx.draw();
 f.nodes.trackerDate.value=OLD;f.nodes.trackerDate.handlers.change();
 f.nodes.trackerToday.handlers.click();
 assert.equal(f.nodes.trackerDate.value,TODAY);
 assert.equal(f.nodes.waterCount.textContent,'500 / 2500 ml');
 assert.equal(f.nodes.walkCount.textContent,'5 / 5 km');
 assert.equal(f.data('formarota-water-v1')[OLD],1500);
 assert.equal(f.data('formarota-walks-v1')[OLD],3.2);
});
test('invalid calendar days and future dates cannot mutate other records',()=>{
 const f=setup();f.ctx.draw();
 for(const value of ['2026-10-30','2026-02-30','not-a-date','']){
  f.nodes.trackerDate.value=value;
  f.nodes.trackerDate.handlers.change();
  assert.equal(f.nodes.trackerDate.value,TODAY,value);
 }
 f.nodes.waterPlus.handlers.click();
 assert.equal(f.data('formarota-water-v1')[TODAY],750);
 assert.equal(f.data('formarota-water-v1')[OLD],1500);
});
test('fitness and food dates remain independent; existing backup keys remain unchanged',()=>{
 assert.ok(html.includes("function homeDay(){return today()}"));
 assert.ok(html.includes("function fitStartSession(){if(fitCurrent)return;"));
 assert.ok(html.includes("fitCurrent={id:makeId(),date:today()"));
 assert.ok(html.includes("date:$('date').value,meal:$('meal').value"));
 assert.ok(html.includes('water:read(WATER_KEY,{})'));
 assert.ok(html.includes('walks:read(WALK_KEY,{})'));
 assert.ok(html.includes("const date=homeDay(),logs=getLogs().filter(x=>x.date===date)"));
});

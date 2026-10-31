'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm'),fs=require('node:fs'),path=require('node:path');
const src=pathName=>fs.readFileSync(path.join(__dirname,'..',pathName),'utf8');
function engine(data={}){
 const storage=new Map(Object.entries(data).map(([k,v])=>[k,typeof v==='string'?v:JSON.stringify(v)]));
 const window={localStorage:{getItem:key=>storage.get(key)??null,setItem(){throw Error('Map must not write into records')}}};
 vm.runInNewContext(src('assets/route-map.js'),{window});
 return {map:window.FormaRotaRouteMap,window,storage};
}
const today='2026-10-31';
const days=Array.from({length:45},(_,i)=>{
 const d=new Date(2026,8,1+i,12);
 return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
});
test('route milestones are distinct, offline, and unlocked by unique activity days',()=>{
 const {map}=engine();
 assert.equal(map.STAGES.length,5);
 assert.deepEqual(Array.from(map.STAGES,s=>s.days),[0,5,12,24,40]);
 const empty=map.snapshot({},today);
 assert.equal(empty.days,0);
 assert.equal(empty.stage,0);
 assert.equal(empty.remaining,5);
 const meals=days.slice(0,24).map(date=>({date,amount:125,kcal:0,protein:0}));
 const progress=map.snapshot({foods:meals},today);
 assert.equal(progress.days,24);
 assert.equal(progress.stage,3);
 assert.equal(progress.remaining,16);
 assert.equal(progress.routePercent,60);
 const top=map.snapshot({foods:days.slice(0,42).map(date=>({date,amount:100}))},today);
 assert.equal(top.stage,4);
 assert.equal(top.next,null);
 assert.equal(top.nextPercent,100);
});
test('multiple food entries, water and walks never double-count a day',()=>{
 const {map}=engine();
 const progress=map.snapshot({
  foods:[{date:days[0],amount:100},{date:days[0],amount:50},{date:days[1],amount:250}],
  water:{[days[0]]:750,[days[2]]:250},
  walks:{[days[0]]:5,[days[2]]:5,[days[3]]:0},
 },today);
 assert.equal(progress.days,3);
 assert.equal(progress.weeks,1);
 assert.equal(progress.lastDay,days[2]);
});
test('only real past dates and positive, finite measurements can qualify',()=>{
 const {map}=engine();
 const result=map.snapshot({
  foods:[{date:'2026-02-30',amount:100},{date:'2026-11-01',amount:100},
   {date:days[0],amount:0},{date:days[1],amount:'garbage'},
   {date:days[2],amount:70},{date:days[3],amount:null}],
  walks:{'2026-02-29':5,'2026-12-12':5,[days[4]]:-1,[days[5]]:Infinity},
  water:{[days[3]]:500,[days[4]]:12000}
 },today);
 assert.equal(result.days,2);
});
test('stopped and malformed workout sessions do not earn a route day',()=>{
 const {map}=engine();
 const sets=Array.from({length:3},()=>({done:true,weight:10,reps:10}));
 const items=Object.fromEntries(Array.from({length:13},(_,i)=>['movement-'+i,sets]));
 const full={date:days[0],status:'finished',items};
 const absItems=Object.fromEntries(['floor-crunch','reverse-crunch','heel-touch','plank'].map(id=>
  [id,Array.from({length:3},()=>({done:true,reps:12,seconds:45}))]));
 const abs={date:days[1],status:'finished',items:absItems};
 const p=map.snapshot({full:[full,{...full,date:days[2],status:'stopped'},
  {...full,date:days[3],items:{}}],abs:[abs,{...abs,date:days[4],status:'stopped'},
  {...abs,date:days[5],items:{}}]},today);
 assert.equal(p.days,2);
 assert.equal(map.snapshot({full:[full],abs:[abs]},today,{
  full:()=>false,abs:()=>false}).days,0);
});
test('route calculation uses existing local backup-compatible records and does not mutate them',()=>{
 const {map,storage}=engine({
  'kocluk-food-log-v2':[{date:days[0],amount:100}],
  'formarota-walks-v1':{[days[1]]:5},
  'formarota-water-v1':{[days[2]]:250},
  'kocluk-fitness-history-v1':[],
  'formarota-abs-history-v1':[]
 });
 const before=[...storage.entries()].map(([a,b])=>[a,b]);
 const p=map.currentSnapshot();
 assert.ok(p.days>=0);
 assert.deepEqual([...storage.entries()],before);
 assert.equal(map.snapshot(map.records(),today).days,3);
});
test('HTML, styling and service worker include accessible, offline route components',()=>{
 const html=src('index.html'),css=src('assets/route-map.css'),sw=src('sw.js');
 assert.match(html,/id="frRouteHome"/);
 assert.match(html,/id="frRouteHomeOpen"/);
 assert.match(html,/id="frRoutePanel"/);
 assert.match(html,/id="frRouteMap"/);
 assert.match(html,/id="frRouteNextBar"/);
 assert.match(html,/assets\/route-map\.js/);
 assert.match(html,/assets\/route-map\.css/);
 assert.match(sw,/formarota-solo-v\d+-shell/);
 assert.match(sw,/'\.\/assets\/route-map\.js'/);
 assert.match(sw,/'\.\/assets\/route-map\.css'/);
 assert.match(src('assets/route-map.js'),/fr-route-pin secondary/);
 assert.match(src('assets/route-map.js'),/fr-route-stop secondary/);
 assert.match(css,/prefers-reduced-motion/);
 assert.match(css,/aspect-ratio:400\/420/);
 assert.doesNotThrow(()=>new vm.Script(src('assets/route-map.js')));
});

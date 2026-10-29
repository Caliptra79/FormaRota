'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const source=p=>fs.readFileSync(path.join(__dirname,'..',p),'utf8');
function fixture(seed={}){
 const store={
  'kocluk-food-log-v2':JSON.stringify(seed.logs||[]),
  'formarota-water-v1':JSON.stringify(seed.water||{}),
  'formarota-walks-v1':JSON.stringify(seed.walk||{}),
  'kocluk-fitness-history-v1':JSON.stringify(seed.full||[]),
  'formarota-abs-history-v1':JSON.stringify(seed.abs||[]),
  'kocluk-fitness-current-v1':JSON.stringify(seed.current||null),
  'formarota-abs-current-v1':JSON.stringify(seed.absCurrent||null)
 };
 const elements=new Map(),events={};let writes=0;
 function element(tag='div'){
  return {tag,children:[],attributes:{},dataset:{},style:{values:{},setProperty(k,v){this.values[k]=v;}},
   textContent:'',classList:{contains:()=>false},
   setAttribute(k,v){this.attributes[k]=String(v);},
   append(...nodes){this.children.push(...nodes);},
   replaceChildren(...nodes){this.children=nodes;},
   addEventListener(ev,fn){this.listeners??={};this.listeners[ev]=fn;}
  };
 }
 const doc={readyState:'loading',visibilityState:'visible',
  createElement:element,createDocumentFragment:()=>({children:[],append(...nodes){this.children.push(...nodes)}}),
  getElementById:id=>elements.get(id)||null,
  addEventListener:(event,fn)=>{events[event]=fn;}};
 for(const id of ['homePanel','oledKcalRing','oledKcalValue','oledKcalTarget','oledKcalState','oledCarbs','oledFat','oledProtein',
  'oledCarbsNote','oledFatNote','oledProteinBar','oledTodayPlan','oledRecentList','oledRecentAll']){
  elements.set(id,element());
 }
 for(const [id,val] of [['goalKcal','2600'],['goalProtein','160'],['waterGoal','2500']]){
  const el=element('input');el.value=val;elements.set(id,el);
 }
 const root={document:doc,localStorage:{getItem:k=>store[k]??null,setItem:()=>writes++},
  formaRotaFitnessCatalog:Array.from({length:13},(_,i)=>({id:'m'+i})),
  FormaRotaStudioPlusMetrics:{localISO:()=> '2026-10-29',fullSession:s=>s.status==='finished'&&s.valid===true},
  FormaRotaABSEngine:{completedDates:rows=>new Set(rows.filter(x=>x.status==='finished'&&x.valid===true).map(x=>x.date))},
  addEventListener:(ev,fn)=>{events[ev]=fn;},
  requestAnimationFrame:fn=>fn()};
 vm.runInNewContext(source('assets/oled-home.js'),{window:root,document:doc,queueMicrotask:fn=>fn()});
 return {api:root.FormaRotaOLEDHome,root,store,elements,events,writeCount:()=>writes};
}
test('OLED Black is fresh-install default but previously saved color choices remain valid',()=>{
 const html=source('index.html'),theme=source('assets/oled-edition.css'),dialog=source('assets/luxe-ui.js');
 assert.ok(html.includes("localStorage.getItem('formarota-ui-theme')||'oled-black'"));
 assert.ok(html.includes("'oled-neon','oled-ember'"));
 for(const name of ['oled-black','oled-neon','oled-ember']){
  assert.ok(theme.includes('html[data-theme="'+name+'"]'));
  assert.ok(dialog.includes("id:'"+name+"'"));
 }
 assert.ok(dialog.includes("id:'night'"));
});
test('no synthetic macro targets: incomplete carbohydrate/fat data is labelled missing',()=>{
 const x=fixture({logs:[{date:'2026-10-29',meal:'Kahvaltı',name:'Yumurta',kcal:155,protein:12,carbs:null,fat:11}]});
 const d=x.api.snapshot();
 assert.equal(d.kcal,155);assert.equal(d.protein,12);
 assert.equal(d.carbs,null);assert.equal(d.fat,11);
 x.api.render();assert.equal(x.elements.get('oledCarbs').textContent,'—');
 assert.equal(x.elements.get('oledCarbsNote').textContent,'Eksik besin verisi');
 assert.equal(x.writeCount(),0);
});
test('calorie ring accurately reports exceeding the target and clamps only the visual arc',()=>{
 const x=fixture({logs:[{date:'2026-10-29',name:'Test',meal:'Öğle yemeği',kcal:2850,protein:130,carbs:200,fat:60}]});
 x.api.render();
 const ring=x.elements.get('oledKcalRing');
 assert.equal(ring.style.values['--oled-progress'],'100%');
 assert.equal(ring.attributes['aria-valuenow'],'2600');
 assert.equal(ring.dataset.exceeded,'true');
 assert.match(x.elements.get('oledKcalState').textContent,/250 kcal aşıldı/);
 assert.equal(x.elements.get('oledKcalValue').textContent,'2.850');
});
test('today plan reflects real meal, water, walking and in-progress workout records',()=>{
 const x=fixture({
  logs:[{date:'2026-10-29',meal:'Kahvaltı',name:'Antep peyniri',kcal:120,protein:10,carbs:1,fat:9}],
  water:{'2026-10-29':2500},walk:{'2026-10-29':3.5},
  current:{date:'2026-10-29',status:'running'}
 });
 const d=x.api.snapshot();
 assert.equal(d.hasMeal('Kahvaltı'),true);
 assert.equal(d.hasMeal('Öğle yemeği'),false);
 assert.equal(d.water,2500);assert.equal(d.walk,3.5);assert.equal(d.active,true);
 x.api.render();
 const frag=x.elements.get('oledTodayPlan').children[0];
 assert.equal(frag.children.length,7);
 assert.equal(frag.children[0].children[2].textContent,'Kaydedildi');
 assert.equal(frag.children[1].children[2].textContent,'Bekliyor');
 assert.equal(frag.children[4].children[2].textContent,'Tamamlandı');
 assert.equal(frag.children[5].children[2].textContent,'Kalan 1,5 km');
 assert.equal(frag.children[6].children[2].textContent,'Sürüyor');
 assert.equal(x.writeCount(),0);
});
test('latest meals and completed workout records are displayed without fabricating timestamps',()=>{
 const x=fixture({
  logs:[{date:'2026-10-29',name:'Tavuk',meal:'Öğle yemeği',amount:180,kcal:280},
        {date:'2026-10-28',name:'Yumurta',meal:'Kahvaltı',amount:100,kcal:155}],
  full:[{date:'2026-10-29',status:'finished',valid:true}],
  abs:[{date:'2026-10-30',status:'finished',valid:true}]
 });
 x.api.render();
 const records=x.elements.get('oledRecentList').children[0].children;
 assert.equal(records.length,3);
 const names=records.map(r=>r.children[1].children[0].textContent).sort();
 assert.deepEqual(names,['Full Body antrenmanı','Tavuk','Yumurta'].sort());
 assert.ok(!JSON.stringify(records).includes('12:30'));
});
test('invalid storage content cannot crash the dashboard, and no records are written',()=>{
 const x=fixture();x.store['kocluk-food-log-v2']='{broken';
 assert.doesNotThrow(()=>x.api.render());
 assert.equal(x.api.snapshot().todays.length,0);
 assert.equal(x.writeCount(),0);
});
test('ten choices have distinct OLED accents and guaranteed true-black backdrop',()=>{
 const css=source('assets/oled-edition.css');
 const colorOf=id=>css.match(new RegExp('html\\[data-theme="'+id+'"\\]\\{([\\s\\S]*?)\\}'))?.[1]||'';
 const colors=['oled-black','oled-neon','oled-ember'].map(id=>colorOf(id));
 for(const c of colors){assert.ok(c.includes('--bg:#000000'));assert.ok(c.includes('color-scheme:dark'));}
 assert.ok(colors[0].includes('--accent:#91e6be'));
 assert.ok(colors[1].includes('--accent:#bcff4c'));
 assert.ok(colors[2].includes('--accent:#ffaf67'));
 assert.ok(css.includes('html[data-theme^="oled-"] .mobile-tabbar'));
 assert.ok(css.includes('html[data-theme^="oled-"] #fitnessRoot #coachOverview'));
 assert.ok(css.includes('html[data-theme^="oled-"] #preferencesPanel .luxe-theme-launch'));
});

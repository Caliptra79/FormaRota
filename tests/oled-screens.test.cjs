'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const source=p=>fs.readFileSync(path.join(__dirname,'..',p),'utf8');
function setup(){
 const nodes=new Map(),saves=[];
 class Node{
  constructor(tag){this.tag=tag;this.children=[];this.dataset={};this.attrs={};this.handlers={};this._id='';this.value='';this.textContent='';}
  set id(val){this._id=val;nodes.set(val,this);}
  get id(){return this._id;}
  append(...els){this.children.push(...els);}
  after(el){this.next=el;}
  setAttribute(k,v){this.attrs[k]=String(v);}
  addEventListener(k,fn){(this.handlers[k]??=[]).push(fn);}
  dispatchEvent(e){for(const fn of this.handlers[e.type]||[])fn(e);}
  click(){for(const fn of this.handlers.click||[])fn();}
 }
 const select=new Node('select');select.id='themeSelect';select.value='oled-black';
 const launch=new Node('button');launch.id='luxeThemeLaunch';
 select.addEventListener('change',()=>saves.push(select.value));
 const doc={readyState:'complete',createElement:tag=>new Node(tag),getElementById:id=>nodes.get(id)||null,addEventListener(){}};
 const window={document:doc};
 vm.runInNewContext(source('assets/oled-theme-quick.js'),{window,document:doc,Event:class{constructor(type,opts){this.type=type;this.bubbles=opts?.bubbles;}}});
 return {select,launch,nodes,saves,window};
}
test('settings exposes three visible OLED previews while leaving native ten-theme select intact',()=>{
 const x=setup();
 const group=x.nodes.get('oledThemeQuick');
 assert.ok(group);
 assert.equal(group.children[1].children.length,3);
 assert.equal(x.launch.next,group);
 assert.equal(x.select.value,'oled-black');
 assert.equal(group.children[1].children[0].attrs['aria-pressed'],'true');
 assert.equal(group.children[1].children[1].attrs['aria-pressed'],'false');
});
test('touching a theme tile sends the existing select change event, never directly edits storage',()=>{
 const x=setup();
 const tiles=x.nodes.get('oledThemeQuick').children[1].children;
 tiles[1].click();
 assert.equal(x.select.value,'oled-neon');
 assert.equal(tiles[1].attrs['aria-pressed'],'true');
 assert.equal(tiles[0].attrs['aria-pressed'],'false');
 assert.equal(x.saves.length,1);
 assert.equal(x.saves[0],'oled-neon');
 tiles[2].click();
 assert.deepEqual(x.saves,['oled-neon','oled-ember']);
});
test('repeat initialization does not duplicate OLED theme preview controls',()=>{
 const x=setup();const wrapper=x.nodes.get('oledThemeQuick');
 x.window.FormaRotaOLEDThemeQuick.refresh();
 assert.equal(x.nodes.get('oledThemeQuick'),wrapper);
 assert.equal(wrapper.children[1].children.length,3);
});
test('the OLED styles alter all major functional sections without hiding forms or controls',()=>{
 const css=source('assets/oled-screens.css');
 for(const sel of [
  '#nutritionTop .stat','#v21Budget .v21-box','#searchPanel',
  '#studioFitnessHero .studio-hero-content','#fitExercisePanel .fit-card',
  '#coachOverview .coach-main-tip','#trainerRecovery',
  '#frRankFull .fr-rank-row strong','#v21ExerciseChart','#v21WeightChart',
  '#preferencesPanel .luxe-theme-launch'
 ])assert.ok(css.includes(sel),sel);
 assert.ok(css.includes('@media(max-width:420px)'));
 assert.ok(css.includes('@media(max-width:700px)'));
 assert.ok(css.includes('html[data-theme^="oled-"]'));
 assert.ok(!css.includes('localStorage'));
});
test('OLED style and theme quick selector load last and are precached for offline use',()=>{
 const html=source('index.html'),sw=source('sw.js');
 assert.ok(html.indexOf('oled-screens.css')>html.indexOf('oled-home.css'));
 assert.ok(html.indexOf('oled-theme-quick.js')>html.indexOf('oled-home.js'));
 for(const name of ['oled-screens.css','oled-theme-quick.js'])
  assert.ok(sw.includes("'./assets/"+name+"'"),name);
 assert.match(sw,/formarota-solo-v\d+-shell/);
 assert.ok(sw.includes('const GIFS='));
});
test('theme design does not modify the backup shape or any fitness/food records',()=>{
 const html=source('index.html'),js=source('assets/oled-theme-quick.js');
 assert.ok(html.includes('function collectBackup(){return{version:7'));
 assert.ok(html.includes('kocluk-food-log-v2'));
 assert.ok(html.includes('kocluk-fitness-history-v1'));
 assert.ok(!js.includes('setItem('));
 assert.ok(!js.includes('removeItem('));
 assert.ok(!js.includes('fitness-history-v1'));
 assert.equal(fs.readdirSync(path.join(__dirname,'../assets')).filter(p=>p.endsWith('.gif')).length,19);
});

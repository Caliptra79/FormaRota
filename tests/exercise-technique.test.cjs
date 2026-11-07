'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const read=p=>fs.readFileSync(path.join(__dirname,'..',p),'utf8');
const T=require('../assets/exercise-technique.js'),Home=require('../assets/home-calisthenics-engine.js'),Abs=require('../assets/abs-engine.js');
const gym=['lat','row','incline','pec','lateral','rear','push','overhead','zottman','legpress','extension','legcurl','calf'];
test('all 3 programs have complete local technique notes, including variants',()=>{
 for(const id of gym)assert.ok(T.get('gym',id),id);
 for(const id of ['dumbbell-row','incline-fly'])assert.ok(T.get('gym',id));
 for(const m of Home.MOVES)assert.ok(T.get('home',m.id),m.id);
 for(const m of Abs.MOVES)assert.ok(T.get('abs',m.id),m.id);
 for(const group of Object.values(T.groups))for(const id of group){
  const v=Object.entries(T.groups).find(([,ids])=>ids.includes(id));
  assert.ok(v);
  const note=T.get(v[0],id);assert.ok(note.muscles&&note.technique&&note.avoid);
 }
 assert.equal(T.get('gym','not-real'),null);
});
test('technique content and all exercise media are offline, no external URLs',()=>{
 const sw=read('sw.js'),html=read('index.html');
 for(const asset of ['exercise-technique.js','exercise-technique.css','rank-quests.js','rank-quests.css']){
  assert.ok(sw.includes("'./assets/"+asset+"'"),asset+' must be installed offline');
  assert.ok(html.includes('./assets/'+asset),asset+' must be loaded');
 }
 assert.match(sw,/const HOME_GIFS=/);assert.match(sw,/const GIFS=/);
 assert.match(sw,/await Promise\.all\(GIFS\.map/);
 assert.doesNotMatch(sw,/Promise\.allSettled\(GIFS\.map/);
 assert.ok(read('assets/home-calisthenics.js').includes("FormaRotaTechnique?.attach(card,'home',move.id)"));
 assert.ok(read('assets/abs-workouts.js').includes("FormaRotaTechnique?.attach(body,'abs',move.id)"));
 assert.ok(html.includes('FormaRotaTechnique?.attach(body,"gym",gifKey)'));
 assert.doesNotMatch(read('assets/exercise-technique.js'),/https?:\/\//);
 new vm.Script(read('assets/exercise-technique.js'));
 assert.ok(read('assets/exercise-technique.css').includes('var(--text)'));
});

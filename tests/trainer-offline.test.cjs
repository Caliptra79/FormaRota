'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const code=fs.readFileSync(path.join(__dirname,'../sw.js'),'utf8');
function simulate(fails=[]){
 const hooks={},stored=[],events=[],failed=new Set(fails);
 const self={addEventListener:(event,fn)=>hooks[event]=fn,skipWaiting:async()=>events.push('activate-requested'),location:{origin:'https://example.com'},clients:{claim:async()=>{}}};
 const caches={open:async()=>({put:async(file)=>stored.push(file)})};
 const fetch=async file=>({ok:!failed.has(file)});
 vm.runInNewContext(code,{self,caches,fetch,URL},{filename:'sw.js'});
 let installation;
 hooks.install({waitUntil:p=>{installation=p}});
 return {installation,stored,events};
}
test('required script cannot be omitted during offline PWA update',async()=>{
 const s=simulate(['./assets/trainer-adapter.js']);
 await assert.rejects(s.installation,/Offline asset cannot be installed/);
 assert.equal(s.events.includes('activate-requested'),false);
});
test('complete offline installation includes all trainer assets',async()=>{
 const s=simulate();
 await s.installation;
 assert.ok(s.stored.includes('./assets/trainer-adapter.js'));
 assert.ok(s.stored.includes('./assets/trainer-foundation.js'));
 assert.ok(s.events.includes('activate-requested'));
});
test('optional GIF cache errors do not prevent core offline installation',async()=>{
 const s=simulate(['./assets/abs-plank.gif']);
 await s.installation;
 assert.ok(s.events.includes('activate-requested'));
 assert.ok(s.stored.includes('./assets/trainer-adapter.js'));
});

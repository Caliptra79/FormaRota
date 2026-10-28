'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const html=fs.readFileSync(path.join(__dirname,'..','index.html'),'utf8');
const rank=fs.readFileSync(path.join(__dirname,'..','assets/rank-system.js'),'utf8');
test('rank goals and XP baseline survive backup and restore',()=>{
 assert.match(html,/rank:\{goalsSnapshot:read\('formarota-rank-goals-snapshot-v1',null\)/);
 assert.match(html,/const rankGoals=data\.rank\?\.goalsSnapshot/);
 assert.match(html,/changes\.push\(\['formarota-rank-goals-snapshot-v1',rankGoals\]\)/);
 assert.match(html,/changes\.push\(\['formarota-rank-last-seen-xp-v1'/);
});
test('historical goals remain independent from changing UI goals',()=>{
 assert.match(rank,/const goals=snapshotGoals\(\),kcalGoal=goals\.kcal,proteinGoal=goals\.protein/);
 assert.match(rank,/r\.water>=waterTarget\(\)/);
 assert.match(rank,/Object\.values\(row\.items\)/);
 new vm.Script(rank);
});
test('rank restore rejects malformed snapshots without data mutation',()=>{
 assert.match(html,/Rank bilgileri bozuk/);
 assert.match(html,/const prior=new Map\(changes\.map/);
 assert.match(html,/for\(const \[key,val\] of prior\)/);
});

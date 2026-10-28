import test from 'node:test';
import assert from 'node:assert/strict';
import {machineHunt,machineHuntDetection,machineHuntSightBlocked} from '../src/feature-games.js';

test('rocks and tree trunks block sight only when they cross the segment',()=>{
 const a={x:10,y:20},b={x:110,y:20};assert.equal(machineHuntSightBlocked(a,b,[{x:55,y:20,r:8}]),true);assert.equal(machineHuntSightBlocked(a,b,[{x:55,y:31,r:8}]),false);assert.equal(machineHuntSightBlocked(a,b,[{x:140,y:20,r:8}]),false);
});
test('blocked sight and distant cover break alert; still cover slows detection',()=>{
 const tick=(level,d,inCover,hidden,blocked)=>machineHuntDetection(level,d,170,inCover,hidden,blocked,1);
 assert.equal(tick(0,80,false,false,false),100);assert.equal(tick(0,130,true,true,false),15);assert.equal(tick(0,130,true,false,false),78);assert.equal(tick(80,130,false,false,true),32);assert.equal(tick(100,130,true,true,false),49);assert.equal(tick(100,130,false,false,true),0);
});
test('manual and preview use the same seeded band geometry',()=>{
 const old=Math.random;try{const worlds=[];for(const auto of [false,true]){let seed=42;Math.random=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/2**32);const game=machineHunt();game.update(0,auto);worlds.push(game.snapshot())}assert.deepEqual(worlds[0].obstacles,worlds[1].obstacles);assert.deepEqual(worlds[0].grass,worlds[1].grass);assert.ok(worlds[0].obstacles.some(o=>o.r===6));assert.ok(worlds[0].obstacles.some(o=>o.r>=8));
 }finally{Math.random=old}
});

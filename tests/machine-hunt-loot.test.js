import test from 'node:test';
import assert from 'node:assert/strict';
import {machineHunt,machineHuntLootDrops,machineHuntPickupTarget,machineHuntHasNearbyAlert} from '../src/feature-games.js';

test('Thunderjaw always drops its three physical rewards in addition to ordinary loot',()=>{
 const boss={x:120,y:240,kind:3};
 assert.deepEqual(machineHuntLootDrops(boss,()=>.99),[{x:120,y:240,kind:'ward'},{x:134,y:246,kind:'stamina'},{x:106,y:246,kind:'heal'}]);
 assert.deepEqual(machineHuntLootDrops(boss,()=>.4).map(item=>item.kind),['power','ward','stamina','heal']);
 assert.deepEqual(machineHuntLootDrops({...boss,kind:0},()=>.99),[]);
});

test('AI defeats a Thunderjaw and leaves its rewards to be collected',()=>{
 let seed=6;const original=Math.random;Math.random=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/2**32);
 try{const game=machineHunt();let previous=null,defeat=null;
  for(let frame=0;frame<60*120;frame++){game.update(1/60,true);const state=game.snapshot(),boss=state.robots.find(robot=>robot.kind===3);
   if(previous&&!boss&&previous.hp<=1&&previous.y<700){defeat=state;break}previous=boss;
  }
  assert.ok(defeat,'the seeded AI should defeat the encountered boss');
  for(const kind of ['ward','stamina','heal'])assert.ok(defeat.loot.some(item=>item.kind===kind),`missing ${kind} reward`);
  assert.ok(defeat.hero.hp<5,'boss defeat must not grant free health before collecting loot');
 }finally{Math.random=original}
});


test('AI selects the nearest nearby loot or crate, ignoring distant items',()=>{
 const hero={x:100,y:100},far={x:241,y:100},loot={x:160,y:100},crate={x:110,y:100};
 assert.equal(machineHuntPickupTarget([far,loot],[crate],hero),crate);
 assert.equal(machineHuntPickupTarget([far,loot],[],hero),loot);
 assert.equal(machineHuntPickupTarget([far],[],hero),null);
 assert.equal(machineHuntPickupTarget([{x:240,y:100}],[],hero),null);
});

test('seeded AI physically collects a supply crate',()=>{
 let seed=6;const original=Math.random;Math.random=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/2**32);
 try{const game=machineHunt();let previous=game.snapshot(),collected=false;
  for(let frame=0;frame<60*60;frame++){game.update(1/60,true);const state=game.snapshot();
   if(previous.crates.some(c=>Math.hypot(c.x-previous.hero.x,c.y-previous.hero.y)<24)&&state.power>=previous.power+3){collected=true;break}previous=state;
  }
  assert.ok(collected,'AI must approach and collect a crate through gameplay');
 }finally{Math.random=original}
});


test('only nearby living alerted machines suppress pickup detours',()=>{
 const hero={x:100,y:100};
 assert.equal(machineHuntHasNearbyAlert([{x:359,y:100,detect:100}],hero),true);
 assert.equal(machineHuntHasNearbyAlert([{x:360,y:100,detect:100}],hero),false);
 assert.equal(machineHuntHasNearbyAlert([{x:110,y:100,detect:99}],hero),false);
 assert.equal(machineHuntHasNearbyAlert([{x:110,y:100,detect:100,dead:true}],hero),false);
});

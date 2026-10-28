import test from 'node:test';
import assert from 'node:assert/strict';
import {machineHunt} from '../src/feature-games.js';
function seeded(seed,fn){const old=Math.random;Math.random=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/2**32);try{fn()}finally{Math.random=old}}
test('Machine Hunt generates the same world bands only once when revisiting ground',()=>seeded(42,()=>{
 const game=machineHunt(),step=(key,n)=>{game.input(key,true);for(let i=0;i<n;i++)game.update(1/60,false);game.input(key,false)};
 step('ArrowUp',60);const first=game.snapshot();assert.ok(first.lastMeters>0);const generated=first.nextBand;
 for(let i=0;i<12;i++){step('ArrowDown',60);step('ArrowUp',60);const now=game.snapshot();assert.equal(now.nextBand,generated,'revisiting the same ground must not generate new bands');assert.ok(!now.gameOver,'fixture should survive this bounded route');}
}));
test('Machine Hunt seeded AI progresses without accumulating a dense machine crowd',()=>{
 for(const seed of [1,7,42,99,12345])seeded(seed,()=>{const game=machineHunt();let maximum=0,furthest=0;
  for(let frame=0;frame<60*180;frame++){game.update(1/60,true);if(frame%60===0){const state=game.snapshot();maximum=Math.max(maximum,state.robots.filter(r=>r.y>=0&&r.y<=720).length);furthest=Math.max(furthest,state.lastMeters)}}
  assert.ok(furthest>=100,`seed ${seed} failed to progress beyond the opening`);assert.ok(maximum<=18,`seed ${seed} accumulated ${maximum} visible machines`);
 });
});

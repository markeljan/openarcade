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
 for(const seed of [1,7,42,99,12345])seeded(seed,()=>{const game=machineHunt();let furthest=0;
  for(let frame=0;frame<60*180;frame++){game.update(1/60,true);if(frame%60===0){const state=game.snapshot();const visible=state.robots.filter(r=>r.y>=0&&r.y<=720).length;assert.ok(visible<=(state.migration.phase==='live'?26:18),`seed ${seed} accumulated ${visible} visible machines during ${state.migration.phase}`);furthest=Math.max(furthest,state.lastMeters)}}
  assert.ok(furthest>=100,`seed ${seed} failed to progress beyond the opening`);
 });
});


test('generated world bands contain reference ranges of cover and sight obstacles',()=>{
 for(const seed of [1,7,42,99])seeded(seed,()=>{const game=machineHunt();game.update(0,false);const state=game.snapshot();for(let band=1;band<state.nextBand;band++){
  const grass=state.grass.filter(g=>g.band===band),trees=state.obstacles.filter(o=>o.band===band&&o.r===6),rocks=state.obstacles.filter(o=>o.band===band&&o.r>=8);
  assert.ok(grass.length>=2&&grass.length<=3);assert.ok(grass.every(g=>g.x>=48&&g.x<=272&&g.r>=26&&g.r<=40));
  assert.ok(trees.length>=1&&trees.length<=2);assert.ok(rocks.length<=1);
 }});
});

test('generated cover remains fixed in world coordinates as the manual hunter travels',()=>seeded(42,()=>{
 const game=machineHunt();game.update(0,false);const before=game.snapshot(),patch=before.grass.find(g=>g.band===2);assert.ok(patch);
 game.input('ArrowUp',true);for(let i=0;i<30;i++)game.update(1/60,false);const after=game.snapshot(),same=after.grass.find(g=>g.band===patch.band&&g.x===patch.x);assert.ok(same);assert.ok(Math.abs((same.y-patch.y)-(after.scroll-before.scroll))<1e-8);
}));

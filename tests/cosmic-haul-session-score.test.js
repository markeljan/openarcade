import test from 'node:test';
import assert from 'node:assert/strict';
import { haul } from '../src/feature-games9.js';
function seeded(t){const previous=Math.random;let seed=42;Math.random=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/2**32);t.after(()=>{Math.random=previous})}
test('manual asteroid break awards session points separately from salvage value',t=>{
 seeded(t);const game=haul();game.input('x',true);for(let i=0;i<3600;i++)game.update(1/60,false);const state=game.snapshot();assert.ok(state.frags.length>0);assert.ok(state.sessionScore>=16);assert.equal(state.bank,0);game.reset();assert.equal(game.snapshot().sessionScore,0);
});
test('autoplay does not add to manual session points',t=>{
 seeded(t);const game=haul();for(let i=0;i<3600;i++)game.update(1/60,true);assert.equal(game.snapshot().sessionScore,0);
});

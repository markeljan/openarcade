import test from 'node:test';
import assert from 'node:assert/strict';
import {createWobbleWar} from '../src/feature-games34.js';
test('manual victory scores 195 while preview victories do not add session points',()=>{const old=Math.random;let seed=1;Math.random=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/2**32);try{const g=createWobbleWar();for(let i=0;i<1000&&g.snapshot().phase!=='battle';i++)g.update(1/60,true);for(let i=0;i<3000&&g.snapshot().phase==='battle';i++)g.update(1/60,false);assert.equal(g.snapshot().winner,'BLUE WINS');assert.equal(g.snapshot().manualScore,195);g.reset();for(let i=0;i<10000&&g.snapshot().stage===0;i++)g.update(1/60,true);assert.ok(g.snapshot().stage>0);assert.equal(g.snapshot().manualScore,0)}finally{Math.random=old}});

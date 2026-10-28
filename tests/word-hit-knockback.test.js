import test from 'node:test';
import assert from 'node:assert/strict';
import {wordfall} from '../src/feature-games3.js';
test('manual and AI damage launches the wizard upward and reverses horizontal motion',()=>{const old=Math.random;let seed=42;Math.random=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/2**32);try{for(const auto of [false,true]){const g=wordfall();if(!auto)g.input('ArrowRight',true);let before,after;for(let i=0;i<5000;i++){before=g.snapshot();g.update(1/60,auto);after=g.snapshot();if(after.hp<before.hp)break}assert.equal(after.hp,before.hp-1);assert.equal(after.player.vy,-216);assert.ok(after.player.vx<0);assert.equal(after.player.ground,false);assert.equal(after.invuln,1.5)}}finally{Math.random=old}});

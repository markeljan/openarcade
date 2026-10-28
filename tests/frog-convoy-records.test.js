import test from 'node:test';
import assert from 'node:assert/strict';
import {frog} from '../src/feature-games10.js';
const frames=(g,n,auto)=>{for(let i=0;i<n;i++)g.update(1/60,auto)};
test('manual result records once and Enter starts a new shift',()=>{
 const scores=[],g=frog({shiftFrames:1},()=>{},{finish:score=>scores.push(score)});
 frames(g,365,false);assert.equal(g.snapshot().state,'result');assert.deepEqual(scores,[0]);
 g.input('Enter',true);assert.equal(g.snapshot().state,'run');assert.equal(g.snapshot().runFrame,0);
});
test('manual result times out to attract and previews never record',()=>{
 const scores=[],g=frog({shiftFrames:1},()=>{},{finish:score=>scores.push(score)});
 frames(g,361,false);frames(g,719,false);assert.equal(g.isAttract(),false);frames(g,1,false);assert.equal(g.isAttract(),true);assert.equal(g.isAttract(),false);assert.deepEqual(scores,[0]);
 frames(g,1000,true);assert.equal(g.isResult(),false);assert.deepEqual(scores,[0]);
});


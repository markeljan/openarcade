import test from 'node:test';
import assert from 'node:assert/strict';
import {createBurrowGame} from '../src/feature-games11.js';
const frames=(g,n,auto)=>{for(let i=0;i<n;i++)g.update(1/60,auto)};
test('manual finale records once and Enter starts a new hunt',()=>{
 const scores=[],g=createBurrowGame({finalFrames:1,records:{finish:s=>scores.push(s),best:()=>0}});
 frames(g,361,false);assert.equal(g.snapshot().state,'result');assert.deepEqual(scores,[0]);
 g.input('Enter',true);assert.equal(g.snapshot().state,'hunt');assert.equal(g.snapshot().frame,0);
});
test('manual result returns to attract after 720 frames and AI never records',()=>{
 const scores=[],g=createBurrowGame({finalFrames:1,records:{finish:s=>scores.push(s),best:()=>0}});
 frames(g,361,false);frames(g,719,false);assert.equal(g.isAttract(),false);frames(g,1,false);assert.equal(g.isAttract(),true);assert.equal(g.isAttract(),false);
 frames(g,1000,true);assert.deepEqual(scores,[0]);
});

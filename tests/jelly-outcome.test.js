import test from 'node:test';
import assert from 'node:assert/strict';
import {race} from '../src/feature-games2.js';
function seeded(seed,fn){const old=Math.random;Math.random=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/2**32);try{fn()}finally{Math.random=old}}
test('final chooses a single winner and holds the crown result before restarting',()=>seeded(42,()=>{
 const g=race({firstCourse:0});let s;for(let i=0;i<60*220;i++){g.update(1/60,true);s=g.snapshot();if(s.round===2&&s.phase==='OVER')break}assert.equal(s.round,2);assert.equal(s.phase,'OVER');assert.ok(s.winner);assert.ok(['crown','timeout'].includes(s.winCause));assert.equal(s.beans.filter(b=>b.done).length,1);assert.equal(s.outcome,s.winner.player?'CROWN!':'SO CLOSE');for(let i=0;i<60*3;i++)g.update(1/60,true);assert.equal(g.snapshot().phase,'OVER');for(let i=0;i<60*5;i++)g.update(1/60,true);assert.equal(g.snapshot().round,0);
}));

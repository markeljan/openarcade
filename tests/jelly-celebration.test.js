import test from 'node:test';
import assert from 'node:assert/strict';
import {race} from '../src/feature-games2.js';
function seeded(seed,fn){const old=Math.random;Math.random=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/2**32);try{fn()}finally{Math.random=old}}
test('human elimination records once as it happens, while preview never records',()=>seeded(42,()=>{
 const calls=[],g=race({firstCourse:2,modifier:'hungry',records:{finish:s=>calls.push(s)}});let atElimination;for(let i=0;i<60*90;i++){g.update(1/60,false);const s=g.snapshot();if(s.player?.eliminated){atElimination=s;break}}assert.ok(atElimination);assert.equal(calls.length,1);assert.equal(calls[0],atElimination.manualScore);for(let i=0;i<600;i++)g.update(1/60,false);assert.equal(calls.length,1);
 const previewCalls=[],preview=race({firstCourse:2,records:{finish:s=>previewCalls.push(s)}});for(let i=0;i<60*160;i++)preview.update(1/60,true);assert.deepEqual(previewCalls,[]);
}));
test('crown winner remains visible during the celebration',()=>seeded(42,()=>{
 const game=race({firstCourse:0});let s;for(let i=0;i<60*220;i++){game.update(1/60,true);s=game.snapshot();if(s.round===2&&s.phase==='OVER')break}assert.ok(s.winner);let circles=0;const ctx=new Proxy({arc(){circles++}},{get:(o,k)=>o[k]??(()=>{}),set:(o,k,v)=>(o[k]=v,true)});game.draw(ctx);assert.ok(circles>0);for(let i=0;i<60;i++)game.update(1/60,true);assert.ok(game.snapshot().celebration>.9);
}));

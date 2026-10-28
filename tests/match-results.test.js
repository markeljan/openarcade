import test from 'node:test';
import assert from 'node:assert/strict';
import {soccer} from '../src/feature-games2.js';
import {castle} from '../src/feature-games13.js';
function seeded(fn){const original=Math.random;let seed=42;Math.random=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/2**32);try{fn()}finally{Math.random=original}}
function snapshot(game){const labels=[];const ctx=new Proxy({fillText(s){labels.push(s)}},{get:(o,k)=>o[k]??(()=>{}),set:(o,k,v)=>(o[k]=v,true)});game.draw(ctx);return labels}
test('Turbo Arena keeps manual result and resumes the AI preview',()=>seeded(()=>{
 const game=soccer();for(let i=0;i<600*60&&!game.snapshot().finished;i++)game.update(1/60,false);const result=snapshot(game);assert.ok(result.includes('MATCH OVER'));
 for(let i=0;i<12*60;i++)game.update(1/60,false);assert.deepEqual(snapshot(game).filter(s=>s.includes('BLUE')||s.includes('ORANGE')||s==='MATCH OVER'),result.filter(s=>s.includes('BLUE')||s.includes('ORANGE')||s==='MATCH OVER'));
 for(let i=0;i<4*60;i++)game.update(1/60,true);assert.ok(!snapshot(game).includes('MATCH OVER'),'preview should restart');
 game.reset();assert.ok(!snapshot(game).includes('MATCH OVER'),'restart should start a new match');
}));
test('Castle Crasher rebuilds after a breach and reset starts chapter one',()=>seeded(()=>{
 const game=castle();for(let i=0;i<60*600&&game.snapshot().chapter===1;i++)game.update(1/60,true);
 assert.ok(game.snapshot().chapter>1,'AI should breach a fort');assert.equal(game.snapshot().blocks.filter(b=>!b.dead).length,60,'breach rebuilds both reference forts');
 game.reset();assert.equal(game.snapshot().chapter,1);
}));

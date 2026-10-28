import test from 'node:test';
import assert from 'node:assert/strict';
import {refillJellyQualifiers,race} from '../src/feature-games2.js';
test('lucky losers refill the next round to the reference minimum',()=>{
 const beans=[{id:0,eliminated:false},{id:1,eliminated:true},{id:2,eliminated:true},{id:3,eliminated:true}];const selected=refillJellyQualifiers(beans,3);assert.deepEqual(selected.map(b=>b.id),[0,3,2]);assert.ok(selected.every(b=>!b.eliminated));assert.equal(beans[1].eliminated,true);
});
test('bonus ledges preserve the authored main-row count and AI advances',()=>{
 let n=3172,old=Math.random;Math.random=()=>((n=(Math.imul(n,1664525)+1013904223)>>>0)/2**32);try{const g=race({firstCourse:1});let s=g.snapshot();assert.equal(s.platforms.filter(p=>!p.bonus).length,15);assert.ok(s.platforms.some(p=>p.bonus));for(let i=0;i<60*80&&g.snapshot().round===0;i++)g.update(1/60,true);s=g.snapshot();assert.ok(s.round>0||s.phase==='OVER')}finally{Math.random=old}
});

import test from 'node:test';import assert from 'node:assert/strict';import {bowl} from '../src/feature-games6.js';
test('manual match follows the rival schedule and saves the final result after the presentation',()=>{
 const saved=[],g=bowl(()=>{},{finish:n=>saved.push(n)});
 for(let i=0;i<46;i++)g.update(1,false);assert.equal(g.snapshot().rivalScore,0);
 g.update(1,false);assert.equal(g.snapshot().rivalScore,7);
 for(let i=47;i<900;i++)g.update(1,false);let s=g.snapshot();assert.equal(s.phase,'ending');assert.equal(s.rivalScore,101);assert.equal(s.outcome,'TITLE LOST');assert.equal(s.sessionScore,80);assert.deepEqual(saved,[]);
 for(let i=0;i<6;i++)g.update(1,false);s=g.snapshot();assert.equal(s.phase,'gameover');assert.deepEqual(saved,[80]);
 g.input('Enter',true);s=g.snapshot();assert.equal(s.phase,'playcall');assert.equal(s.rivalScore,0);assert.equal(s.sessionScore,0);
});
test('AI match finishes then starts a new match without saving manual records',()=>{
 const saved=[],g=bowl(()=>{},{finish:n=>saved.push(n)});for(let i=0;i<900;i++)g.update(1,true);
 assert.equal(g.snapshot().phase,'ending');assert.equal(g.snapshot().rivalScore,101);
 for(let i=0;i<6;i++)g.update(1,true);const s=g.snapshot();assert.equal(s.phase,'playcall');assert.equal(s.matchClock,0);assert.equal(s.rivalScore,0);assert.deepEqual(saved,[]);
});
test('manual result returns to attract after twelve seconds',()=>{
 let returns=0;const g=bowl(()=>{},{},()=>returns++);for(let i=0;i<906;i++)g.update(1,false);assert.equal(g.snapshot().phase,'gameover');
 for(let i=0;i<11;i++)g.update(1,false);assert.equal(g.snapshot().phase,'gameover');g.update(1,false);assert.equal(g.snapshot().phase,'playcall');assert.equal(returns,1);
});

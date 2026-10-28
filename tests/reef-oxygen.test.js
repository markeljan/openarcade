import test from 'node:test';import assert from 'node:assert/strict';import {createReefGame} from '../src/feature-games38.js';
test('manual tank reaches its reserve warning at 536 frames and empties at 690',()=>{
 const g=createReefGame();for(let i=0;i<534;i++)g.update(1/60,false);assert.equal(g.snapshot().oxygenAlarm,false);for(let i=0;i<3;i++)g.update(1/60,false);let s=g.snapshot();assert.equal(s.oxygenAlarm,true);assert.ok(s.oxygen<155*100/690);assert.equal(s.phase,'dive');for(let i=0;i<152;i++)g.update(1/60,false);assert.equal(g.snapshot().phase,'dive');for(let i=0;i<3&&g.snapshot().phase==='dive';i++)g.update(1/60,false);assert.equal(g.snapshot().phase,'rescue');
});
test('AI returns with a catch before its source-scaled tank runs dry',()=>{
 const g=createReefGame();let caught=false,returned=false;for(let i=0;i<5000;i++){g.update(1/60,true);const s=g.snapshot();caught ||= s.bag>0;if(s.phase==='service'){returned=true;assert.ok(s.oxygen>0);break}}assert.ok(caught);assert.ok(returned);
});

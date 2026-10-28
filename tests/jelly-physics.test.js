import test from 'node:test';
import assert from 'node:assert/strict';
import {race,jellyCameraOffset} from '../src/feature-games2.js';
test('camera approaches its target with frame-rate-independent reference easing',()=>{
 const one=jellyCameraOffset(0,100,1/60);assert.ok(Math.abs(one-8)<1e-8);let two=jellyCameraOffset(jellyCameraOffset(0,100,1/120),100,1/120);assert.ok(Math.abs(two-one)<1e-8);
});
test('manual jump rises roughly one course row and AI stays finite',()=>{
 let seed=42,old=Math.random;Math.random=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/2**32);try{let g=race({firstCourse:1});for(let i=0;i<160;i++)g.update(1/60,false);let start=g.snapshot().player.y,min=start;g.input(' ',true);g.input(' ',false);for(let i=0;i<28;i++){g.update(1/60,false);min=Math.min(min,g.snapshot().player.y)}assert.ok(start-min>30&&start-min<52,`jump rose ${start-min}`);for(let i=0;i<3600;i++)g.update(1/60,true);assert.ok(g.snapshot().beans.every(b=>Number.isFinite(b.y)))}finally{Math.random=old}
});

test('manual air steering accelerates rather than instantly setting velocity',()=>{const g=race({firstCourse:1});for(let i=0;i<160;i++)g.update(1/60,false);g.input(' ',true);g.input(' ',false);g.update(1/60,false);g.input('ArrowRight',true);const before=g.snapshot().player;g.update(1/60,false);const after=g.snapshot().player;assert.equal(before.ground,false);assert.ok(after.vx>before.vx);assert.ok(after.vx-before.vx<25);g.input('ArrowRight',false);g.update(1/60,false);assert.ok(g.snapshot().player.vx>0,'airborne momentum should persist on release')});

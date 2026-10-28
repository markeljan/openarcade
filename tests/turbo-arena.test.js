import test from 'node:test';
import assert from 'node:assert/strict';
import {soccer} from '../src/feature-games2.js';
const step=(g,n,auto=false)=>{for(let i=0;i<n;i++)g.update(1/60,auto)};
test('boost launches without throttle, consumes fuel, and pads have distinct sizes',()=>{
 const g=soccer(),before=g.snapshot();assert.equal(before.cars[0].boost,34);assert.equal(before.pads.length,8);assert.equal(before.pads.filter(p=>p.big).length,2);
 g.input(' ',true);step(g,30);g.input(' ',false);let after=g.snapshot();assert.ok(after.cars[0].y<before.cars[0].y);assert.ok(after.cars[0].boost<34);assert.ok(Number.isFinite(after.cars[0].vx));
});
test('automatic cars play a complete match and remain finite',()=>{
 const g=soccer();step(g,12000,true);const s=g.snapshot();assert.ok(s.time<180||s.finished);for(const c of s.cars){assert.ok(Number.isFinite(c.x)&&Number.isFinite(c.vx));assert.ok(c.boost>=0&&c.boost<=100)}
});

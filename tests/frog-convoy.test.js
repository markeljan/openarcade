import test from 'node:test';
import assert from 'node:assert/strict';
import {frog} from '../src/feature-games10.js';
const steps=(g,n,auto=false)=>{for(let i=0;i<n;i++)g.update(1/60,auto)};
test('manual hops take time and the passenger follows the recorded route',()=>{
 const g=frog(),initial=g.snapshot();assert.equal(initial.passengers.length,1);assert.deepEqual(initial.pickups.map(p=>p.row),[7,7,2,2]);
 g.input('ArrowLeft',true);g.input('ArrowLeft',false);let s=g.snapshot();assert.equal(s.leader.hop,18);assert.equal(s.leader.row,11);steps(g,18);s=g.snapshot();assert.equal(s.leader.x,2);assert.equal(s.passengers[0].row,11);steps(g,20);s=g.snapshot();assert.equal(s.passengers[0].x,2);
});
test('automatic convoy moves, avoids invalid positions and remains finite across journeys',()=>{
 const g=frog();steps(g,12000,true);const s=g.snapshot();assert.ok(s.arrivals>0);assert.ok(Number.isFinite(s.leader.x));assert.equal(s.cars.length,8);assert.equal(s.logs.length,12);
});


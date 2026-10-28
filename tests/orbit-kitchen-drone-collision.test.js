import test from 'node:test';
import assert from 'node:assert/strict';
import {createKitchen} from '../src/feature-games23.js';
const drone=()=>({x:128,y:250,vx:0,vy:0,state:'approach',timer:2,target:{x:120,y:305,kind:'oven'}});
for(const auto of [false,true])test(`${auto?'AI':'manual'} chef takes an approaching drone collision once during protection`,()=>{
 const g=createKitchen(()=>{},{drones:[drone()]});g.update(1/60,auto);let s=g.snapshot();assert.equal(s.hullDamage,1);assert.ok(s.droneInvuln>1);assert.ok(s.knock.x<0);for(let i=0;i<15;i++)g.update(1/60,auto);assert.equal(g.snapshot().hullDamage,1);
});
test('manual Space intercepts a nearby approaching drone',()=>{const cues=[],g=createKitchen(e=>cues.push(e),{drones:[drone()]});g.input(' ',true);g.input(' ',false);assert.equal(g.snapshot().drones[0].state,'flee');assert.ok(cues.includes('kitchen-intercept'));g.update(1/60,false);assert.equal(g.snapshot().hullDamage,0)});

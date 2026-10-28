import test from 'node:test';
import assert from 'node:assert/strict';
import {fist,fistStomp} from '../src/feature-games18.js';
test('ground stomps deal one damage and shorten the down window; airborne bodies are immune',()=>{
 const e={state:'down',z:7,hp:5,stun:.5};assert.equal(fistStomp(e),false);assert.equal(e.hp,5);e.z=0;assert.equal(fistStomp(e),true);assert.equal(e.hp,4);assert.ok(Math.abs(e.stun-(.5-14/60))<1e-9);assert.equal(fistStomp(e),true);assert.equal(e.hp,3);assert.ok(e.stun<=10/60);assert.equal(e.state,'down');
});
test('manual sweep produces a ballistic knockdown with a grounded recovery window',()=>{
 const g=fist({gateFirst:999});for(let i=0;i<1800;i++){g.update(1/60,false);let s=g.snapshot();if(s.enemies.some(e=>Math.abs(e.x-s.p.x)<28))break}g.input(' ',true);g.input(' ',false);let airborne=false,grounded=false;for(let i=0;i<70;i++){g.update(1/60,false);let e=g.snapshot().enemies[0];if(e?.state==='down'&&e.z>6)airborne=true;if(airborne&&e?.state==='down'&&e.z===0){grounded=true;break}}assert.ok(airborne);assert.ok(grounded);
});

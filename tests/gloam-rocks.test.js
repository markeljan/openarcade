import test from 'node:test';
import assert from 'node:assert/strict';
import {gloam,collideGloamRocks,gloamRocks} from '../src/feature-games38.js';
test('reference island and shoal geometry pushes the hull clear and reflects an approaching boat',()=>{
 assert.deepEqual(gloam().snapshot().relics.map(({x,y})=>[x,y]),[[96,422],[196,244],[130,130]]);
 assert.equal(gloamRocks.length,7);
 const boat={x:94,y:474,vx:-100,vy:0};collideGloamRocks(boat);assert.equal(boat.x,98);assert.ok(boat.vx>0);
 const outward={x:94,y:474,vx:100,vy:0};collideGloamRocks(outward);assert.equal(outward.vx,100);
});

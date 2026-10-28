import test from 'node:test';
import assert from 'node:assert/strict';
import {machineHuntArrowHitsRobot} from '../src/feature-games.js';

test('arrow hitboxes match each machine rectangular reference bounds',()=>{
 for(const [kind,w,h] of [[0,12,16],[1,16,15],[2,20,17],[3,30,22]]){const robot={x:100,y:100,kind};assert.ok(machineHuntArrowHitsRobot({x:100+w-.01,y:100+h-.01},robot));assert.equal(machineHuntArrowHitsRobot({x:100+w,y:100},robot),false);assert.equal(machineHuntArrowHitsRobot({x:100,y:100+h},robot),false)}
});

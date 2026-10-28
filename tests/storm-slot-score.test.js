import test from 'node:test';
import assert from 'node:assert/strict';
import {createStormSlot} from '../src/feature-games31.js';
test('manual sector, lap and draft points exclude preview progress',()=>{const g=createStormSlot();for(let i=0;i<5000;i++)g.update(1/60,true);const before=g.snapshot();assert.ok(before.score>0);assert.equal(before.manualScore,0);for(let i=0;i<5000;i++)g.update(1/60,false);const after=g.snapshot();const sectorPoints=10*(Math.floor(after.cars[0].p*4)-Math.floor(before.cars[0].p*4));assert.ok(sectorPoints>0);assert.equal(after.manualScore,after.score-before.score+sectorPoints);g.reset();assert.equal(g.snapshot().manualScore,0)});

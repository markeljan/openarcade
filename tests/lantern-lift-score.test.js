import test from 'node:test';
import assert from 'node:assert/strict';
import {lift} from '../src/feature-games26.js';
test('only manually delivered passengers contribute to session score',()=>{const g=lift();for(let i=0;i<16000&&g.snapshot().score===0;i++)g.update(.033,true);const before=g.snapshot();assert.ok(before.score>0);assert.equal(before.manualScore,0);for(let i=0;i<16000&&g.snapshot().score===before.score;i++)g.update(.033,false);const after=g.snapshot();assert.ok(after.score>before.score);assert.equal(after.manualScore,after.score-before.score);g.reset();assert.equal(g.snapshot().manualScore,0)});

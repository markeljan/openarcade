import test from 'node:test';
import assert from 'node:assert/strict';
import {createRuneRebound} from '../src/feature-games24.js';
test('preview scoring is excluded from the manual session tally',()=>{const g=createRuneRebound();for(let i=0;i<5000;i++)g.update(1/60,true);const before=g.snapshot();assert.ok(before.score>0);assert.equal(before.manualScore,0);for(let i=0;i<3000;i++)g.update(1/60,false);const after=g.snapshot();assert.ok(after.score>before.score);assert.equal(after.manualScore,after.score-before.score);g.reset();assert.equal(g.snapshot().manualScore,0)});

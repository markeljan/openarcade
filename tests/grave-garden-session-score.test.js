import test from 'node:test';
import assert from 'node:assert/strict';
import { garden } from '../src/feature-games8.js';
test('takeover retains garden progress but excludes preview points from the manual tally',()=>{
 const game=garden();for(let i=0;i<1200;i++)game.update(1/60,true);
 const before=game.snapshot();assert.ok(before.score>0);assert.equal(before.manualScore,0);
 for(let i=0;i<360;i++)game.update(1/60,false);
 const after=game.snapshot();assert.ok(after.score>before.score);assert.equal(after.manualScore,after.score-before.score);assert.ok(after.wave>=before.wave);
 game.reset();assert.equal(game.snapshot().manualScore,0);
});

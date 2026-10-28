import test from 'node:test';
import assert from 'node:assert/strict';
import { bowl } from '../src/feature-games6.js';

test('manual juke adds session points without changing the match score',()=>{
  const game=bowl();game.input(' ',true);game.input(' ',false);game.input('x',true);
  assert.equal(game.snapshot().sessionScore,8);assert.equal(game.snapshot().score,0);
  game.input('x',false);game.reset();assert.equal(game.snapshot().sessionScore,0);
});
test('autoplay does not contribute to the manual session tally',()=>{
  const game=bowl();for(let i=0;i<60*90;i++)game.update(1/60,true);
  assert.equal(game.snapshot().sessionScore,0);
});

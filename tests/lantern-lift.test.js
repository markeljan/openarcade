import test from 'node:test';
import assert from 'node:assert/strict';
import {lift} from '../src/feature-games26.js';
function advance(game,seconds,auto=false){for(let i=0;i<seconds*60;i++)game.update(1/60,auto)}
function until(game,predicate,seconds=50,auto=false){for(let i=0;i<seconds*60;i++){game.update(1/60,auto);if(predicate(game.snapshot()))return true}return false}
test('opening the glacier cable thaws the sheave and rescues both stranded hikers',()=>{
 const game=lift();assert.equal(game.snapshot().passengers.length,1,'two seats are reserved');
 assert.ok(until(game,s=>s.next===3));game.input(' ',true);game.input(' ',false);
 assert.equal(game.snapshot().rescue.phase,'armed');assert.equal(game.snapshot().sheave.phase,'thawing');
 advance(game,.3);assert.equal(game.snapshot().sheave.phase,'thawing');
 advance(game,.4);assert.equal(game.snapshot().sheave.phase,'cleared');
 assert.ok(until(game,s=>s.rescue.phase==='riding'&&s.sheave.survivor==='riding'));
 assert.ok(until(game,s=>s.rescue.phase==='safe'&&s.sheave.survivor==='safe'));
});
test('the AI thaws the line and delivers both glacier passengers',()=>{
 const game=lift();assert.ok(until(game,s=>s.rescue.phase==='safe'&&s.sheave.survivor==='safe',45,true));
 assert.ok(game.snapshot().delivered>=2);
});
test('unanswered exposure causes an avalanche and a later rescue opportunity',()=>{
 const game=lift();advance(game,18.1);assert.equal(game.snapshot().rescue.phase,'lost');assert.equal(game.snapshot().integrity,4);
 advance(game,4.3);assert.equal(game.snapshot().rescue.phase,'stranded');
});

test('manual brake persists after release and answers a warned gust',()=>{
 const game=lift();assert.ok(until(game,s=>s.wind.phase==='warning',4));game.input('x',true);game.input('x',false);
 let s=game.snapshot();assert.equal(s.wind.answered,true);assert.ok(s.brakeTime>.7);advance(game,.4);s=game.snapshot();assert.ok(s.brakeTime>0);assert.ok(s.brakeCooldown>0);
 assert.ok(until(game,s=>s.wind.phase==='gust',2));assert.equal(game.snapshot().wind.answered,true);
});
test('autoplay brakes in response to crosswind warning',()=>{
 const game=lift();assert.ok(until(game,s=>s.wind.phase==='warning'&&s.wind.answered,4,true));assert.ok(game.snapshot().brakeTime>0);
});

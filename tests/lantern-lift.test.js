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
 const game=lift();assert.ok(until(game,s=>s.rescue.phase==='lost',12));assert.equal(game.snapshot().integrity,4);advance(game,250/60+.02);assert.equal(game.snapshot().rescue.phase,'stranded');
});

test('manual brake persists after release and answers a warned gust',()=>{
 const game=lift();assert.ok(until(game,s=>s.wind.phase==='warning',4));game.input('x',true);game.input('x',false);
 let s=game.snapshot();assert.equal(s.wind.answered,true);assert.ok(s.brakeTime>.7);advance(game,.4);s=game.snapshot();assert.ok(s.brakeTime>0);assert.ok(s.brakeCooldown>0);
 assert.ok(until(game,s=>s.wind.phase==='gust',2));assert.equal(game.snapshot().wind.answered,true);
});
test('autoplay brakes in response to crosswind warning',()=>{
 const game=lift();assert.ok(until(game,s=>s.wind.phase==='warning'&&s.wind.answered,4,true));assert.ok(game.snapshot().brakeTime>0);
});

test('directional switch selection overrides the approaching junction',()=>{
 const g=lift();g.input('ArrowUp',true);g.input(' ',true);g.input(' ',false);g.input('ArrowUp',false);assert.deepEqual(g.snapshot().switches,[true,false]);g.input('ArrowDown',true);g.input(' ',true);g.input(' ',false);g.input('ArrowDown',false);assert.deepEqual(g.snapshot().switches,[false,false]);
});
test('braking reduces physical cabin speed and loaded cabin continues along its cable',()=>{
 const g=lift();advance(g,1);const before=g.snapshot();assert.ok(before.cabinSpeed>0);g.input('x',true);g.input('x',false);advance(g,.2);const after=g.snapshot();assert.ok(after.cabinSpeed<before.cabinSpeed);assert.ok(after.progress>before.progress||after.segment!==before.segment);
});

test('glacier deliveries score bonuses and retain passenger identity at the summit',()=>{
 for(const auto of [false,true]){
  const g=lift();
  if(!auto){assert.ok(until(g,s=>s.next===3));g.input(' ',true);g.input(' ',false)}
  assert.ok(until(g,s=>s.rescue.phase==='riding'&&s.sheave.survivor==='riding',45,auto));
  const aboard=g.snapshot().passengers.filter(p=>p.rescue||p.cornice).map(p=>p.id).sort();
  assert.deepEqual(aboard,['cornice-hiker:0','stranded-skier:0']);
  assert.ok(until(g,s=>s.rescue.phase==='safe'&&s.sheave.survivor==='safe',45,auto));
  const delivered=g.snapshot();
  assert.equal(delivered.rescue.lodgeResidents[0].id,'stranded-skier:0');
  assert.equal(delivered.sheave.summitResidents[0].id,'cornice-hiker:0');
  assert.ok(delivered.score>=2*(100+3*30)+180+240);
  assert.ok(until(g,s=>s.rescue.serial===1,10,auto));
  assert.equal(g.snapshot().rescue.lodgeResidents[0].id,'stranded-skier:0');
  g.reset();assert.equal(g.snapshot().score,0);assert.deepEqual(g.snapshot().rescue.lodgeResidents,[]);
 }
});


test('hikers arrive on the reference schedule and use station-specific destinations',()=>{
 const previous=Math.random;Math.random=()=>0;try{const g=lift();advance(g,1);let s=g.snapshot();assert.equal(s.waiting[0].length,1);advance(g,.5);s=g.snapshot();assert.equal(s.waiting[0].length,2);assert.equal(s.waiting[0][1].dest,3);advance(g,165/60-.1);assert.equal(g.snapshot().waiting[0].length,2);advance(g,.15);assert.equal(g.snapshot().waiting[0].length,3);}finally{Math.random=previous}
});

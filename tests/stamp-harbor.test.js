import test from 'node:test';
import assert from 'node:assert/strict';
import {rulesForStamp, stampFaults, stamp} from '../src/feature-games40.js';

const valid = {name:'NIA',face:1,portrait:1,expiry:20,permit:{kind:'WORK',name:'NIA',seal:'A'}};
const press = (game, key) => { game.input(key,true); game.input(key,false); };
function moveTo(game, x, y) {
 for (const [axis, target, negative, positive] of [['x',x,'ArrowLeft','ArrowRight'],['y',y,'ArrowUp','ArrowDown']]) {
  const distance=target-game.snapshot().clerk[axis];
  if (distance) { const key=distance<0?negative:positive; game.input(key,true); game.update(Math.abs(distance)/120,false); game.input(key,false); }
 }
}

test('posted rules add permit, name and seal checks in their respective shifts',()=>{
 const missing={...valid,permit:null}, mismatch={...valid,permit:{kind:'WORK',name:'IVO',seal:'B'}};
 assert.deepEqual(stampFaults(missing,rulesForStamp(0)),[]);
 assert.deepEqual(stampFaults(missing,rulesForStamp(1)),['PERMIT']);
 assert.deepEqual(stampFaults(mismatch,rulesForStamp(1)),[]);
 assert.deepEqual(stampFaults(mismatch,rulesForStamp(2)),['NAME','SEAL']);
 assert.deepEqual(stampFaults({...valid,expiry:11,portrait:0},rulesForStamp(0)),['EXPIRY','PORTRAIT']);
});

test('a manual clerk can inspect, stamp and record all twelve cases across three shifts',()=>{
 const game=stamp();
 for (let i=0;i<12;i++) {
  let state=game.snapshot(); assert.equal(state.phase,'call'); assert.equal(state.shift,Math.floor(i/4));
  moveTo(game,45,510); press(game,' '); assert.equal(game.snapshot().phase,'inspect');
  moveTo(game,112,510); press(game,' '); assert.equal(game.snapshot().phase,'comparing');game.update(.7,false);assert.equal(game.snapshot().checked.passport,true);
  state=game.snapshot(); if(state.rules.permit){moveTo(game,200,510);press(game,' ');game.update(.7,false);assert.equal(game.snapshot().checked.permit,true)}
  state=game.snapshot(); const admit=stampFaults(state.traveler,state.rules).length===0;
  moveTo(game,admit?75:245,590);press(game,admit?'x':'z');assert.equal(game.snapshot().phase,'stamping');game.update(.6,false);assert.equal(game.snapshot().phase,'ledger');
  moveTo(game,270,510);game.update(2,false);press(game,' ');
 }
 assert.equal(game.snapshot().phase,'departure');assert.equal(game.snapshot().score,24);
 moveTo(game,45,510);press(game,' ');assert.equal(game.snapshot().rope,true);
 moveTo(game,245,510);press(game,' ');assert.equal(game.snapshot().signal,true);
 moveTo(game,270,510);press(game,' ');assert.equal(game.snapshot().phase,'complete');
 game.update(10,false);assert.equal(game.snapshot().phase,'complete');game.reset();assert.equal(game.snapshot().phase,'call');
});

test('autoplay completes the same desk workflow and begins another run',()=>{
 const game=stamp();let complete=false,restarted=false;
 for(let i=0;i<24000;i++){game.update(1/60,true);const state=game.snapshot();if(state.phase==='complete'){complete=true;assert.equal(state.score,24)}else if(complete&&state.phase==='call'){restarted=true;break}}
 assert.ok(complete);assert.ok(restarted);
});

test('an incorrect decision incurs the reference five-unit citation',()=>{
 const game=stamp();moveTo(game,45,510);press(game,' ');
 // The first reference case is valid, so refusing it is a citation.
 moveTo(game,245,590);press(game,'z');game.update(.6,false);
 assert.equal(game.snapshot().score,-5);assert.equal(game.snapshot().pending.correct,false);assert.equal(game.snapshot().ledger.length,0);
});


test('comparison, stamp contact and traveler departure gate the ledger',()=>{
 const game=stamp();moveTo(game,45,510);press(game,' ');game.update(.25,false);moveTo(game,112,510);press(game,' ');
 assert.equal(game.snapshot().phase,'comparing');game.update(.4,false);assert.equal(game.snapshot().checked.passport,false);game.update(.04,false);assert.equal(game.snapshot().checked.passport,true);game.update(.2,false);assert.equal(game.snapshot().phase,'inspect');
 moveTo(game,75,590);press(game,'x');assert.equal(game.snapshot().score,0);game.update(.32,false);assert.equal(game.snapshot().score,0);game.update(.02,false);let s=game.snapshot();assert.equal(s.score,2);assert.equal(s.phase,'ledger');assert.equal(s.ledger.length,0);assert.ok(s.pending);assert.ok(s.travelerDeparture);
 game.update(.3,false);moveTo(game,270,510);assert.ok(game.snapshot().travelerDeparture,'traveler should still be departing');press(game,' ');assert.equal(game.snapshot().ordinal,0);assert.equal(game.snapshot().ledger.length,0);assert.equal(game.snapshot().feedback,'WATCH THEM BOARD');game.update(2,false);press(game,' ');s=game.snapshot();assert.equal(s.ledger.length,1);assert.equal(s.ordinal,1);assert.equal(s.pending,null);
});

test('wrongly admitting an expired passport records a citation after departure',()=>{
 const game=stamp();moveTo(game,45,510);press(game,' ');game.update(.3,false);moveTo(game,75,590);press(game,'x');game.update(.6,false);moveTo(game,270,510);game.update(3,false);press(game,' ');
 assert.equal(game.snapshot().ordinal,1);moveTo(game,45,510);press(game,' ');game.update(.3,false);moveTo(game,112,510);press(game,' ');game.update(.7,false);assert.equal(game.snapshot().feedback,'EXPIRY');
 moveTo(game,75,590);press(game,'x');game.update(.6,false);let s=game.snapshot();assert.equal(s.score,-3);assert.equal(s.pending.correct,false);assert.deepEqual(s.pending.faults,['EXPIRY']);assert.equal(s.ledger.length,1);
 moveTo(game,270,510);game.update(3,false);press(game,' ');s=game.snapshot();assert.equal(s.ledger.length,2);assert.equal(s.ledger[1].decision,'ADMIT');assert.deepEqual(s.ledger[1].faults,['EXPIRY']);
});

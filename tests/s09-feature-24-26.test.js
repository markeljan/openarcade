import test from 'node:test';
import assert from 'node:assert/strict';
import {setup} from './s09-scoring-harness.js';
import {createFeatureGame24} from '../src/feature-games24.js';
import {createFeatureGame25} from '../src/feature-games25.js';
import {createFeatureGame26} from '../src/feature-games26.js';
const games=[[createFeatureGame24,'rune-rebound'],[createFeatureGame24,'pocket-regatta'],[createFeatureGame25,'willow-dam'],[createFeatureGame25,'storm-roundup'],[createFeatureGame26,'drift-divers'],[createFeatureGame26,'lantern-lift']];
for(const [make,id] of games) test(`${id} reports fresh human and AI 120-second rounds`,t=>{
 const h=setup(t,{seed:42}),w=h.make(make,id,{interactive:true});h.frame();h.advance(120.1);assert.equal(w.results.length,1);const human=w.results[0][0];assert.equal(human.actor,'human');assert.equal(human.durationMs,120000);assert.equal(human.context,'manual-player');assert.equal(w.game.getSessionState(),'result');assert.ok(Number.isInteger(human.score)&&human.score>=0);assert.ok(w.labels.some(s=>s.includes('ROUND COMPLETE')));
 w.game.beginRun({interactive:false,context:'gallery-preview'});h.frame();h.advance(120.1);assert.equal(w.results.length,2);const ai=w.results[1][0];assert.equal(ai.actor,'ai');assert.equal(ai.durationMs,120000);assert.equal(ai.submissionEligible,false);assert.notEqual(ai.runId,human.runId);assert.ok(ai.score>0,`${id} AI earned ${ai.score}`);
});
test('pause, restart, actor changes and destruction isolate runs',t=>{
 const h=setup(t),w=h.make(createFeatureGame24,'rune-rebound',{interactive:true});h.frame();h.advance(60);w.game.pause();h.advance(100);assert.equal(w.results.length,0);w.game.resume();h.frame();h.advance(30);w.game.restart();h.frame();h.advance(100);assert.equal(w.results.length,0);w.game.setInteractive(false);h.frame();h.advance(120.1);assert.equal(w.results.length,1);assert.equal(w.results[0][0].actor,'ai');assert.equal(w.results[0][0].context,'watch-player');w.game.destroy();h.advance(150);assert.equal(w.results.length,1);
});
test('synchronous restart from result callback remains live',t=>{
 const h=setup(t);let player;const w=h.make(createFeatureGame25,'storm-roundup',{interactive:true,onResult(){player.restart()}});player=w.game;h.frame();h.advance(120.1);assert.equal(w.results.length,1);assert.equal(player.getSessionState(),'playing');h.advance(120.1);assert.equal(w.results.length,2);
});
test('callback pause and resume maintains a single animation chain',t=>{
 const h=setup(t);let player;const w=h.make(createFeatureGame26,'lantern-lift',{interactive:true,onResult(){player.pause();player.resume();player.restart()}});player=w.game;h.frame();h.advance(120.1);assert.equal(w.results.length,1);assert.equal(h.scheduled.size,1);h.advance(120.1);assert.equal(w.results.length,2);assert.equal(h.scheduled.size,1);
});
test('result cards expire into a fresh AI run with the correct context',t=>{
 const h=setup(t);let attracted=0;const w=h.make(createFeatureGame24,'rune-rebound',{interactive:true,onAttract(){attracted++}});h.frame();h.advance(120.1);h.advance(12.1);assert.equal(attracted,1);assert.equal(w.game.getSessionState(),'playing');h.advance(120.1);assert.equal(w.results.length,2);assert.equal(w.results[1][0].context,'watch-player');assert.equal(w.results[1][0].actor,'ai');h.advance(1.6);assert.equal(w.game.getSessionState(),'playing');
});
for(const [make,id] of games) test(`${id} preserves embed context through takeover and expiry`,t=>{
 const h=setup(t),w=h.make(make,id,{interactive:false,context:'embed'});h.frame();w.game.setInteractive(true);h.frame();h.advance(120.1);assert.equal(w.results[0][0].context,'embed');assert.equal(w.results[0][0].actor,'human');h.advance(12.1);h.advance(120.1);assert.equal(w.results[1][0].context,'embed');assert.equal(w.results[1][0].actor,'ai');w.game.setInteractive(true);h.frame();h.advance(120.1);assert.equal(w.results[2][0].context,'embed');assert.equal(w.results[2][0].actor,'human');
});
test('paused actions do not affect the subsequent round',t=>{
 const h=setup(t),w=h.make(createFeatureGame24,'rune-rebound',{interactive:true});h.frame();w.game.pause();w.press('ArrowUp');w.press('ArrowDown');h.advance(10);w.game.resume();h.frame();assert.ok(w.labels.some(label=>label.includes('MANA 3')));h.advance(120.1);assert.equal(w.results.length,1);assert.equal(w.results[0][0].durationMs,120000);
});
for(const [make,id] of games) test(`${id} ignores stale frame after pause and resume`,t=>{
 const h=setup(t),w=h.make(make,id,{interactive:true});h.frame();const [stale]=h.pendingCallbacks();w.game.pause();w.game.resume();assert.equal(h.scheduled.size,1);h.invoke(stale);assert.equal(h.scheduled.size,1);h.advance(120.1);assert.equal(w.results.length,1);assert.equal(w.results[0][0].durationMs,120000);
});
for(const [make,id] of games) test(`${id} Enter starts a fresh human round from result`,t=>{
 const h=setup(t),w=h.make(make,id,{interactive:true});h.frame();h.advance(120.1);assert.equal(w.results.length,1);const previous=w.results[0][0].runId;w.press('Enter');assert.equal(w.game.getSessionState(),'playing');h.frame();h.advance(120.1);assert.equal(w.results.length,2);assert.equal(w.results[1][0].actor,'human');assert.notEqual(w.results[1][0].runId,previous);
});

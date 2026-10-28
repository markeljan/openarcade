import test from 'node:test';
import assert from 'node:assert/strict';
import {beacon} from '../src/feature-games19.js';
function step(game,seconds,auto=false){for(let i=0;i<seconds*60;i++)game.update(1/60,auto)}
function press(game,key){game.input(key,true);game.input(key,false)}
test('only the matching bell signals a vessel, and the signal expires',()=>{
 const old=Math.random;Math.random=()=>0;try{const game=beacon();step(game,4.1);assert.equal(game.snapshot().bells.length,3);game.input('ArrowUp',true);step(game,.9);game.input('ArrowUp',false);press(game,'z');assert.equal(game.snapshot().boats[0].signalT,0);game.input('ArrowLeft',true);step(game,.95);game.input('ArrowLeft',false);press(game,'z');assert.ok(game.snapshot().boats[0].signalT>4);step(game,4.1);assert.equal(game.snapshot().boats[0].signalT,0)}finally{Math.random=old}
});
test('AI signals ships and safely pilots an escort through the channel',()=>{
 const old=Math.random;let seed=42;Math.random=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/2**32);try{const game=beacon();step(game,120,true);let state=game.snapshot();assert.ok(state.score>0);assert.ok(state.convoys>0,'escort reaches a dock after a lit channel crossing')}finally{Math.random=old}
});

test('beam turns only at the crank and storm warning requires a bell',()=>{
 const game=beacon();game.input('x',true);game.input('ArrowRight',true);step(game,.2);game.input('ArrowRight',false);game.input('x',false);const turned=game.snapshot().angle;assert.ok(turned>0);
 game.input('ArrowUp',true);step(game,.9);game.input('ArrowUp',false);game.input('x',true);game.input('ArrowLeft',true);step(game,.2);game.input('ArrowLeft',false);game.input('x',false);assert.equal(game.snapshot().angle,turned);
 game.input('ArrowDown',true);step(game,.9);game.input('ArrowDown',false);step(game,18);press(game,'Shift');assert.equal(game.snapshot().warn,0);game.input('ArrowUp',true);step(game,.9);game.input('ArrowUp',false);press(game,'Shift');assert.ok(game.snapshot().warn>0);
});

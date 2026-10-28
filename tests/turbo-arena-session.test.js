import test from 'node:test';
import assert from 'node:assert/strict';
import { soccer, soccerGoalEndsMatch } from '../src/feature-games2.js';
test('seventh goal or any overtime goal ends the match',()=>{assert.equal(soccerGoalEndsMatch(6,false),false);assert.equal(soccerGoalEndsMatch(7,false),true);assert.equal(soccerGoalEndsMatch(1,true),true)});
test('Enter restarts a completed manual match with a fresh clock and score',()=>{let seed=42;const original=Math.random;Math.random=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/2**32);try{const game=soccer();for(let i=0;i<18000&&!game.snapshot().finished;i++)game.update(1/60,false);assert.ok(game.snapshot().finished);game.input('Enter',true);const state=game.snapshot();assert.equal(state.finished,false);assert.deepEqual(state.score,[0,0]);assert.equal(state.time,180)}finally{Math.random=original}});

import test from 'node:test';
import assert from 'node:assert/strict';
import {conductor} from '../src/feature-games23.js';

test('manual conductor must select the expected section on its beat',()=>{
  const game=conductor();game.input(' ',true);assert.equal(game.snapshot().discord,1);
  game.input('ArrowLeft',true);for(let i=0;i<30;i++)game.update(.02,false);game.input('ArrowLeft',false);
  while(game.snapshot().due>.04)game.update(.02,false);game.input(' ',true);
  const state=game.snapshot();assert.equal(state.settled,true);assert.equal(state.mask,1);assert.equal(state.discord,0);
});
test('AI cues all sections and conducts through multiple stages',()=>{
  const game=conductor();for(let i=0;i<6000;i++)game.update(.02,true);
  const state=game.snapshot();assert.ok(state.phrases>=8,`only ${state.phrases} phrases`);assert.equal(state.stage,2);assert.ok(state.score>0);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import {conductor} from '../src/feature-games23.js';

test('manual conductor must select the expected section on its beat',()=>{
  const game=conductor();game.input(' ',true);game.update(1/60,false);game.input(' ',false);assert.equal(game.snapshot().discord,1);
  game.input('ArrowLeft',true);for(let i=0;i<30;i++)game.update(.02,false);game.input('ArrowLeft',false);
  while(game.snapshot().due>.04)game.update(.02,false);game.input(' ',true);game.update(1/60,false);game.input(' ',false);
  const state=game.snapshot();assert.equal(state.settled,true);assert.equal(state.mask,1);assert.equal(state.discord,0);
});
test('AI cues all sections and conducts through multiple stages',()=>{
  const game=conductor();for(let i=0;i<6000;i++)game.update(.02,true);
  const state=game.snapshot();assert.ok(state.phrases>=8,`only ${state.phrases} phrases`);assert.equal(state.stage,2);assert.ok(state.score>0);
});


test('held cue samples on frames, repeats every thirteen frames and brief taps are missed',()=>{
 const frames=[];let frame=0;const g=conductor(e=>{if(e==='miss')frames.push(frame)});g.input(' ',true);g.input(' ',false);g.update(1/60,false);assert.equal(g.snapshot().discord,0);g.input(' ',true);for(frame=1;frame<=40;frame++)g.update(1/60,false);assert.deepEqual(frames,[1,14,27,40]);
});
test('held dampen suppresses simultaneous crescendo and cue even when it cannot counter a shade',()=>{
 const g=conductor();g.input('x',true);g.input('z',true);g.input(' ',true);g.update(1/60,false);assert.equal(g.snapshot().discord,0);for(let i=0;i<15;i++)g.update(1/60,false);assert.equal(g.snapshot().discord,0);
});
test('manual and AI simulations match at 30Hz and 60Hz',()=>{
 for(const auto of [false,true]){const run=hz=>{const cues=[],g=conductor((...e)=>cues.push(e));if(!auto){g.input('ArrowLeft',true);g.input(' ',true)}for(let i=0;i<hz*40;i++)g.update(1/hz,auto);return {state:g.snapshot(),cues}};const a=run(30),b=run(60);assert.deepEqual(a,b);if(auto)assert.ok(a.state.phrases>0);else assert.ok(a.cues.some(e=>e[0]==='miss'))}
});
test('reset clears fractional simulation time',()=>{const g=conductor();g.input('ArrowLeft',true);g.update(1/120,false);g.reset();g.input('ArrowLeft',true);g.update(1/120,false);assert.equal(g.snapshot().p.x,120);g.update(1/120,false);assert.ok(g.snapshot().p.x<120)});


test('shade counter requires source-scaled horizontal and vertical reach',()=>{
 const run=y=>{const g=conductor();g.input('ArrowRight',true);for(let i=0;i<30;i++)g.update(1/60,false);g.input('ArrowRight',false);g.input('ArrowDown',true);for(let i=0;i<(y===460?40:20);i++)g.update(1/60,false);g.input('ArrowDown',false);for(let i=0;i<600&&!g.snapshot().shade;i++)g.update(1/60,false);const before=g.snapshot();assert.ok(before.shade);assert.equal(before.shade.target,2);g.input('x',true);g.update(1/60,false);return g.snapshot()};
 const far=run(460),near=run(430);assert.ok(far.shade,'counter below y=438 must not reach shade');assert.equal(far.counterpoint.cooled,0);assert.equal(near.shade,null);assert.equal(near.counterpoint.cooled,1);
});

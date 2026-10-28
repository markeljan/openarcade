import test from 'node:test';
import assert from 'node:assert/strict';
import {phase,createHearthGame} from '../src/feature-games37.js';

test('Phase Foundry manual actions and sentry failure emit their cues',()=>{
 const events=[],g=phase(e=>events.push(e));g.input('x',true);g.input(' ',true);
 for(let i=0;i<300&&g.snapshot().attempts===0;i++)g.update(1/60,false);
 assert.ok(events.includes('phase-link'));assert.ok(events.includes('phase-jump'));
 assert.ok(events.includes('phase-warning'));assert.ok(events.includes('phase-fail'));
});
test('Phase Foundry AI cues include transfers, plate and relay payoff',()=>{
 const events=[],g=phase(e=>events.push(e));for(let i=0;i<12000&&!g.snapshot().complete;i++)g.update(1/60,true);
 for(const cue of ['phase-pickup','phase-transfer','phase-release','phase-plate','phase-exit','phase-divert','phase-receiver','phase-garden'])assert.ok(events.includes(cue),cue);
 assert.equal(events.filter(e=>e==='phase-exit').length,3);
});
test('Hearthbound AI work, defense and rescue emit cues at gameplay events',()=>{
 const events=[],g=createHearthGame(e=>events.push(e));for(let i=0;i<15000&&!g.snapshot().rescued;i++)g.update(1/60,true);
 assert.ok(g.snapshot().rescued);
 for(const cue of ['hearth-timber','hearth-stoke','hearth-hit','hearth-raid-repelled','hearth-medicine','hearth-bandage','hearth-flood-warning','hearth-beacon','hearth-rescue'])assert.ok(events.includes(cue),cue);
 assert.equal(events.filter(e=>e==='hearth-rescue').length,1);
});
test('Hearthbound manual timber installation produces its construction cue',()=>{
 const events=[],g=createHearthGame(e=>events.push(e));
 function move(x,y){for(let i=0;i<600;i++){const p=g.snapshot().people[0],dx=x-p.x,dy=y-p.y;if(Math.hypot(dx,dy)<20)break;for(const [k,on] of [['ArrowLeft',dx< -3],['ArrowRight',dx>3],['ArrowUp',dy< -3],['ArrowDown',dy>3]])g.input(k,on);g.update(.02,false)}for(const k of ['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'])g.input(k,false)}
 function act(){g.input(' ',true);for(let i=0;i<25;i++)g.update(.02,false);g.input(' ',false)}
 move(50,222);act();assert.equal(g.snapshot().people[0].carry,'wood');move(86,318);act();
 assert.ok(g.snapshot().buildings.shelter.wood>0);assert.ok(events.includes('hearth-timber'));
});

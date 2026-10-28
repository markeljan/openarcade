import test from 'node:test';
import assert from 'node:assert/strict';
import {conductor} from '../src/feature-games23.js';
function tickUntil(g,p){for(let i=0;i<1000&&!p(g.snapshot());i++)g.update(.01,false);assert.ok(p(g.snapshot()))}
function aim(g,x){let s=g.snapshot();let k=x<s.p.x?'ArrowLeft':'ArrowRight';g.input(k,true);tickUntil(g,s=>Math.abs(s.p.x-x)<2);g.input(k,false)}
function cue(g,x){aim(g,x);tickUntil(g,s=>s.shade||s.due<.16);if(g.snapshot().shade){g.input('x',true);g.update(1/60,false);g.input('x',false)}tickUntil(g,s=>Math.abs(s.due)<.04&&!s.settled);g.input(' ',true);g.update(1/60,false);g.input(' ',false)}
test('manual successive sections sustain a counterpoint and crescendo lights a lamp',()=>{const g=conductor();cue(g,45);let s=g.snapshot();assert.equal(s.counterpoint.lead,0);assert.ok(s.sections[0].sustain>0);cue(g,120);s=g.snapshot();assert.equal(s.counterpoint.ready,true);assert.equal(s.sections[1].pitch,(s.sections[0].pitch+3)%7);cue(g,195);for(let i=0;i<25;i++)g.update(.01,false);g.input('z',true);g.update(1/60,false);g.input('z',false);s=g.snapshot();assert.equal(s.counterpoint.lamps,1);assert.equal(s.phrases,1);assert.equal(s.counterpoint.ready,false)});
test('unanswered shade heats and mutes its section while AI cools shades and lights lamps',()=>{let g=conductor();for(let i=0;i<400;i++)g.update(.01,false);let s=g.snapshot();assert.ok(s.sections.some(x=>x.heat>0));g=conductor();for(let i=0;i<5000;i++)g.update(.02,true);s=g.snapshot();assert.ok(s.counterpoint.cooled>0);assert.ok(s.counterpoint.lamps>0)});

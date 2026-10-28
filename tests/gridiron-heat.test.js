import test from 'node:test';
import assert from 'node:assert/strict';
import {bowl} from '../src/feature-games6.js';
const advance=(g,n,auto=false)=>{for(let i=0;i<n;i++)g.update(1/60,auto)};
test('manual turbo heats from 18 at reference rate and stalls',()=>{const cues=[],g=bowl(c=>cues.push(c));assert.equal(g.snapshot().heat,18);g.input(' ',true);g.input('ArrowUp',true);advance(g,60);assert.ok(Math.abs(g.snapshot().heat-69)<1e-8);advance(g,37);assert.ok(g.snapshot().stall>1);assert.ok(cues.includes('bowl-stall'));});
test('airborne manual bike does not gain turbo heat',()=>{const g=bowl();g.input(' ',true);g.input('ArrowUp',true);g.input(' ',true);const before=g.snapshot().heat;advance(g,20);assert.equal(g.snapshot().heat,before)});
test('AI races with heat and survives multiple plays',()=>{const g=bowl();advance(g,5000,true);const s=g.snapshot();assert.ok(s.matchClock>80);assert.ok(s.yard>20||s.score>0||s.down>1);assert.ok(s.heat>=0&&s.heat<=102)});

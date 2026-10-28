import test from 'node:test';
import assert from 'node:assert/strict';
import {createOrchardWardens} from '../src/feature-games22.js';
test('manual tally excludes preview progress and records subsequent actions',()=>{const g=createOrchardWardens();for(let i=0;i<4000;i++)g.update(.05,true);const before=g.snapshot();assert.ok(before.score>0);assert.equal(before.manualScore,0);for(let i=0;i<100;i++)g.update(.05,false);const after=g.snapshot();assert.equal(after.manualScore,after.score-before.score);g.reset();assert.equal(g.snapshot().manualScore,0)});
test('manual graft awards 40 points',()=>{const g=createOrchardWardens();const walk=(k,n)=>{g.input(k,true);for(let i=0;i<n;i++)g.update(.05*100/261.6,false);g.input(k,false)},act=()=>{g.input(' ',true);g.update(.25,false);g.input(' ',false)};walk('ArrowLeft',22);walk('ArrowDown',8);act();walk('ArrowUp',25);walk('ArrowRight',8);act();assert.equal(g.snapshot().manualScore,40)});

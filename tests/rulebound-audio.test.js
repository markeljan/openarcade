import test from 'node:test';
import assert from 'node:assert/strict';
import {createRuleboundPuzzle} from '../src/feature-games35.js';
const press=(g,k)=>{g.input(k,true);g.update(.001,false);g.input(k,false);g.update(22/60-.001,false)};
test('Rulebound emits movement, rule, undo and restart cues at their event boundaries',()=>{
 const sounds=[],game=createRuleboundPuzzle({seed:0,onSound:s=>sounds.push(s)});game.input('ArrowUp',true);game.update(.001,false);game.input('ArrowUp',false);assert.deepEqual(sounds,[]);game.update(22/60-.001,false);assert.deepEqual(sounds,['rule-word-push','rule-gate-open']);press(game,'x');assert.equal(sounds.at(-1),'rule-undo');press(game,'z');assert.equal(sounds.at(-1),'rule-restart');
});
test('moth cues mark danger, dodge, strike and automatic recovery',()=>{
 const sounds=[],game=createRuleboundPuzzle({page:1,seed:0,onSound:s=>sounds.push(s)});press(game,'ArrowRight');press(game,'ArrowLeft');press(game,'ArrowRight');assert.deepEqual(sounds,['rule-ink-warning','rule-ink-dodge','rule-ink-splat']);game.update(.4+22/60,false);assert.equal(sounds.at(-1),'rule-undo');
});
test('AI emits a chapter-completion cue without solver search side effects',()=>{
 const sounds=[],game=createRuleboundPuzzle({seed:0,onSound:s=>sounds.push(s)});for(let i=0;i<1000&&!game.snapshot().won;i++)game.update(.1,true);assert.equal(game.snapshot().won,true);assert.equal(sounds.filter(s=>s==='rule-chapter-complete').length,1);assert.ok(sounds.includes('rule-gate-open'));
});

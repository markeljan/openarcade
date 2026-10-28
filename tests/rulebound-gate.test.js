import test from 'node:test';
import assert from 'node:assert/strict';
import {createRuleboundPuzzle,ruleboundRules,ruleboundTransition} from '../src/feature-games35.js';
const press=(game,key)=>{game.input(key,true);game.update(.001,false);game.input(key,false);game.update(22/60-.001,false)};

test('Orchard Gate opens only after pushing OPEN, supports undo and completes at the star',()=>{
 const game=createRuleboundPuzzle({seed:0});let state=game.snapshot();assert.ok(ruleboundRules(state).has('STAR_WIN'));assert.ok(!ruleboundRules(state).has('GATE_OPEN'));
 press(game,'ArrowUp');state=game.snapshot();assert.ok(ruleboundRules(state).has('GATE_OPEN'));assert.deepEqual(state.words[0],{x:2,y:5,label:'OPEN'});
 press(game,'x');assert.ok(!ruleboundRules(game.snapshot()).has('GATE_OPEN'));
 press(game,'ArrowUp');for(const key of ['ArrowRight','ArrowUp','ArrowUp','ArrowLeft','ArrowUp','ArrowUp','ArrowRight','ArrowRight','ArrowUp'])press(game,key);
 assert.equal(game.snapshot().won,true,'the authored gate route should reach the star');
 game.input('x',true);game.input('x',false);game.input('z',true);game.input('z',false);game.update(.49,false);assert.equal(game.snapshot().won,true,'winning page remains visible');game.update(.01,false);assert.equal(game.snapshot().chapter,1,'winning page advances after 30 frames');
});

test('rule parser supports vertical and horizontal OPEN, PUSH, WIN and SAFE and changes collision',()=>{
 const base={p:{x:0,y:4},fixed:[{x:0,y:0,label:'GATE'},{x:1,y:0,label:'IS'},{x:2,y:0,label:'OPEN'},{x:3,y:0,label:'BOX'},{x:3,y:1,label:'IS'},{x:3,y:2,label:'PUSH'},{x:0,y:6,label:'INK'},{x:1,y:6,label:'IS'},{x:2,y:6,label:'SAFE'},{x:4,y:4,label:'STAR'},{x:4,y:5,label:'IS'},{x:4,y:6,label:'WIN'}],words:[],objects:[{x:1,y:4,kind:'GATE'},{x:2,y:4,kind:'BOX'},{x:4,y:3,kind:'STAR'}],walls:[],ink:[{x:0,y:5}],won:false};
 const rules=ruleboundRules(base);for(const key of ['GATE_OPEN','BOX_PUSH','INK_SAFE','STAR_WIN'])assert.ok(rules.has(key),key);
 let next=ruleboundTransition(base,1,0);assert.deepEqual(next.p,{x:1,y:4});next=ruleboundTransition(next,1,0);assert.deepEqual(next.objects.find(o=>o.kind==='BOX'),{x:3,y:4,kind:'BOX'});
 assert.ok(ruleboundTransition(base,0,1),'safe ink can be crossed');const unsafe={...base,fixed:base.fixed.filter(w=>w.label!=='SAFE')};assert.equal(ruleboundTransition(unsafe,0,1),null);
 const closed={...base,fixed:base.fixed.filter(w=>w.label!=='OPEN')};assert.equal(ruleboundTransition(closed,1,0),null);
 const atStar={...base,p:{x:3,y:3}};assert.equal(ruleboundTransition(atStar,1,0).won,true);
});

test('autoplay solves the authored gate using the same transition rules',()=>{
 const game=createRuleboundPuzzle({seed:0});for(let n=0;n<1000&&!game.snapshot().won;n++)game.update(.1,true);assert.equal(game.snapshot().won,true);game.update(.8,true);assert.equal(game.snapshot().chapter,1);assert.deepEqual(game.snapshot().p,{x:0,y:6});
});

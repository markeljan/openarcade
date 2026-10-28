import test from 'node:test';
import assert from 'node:assert/strict';
import {createRuleboundPuzzle,ruleboundRules} from '../src/feature-games35.js';
const press=(game,key)=>{game.input(key,true);game.update(.001,false);game.input(key,false);game.update(22/60-.001,false)};

test('library page forms BOX IS PUSH and undo restores its rule',()=>{
 const game=createRuleboundPuzzle({page:1,seed:0});for(const key of ['ArrowUp','ArrowUp','ArrowUp'])press(game,key);
 assert.ok(ruleboundRules(game.snapshot()).has('BOX_PUSH'));press(game,'x');assert.ok(!ruleboundRules(game.snapshot()).has('BOX_PUSH'));press(game,'z');assert.deepEqual(game.snapshot().p,{x:0,y:6});
});

test('ink page makes ink safe and allows crossing',()=>{
 const game=createRuleboundPuzzle({page:4,seed:0});for(const key of ['ArrowLeft','ArrowUp','ArrowUp','ArrowUp'])press(game,key);
 assert.ok(ruleboundRules(game.snapshot()).has('INK_SAFE'));press(game,'ArrowRight');assert.deepEqual(game.snapshot().p,{x:1,y:3});
});

test('moth marks a position, strikes a return, and supports undo',()=>{
 const game=createRuleboundPuzzle({page:1,seed:0});press(game,'ArrowRight');assert.deepEqual(game.snapshot().mothTarget,{x:1,y:6});press(game,'ArrowLeft');press(game,'ArrowRight');assert.equal(game.snapshot().dead,true);press(game,'x');assert.equal(game.snapshot().dead,false);assert.deepEqual(game.snapshot().p,{x:0,y:6});
});

for(let page=0;page<6;page++)test(`AI solves authored page ${page+1} and proceeds`,()=>{
 const game=createRuleboundPuzzle({page,seed:0});for(let i=0;i<500&&!game.snapshot().won;i++)game.update(.3,true);const state=game.snapshot();assert.equal(state.won,true,`page ${page+1} should be solvable`);if(page===5)assert.ok(ruleboundRules(state).has('BOX_WIN'),'last page should use the reachable box');game.update(1,true);assert.equal(game.snapshot().chapter,(page+1)%6);
});

test('blocked and idle turns advance the moth warning and undo or restart safely',()=>{
 const game=createRuleboundPuzzle({page:1,seed:0});press(game,'ArrowLeft');assert.equal(game.snapshot().mothPhase,1);assert.deepEqual(game.snapshot().mothTarget,{x:0,y:6});
 game.update(.01,false);game.update(.37,false);assert.equal(game.snapshot().mothPhase,2);game.update(.01,false);game.update(.37,false);assert.equal(game.snapshot().dead,true);
 game.update(.9,false);assert.equal(game.snapshot().dead,false);assert.equal(game.snapshot().mothPhase,0);
});

test('moth and its warning marker are visibly rendered',()=>{
 const game=createRuleboundPuzzle({page:1,seed:0});press(game,'ArrowRight');const labels=[];let strokes=0;const noop=()=>{};
 const ctx=new Proxy({fillText(value){labels.push(value)},stroke(){strokes++}}, {get:(o,k)=>o[k]??noop,set:(o,k,v)=>(o[k]=v,true)});game.draw(ctx);assert.ok(labels.includes('!'));assert.ok(strokes>0,'marked tile should have a visible outline');
});

for(const mirror of [false,true])for(const seed of [0,1])test(`AI solves all pages with seed ${seed} and ${mirror?'mirrored':'normal'} layouts`,()=>{
 for(let page=0;page<6;page++){
  const game=createRuleboundPuzzle({page,seed,mirror});for(let i=0;i<350&&!game.snapshot().won;i++)game.update(.3,true);assert.equal(game.snapshot().won,true,`page ${page+1}, seed ${seed}, mirror ${mirror}`);
 }
});

test('mirrored pages read horizontal rules right-to-left and restart consistently',()=>{
 const game=createRuleboundPuzzle({seed:1,mirror:true});const start=game.snapshot();assert.deepEqual(start.p,{x:0,y:7});assert.ok(ruleboundRules(start).has('STAR_WIN'));
 press(game,'ArrowLeft');press(game,'z');assert.deepEqual(game.snapshot().p,start.p);assert.equal(game.snapshot().mirror,true);
});

test('a completed book keeps its orientation and alternates the start',()=>{
 const game=createRuleboundPuzzle({seed:0});for(let i=0;i<3000&&game.snapshot().completed<6;i++)game.update(.3,true);
 const state=game.snapshot();assert.equal(state.completed,6);assert.equal(state.chapter,0);assert.equal(state.mirror,false);assert.deepEqual(state.p,{x:4,y:7});assert.ok(ruleboundRules(state).has('STAR_WIN'));
});

test('holding a direction repeats on turns and release stops movement',()=>{
 const game=createRuleboundPuzzle({seed:1});game.input('ArrowLeft',true);game.update(.001,false);
 assert.deepEqual(game.snapshot().p,{x:4,y:7});game.update(22/60-.001,false);assert.deepEqual(game.snapshot().p,{x:3,y:7});game.update(.01,false);game.update(22/60-.01,false);assert.deepEqual(game.snapshot().p,{x:2,y:7});game.input('ArrowLeft',false);game.update(22/60,false);assert.deepEqual(game.snapshot().p,{x:2,y:7});
});

test('pushed word interpolates over a reference-length turn',()=>{
 const game=createRuleboundPuzzle({seed:0});game.input('ArrowUp',true);game.update(.001,false);game.input('ArrowUp',false);const read=()=>{let open;const ctx=new Proxy({fillText(label,x,y){if(label==='OPEN')open={x,y}}},{get:(o,k)=>o[k]??(()=>{}),set:(o,k,v)=>(o[k]=v,true)});game.draw(ctx);return open.y};
 assert.ok(Math.abs(read()-495)<.2);game.update(11/60-.001,false);assert.equal(read(),467);game.update(11/60,false);assert.equal(read(),439);
});

test('rule change commits at landing and held input is sampled at the next turn',()=>{
 const game=createRuleboundPuzzle({seed:0});game.input('ArrowUp',true);game.update(.001,false);game.update(11/60,false);assert.deepEqual(game.snapshot().p,{x:2,y:7});assert.ok(!ruleboundRules(game.snapshot()).has('GATE_OPEN'));game.input('ArrowRight',true);game.input('ArrowUp',false);game.update(11/60,false);assert.deepEqual(game.snapshot().p,{x:2,y:6});assert.ok(ruleboundRules(game.snapshot()).has('GATE_OPEN'));game.update(.01,false);game.input('ArrowRight',false);game.update(22/60,false);assert.deepEqual(game.snapshot().p,{x:3,y:6});
});

test('an idle turn samples a held direction at its boundary',()=>{
 const game=createRuleboundPuzzle({seed:0});game.update(.001,false);game.input('ArrowUp',true);game.update(11/60,false);assert.deepEqual(game.snapshot().p,{x:2,y:7});game.update(11/60,false);assert.deepEqual(game.snapshot().p,{x:2,y:7});game.update(.001,false);game.input('ArrowUp',false);game.update(22/60,false);assert.deepEqual(game.snapshot().p,{x:2,y:6});assert.ok(ruleboundRules(game.snapshot()).has('GATE_OPEN'));
});
test('a direction released before the idle boundary does not start a move',()=>{
 const game=createRuleboundPuzzle({seed:0});game.update(.001,false);game.input('ArrowUp',true);game.update(.05,false);game.input('ArrowUp',false);game.update(22/60,false);game.update(.001,false);game.update(22/60,false);assert.deepEqual(game.snapshot().p,{x:2,y:7});assert.ok(!ruleboundRules(game.snapshot()).has('GATE_OPEN'));
});

test('fractional time carries into the next turn regardless of update chunking',()=>{
 const a=createRuleboundPuzzle({seed:1}),b=createRuleboundPuzzle({seed:1});a.input('ArrowLeft',true);b.input('ArrowLeft',true);a.update(.75,false);for(let i=0;i<3;i++)b.update(.25,false);assert.deepEqual(a.snapshot().p,b.snapshot().p);assert.deepEqual(a.snapshot().p,{x:2,y:7});a.input('ArrowLeft',false);b.input('ArrowLeft',false);a.update(22/60-.75% (22/60),false);b.update(22/60-.75% (22/60),false);assert.deepEqual(a.snapshot().p,b.snapshot().p);assert.deepEqual(a.snapshot().p,{x:1,y:7});
});

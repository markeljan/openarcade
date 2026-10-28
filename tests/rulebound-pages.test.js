import test from 'node:test';
import assert from 'node:assert/strict';
import {createRuleboundPuzzle,ruleboundRules} from '../src/feature-games35.js';
const press=(game,key)=>{game.input(key,true);game.update(1/60,false);game.input(key,false);game.update(21/60,false)};

test('library page forms BOX IS PUSH and undo restores its rule',()=>{
 const game=createRuleboundPuzzle({page:1,seed:0});for(const key of ['ArrowUp','ArrowUp','ArrowUp'])press(game,key);
 assert.ok(ruleboundRules(game.snapshot()).has('BOX_PUSH'));press(game,'x');assert.ok(!ruleboundRules(game.snapshot()).has('BOX_PUSH'));press(game,'z');assert.deepEqual(game.snapshot().p,{x:0,y:6});
});

test('ink page makes ink safe and allows crossing',()=>{
 const game=createRuleboundPuzzle({page:4,seed:0});for(const key of ['ArrowLeft','ArrowUp','ArrowUp','ArrowUp'])press(game,key);
 assert.ok(ruleboundRules(game.snapshot()).has('INK_SAFE'));press(game,'ArrowRight');assert.deepEqual(game.snapshot().p,{x:1,y:3});
});

test('moth strikes a return, waits, and automatically undoes',()=>{
 const game=createRuleboundPuzzle({page:1,seed:0});press(game,'ArrowRight');assert.deepEqual(game.snapshot().mothTarget,{x:1,y:6});press(game,'ArrowLeft');press(game,'ArrowRight');assert.equal(game.snapshot().dead,true);game.input('x',true);game.input('x',false);game.input('z',true);game.input('z',false);game.update(.39,false);assert.equal(game.snapshot().dead,true);game.update(.01,false);game.update(22/60,false);assert.equal(game.snapshot().dead,false);assert.deepEqual(game.snapshot().p,{x:0,y:6});
});

for(let page=0;page<6;page++)test(`AI solves authored page ${page+1} and proceeds`,()=>{
 const game=createRuleboundPuzzle({page,seed:0});for(let i=0;i<500&&!game.snapshot().won;i++)game.update(.3,true);const state=game.snapshot();assert.equal(state.won,true,`page ${page+1} should be solvable`);if(page===5)assert.ok(ruleboundRules(state).has('BOX_WIN'),'last page should use the reachable box');game.update(1,true);assert.equal(game.snapshot().chapter,(page+1)%6);
});

test('blocked and idle turns advance the moth warning and undo or restart safely',()=>{
 const game=createRuleboundPuzzle({page:1,seed:0});press(game,'ArrowLeft');assert.equal(game.snapshot().mothPhase,1);assert.deepEqual(game.snapshot().mothTarget,{x:0,y:6});
 game.update(.01,false);game.update(.37,false);assert.equal(game.snapshot().mothPhase,2);game.update(.01,false);game.update(.37,false);assert.equal(game.snapshot().dead,true);
 game.update(.4,false);assert.equal(game.snapshot().dead,false);assert.equal(game.snapshot().mothPhase,0);
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
 const game=createRuleboundPuzzle({seed:0});game.input('ArrowUp',true);game.update(1/60,false);game.input('ArrowUp',false);const read=()=>{let open;const ctx=new Proxy({fillText(label,x,y){if(label==='OPEN')open={x,y}}},{get:(o,k)=>o[k]??(()=>{}),set:(o,k,v)=>(o[k]=v,true)});game.draw(ctx);return open.y};
 assert.ok(Math.abs(read()-(495-56/22))<.2);game.update(10/60,false);assert.equal(read(),467);game.update(11/60,false);assert.equal(read(),439);
});

test('rule change commits at landing and held input is sampled at the next turn',()=>{
 const game=createRuleboundPuzzle({seed:0});game.input('ArrowUp',true);game.update(11/60,false);assert.deepEqual(game.snapshot().p,{x:2,y:7});assert.ok(!ruleboundRules(game.snapshot()).has('GATE_OPEN'));game.input('ArrowRight',true);game.input('ArrowUp',false);game.update(11/60,false);assert.deepEqual(game.snapshot().p,{x:2,y:6});assert.ok(ruleboundRules(game.snapshot()).has('GATE_OPEN'));game.update(1/60,false);game.input('ArrowRight',false);game.update(21/60,false);assert.deepEqual(game.snapshot().p,{x:3,y:6});
});

test('an idle turn samples a held direction at its boundary',()=>{
 const game=createRuleboundPuzzle({seed:0});game.update(1/60,false);game.input('ArrowUp',true);game.update(10/60,false);assert.deepEqual(game.snapshot().p,{x:2,y:7});game.update(11/60,false);assert.deepEqual(game.snapshot().p,{x:2,y:7});game.update(1/60,false);game.input('ArrowUp',false);game.update(21/60,false);assert.deepEqual(game.snapshot().p,{x:2,y:6});assert.ok(ruleboundRules(game.snapshot()).has('GATE_OPEN'));
});
test('a direction released before the idle boundary does not start a move',()=>{
 const game=createRuleboundPuzzle({seed:0});game.update(1/60,false);game.input('ArrowUp',true);game.update(.05,false);game.input('ArrowUp',false);game.update(22/60,false);game.update(.001,false);game.update(22/60,false);assert.deepEqual(game.snapshot().p,{x:2,y:7});assert.ok(!ruleboundRules(game.snapshot()).has('GATE_OPEN'));
});

test('fractional time carries into the next turn regardless of update chunking',()=>{
 const a=createRuleboundPuzzle({seed:1}),b=createRuleboundPuzzle({seed:1});a.input('ArrowLeft',true);b.input('ArrowLeft',true);a.update(.75,false);for(let i=0;i<3;i++)b.update(.25,false);assert.deepEqual(a.snapshot().p,b.snapshot().p);assert.deepEqual(a.snapshot().p,{x:2,y:7});a.input('ArrowLeft',false);b.input('ArrowLeft',false);a.update(22/60-.75% (22/60),false);b.update(22/60-.75% (22/60),false);assert.deepEqual(a.snapshot().p,b.snapshot().p);assert.deepEqual(a.snapshot().p,{x:1,y:7});
});

test('simultaneous held directions use reference left-down-right-up priority independent of press order',()=>{
 for(const keys of [['ArrowLeft','ArrowUp'],['ArrowUp','ArrowLeft']]){const game=createRuleboundPuzzle({seed:1});for(const key of keys)game.input(key,true);game.update(22/60,false);assert.deepEqual(game.snapshot().p,{x:3,y:7});for(const key of keys)game.input(key,false)}
 const game=createRuleboundPuzzle({seed:0});game.input('ArrowUp',true);game.input('ArrowRight',true);game.update(22/60,false);assert.deepEqual(game.snapshot().p,{x:3,y:7});
});


for(const order of [['z','x'],['x','z']])test(`restart wins over undo queued in ${order.join(' then ')} order`,()=>{
 const cues=[],g=createRuleboundPuzzle({seed:0,onSound:c=>cues.push(c)});press(g,'ArrowLeft');assert.deepEqual(g.snapshot().p,{x:1,y:7});g.input('ArrowLeft',true);g.update(1/60,false);g.input('ArrowLeft',false);for(const k of order){g.input(k,true);g.input(k,false)}g.update(21/60,false);g.update(1/60,false);assert.deepEqual(g.snapshot().p,{x:2,y:7});assert.equal(cues.filter(c=>c==='rule-restart').length,1);assert.equal(cues.filter(c=>c==='rule-undo').length,0);
});
test('restart queued while moth defeat is visible executes after automatic undo',()=>{
 const cues=[],g=createRuleboundPuzzle({page:1,seed:0,onSound:c=>cues.push(c)});press(g,'ArrowRight');press(g,'ArrowLeft');press(g,'ArrowRight');assert.ok(g.snapshot().dead);g.input('z',true);g.input('z',false);g.update(23/60,false);assert.equal(g.snapshot().dead,true);g.update(1/60,false);assert.equal(g.snapshot().dead,false);g.update(22/60,false);assert.equal(g.snapshot().dead,false);g.update(1/60,false);assert.equal(cues.filter(c=>c==='rule-restart').length,1);assert.deepEqual(g.snapshot().p,{x:0,y:6});
});
test('empty undo does not trigger a restart and simultaneous restart clears it',()=>{const cues=[],g=createRuleboundPuzzle({seed:0,onSound:c=>cues.push(c)});g.input('x',true);g.input('x',false);g.update(1/60,false);assert.deepEqual(g.snapshot().p,{x:2,y:7});g.input('x',true);g.input('x',false);g.input('z',true);g.input('z',false);g.update(1/60,false);assert.equal(cues.filter(c=>c==='rule-restart').length,1)});


test('restart tapped during celebration is consumed on the next page',()=>{const cues=[],g=createRuleboundPuzzle({seed:0,onSound:c=>cues.push(c)});for(let i=0;i<500&&!g.snapshot().won;i++)g.update(.1,true);assert.ok(g.snapshot().won);g.input('z',true);g.input('z',false);g.update(30/60,false);assert.equal(g.snapshot().chapter,1);g.update(1/60,false);assert.equal(cues.filter(c=>c==='rule-restart').length,1);assert.equal(g.snapshot().chapter,1)});


test('manual and AI states match across 30Hz and 60Hz update rates',()=>{for(const auto of [false,true]){const run=hz=>{const cues=[],g=createRuleboundPuzzle({seed:0,onSound:c=>cues.push(c)});if(!auto)g.input('ArrowUp',true);for(let i=0;i<hz*5;i++)g.update(1/hz,auto);return {state:g.snapshot(),cues}};assert.deepEqual(run(30),run(60))}});
test('a direction released before the next simulation frame is not sampled',()=>{const g=createRuleboundPuzzle({seed:0});g.input('ArrowUp',true);g.update(1/120,false);g.input('ArrowUp',false);g.update(1/120,false);g.update(21/60,false);assert.deepEqual(g.snapshot().p,{x:2,y:7});assert.ok(!ruleboundRules(g.snapshot()).has('GATE_OPEN'))});
test('reset drops a partial accumulated frame',()=>{const g=createRuleboundPuzzle({seed:0});g.update(1/120,false);g.reset();g.input('ArrowUp',true);g.update(1/120,false);g.input('ArrowUp',false);g.update(1/120,false);g.update(21/60,false);assert.deepEqual(g.snapshot().p,{x:2,y:7})});

import test from 'node:test';import assert from 'node:assert/strict';import {createRuleboundPuzzle} from '../src/feature-games35.js';
function flashCount(g){let count=0;const noop=()=>{},ctx=new Proxy({strokeRect(){count++}},{get:(o,k)=>o[k]??noop,set:(o,k,v)=>(o[k]=v,true)});g.draw(ctx);return count}
function press(g,k){g.input(k,true);g.update(.001,false);g.input(k,false);g.update(22/60-.001,false)}
test('manual word push and rule rewrite produce short visible feedback',()=>{const g=createRuleboundPuzzle({seed:0});assert.equal(flashCount(g),0);press(g,'ArrowUp');assert.ok(flashCount(g)>=2);assert.ok(flashCount(g)>=2,'drawing does not consume effects');g.update(25/60+.01,false);assert.equal(flashCount(g),0)});
test('AI rule rewrite produces the same event feedback',()=>{const g=createRuleboundPuzzle({seed:0});let shown=false;for(let i=0;i<500&&!shown;i++){g.update(1/60,true);shown=flashCount(g)>=2}assert.ok(shown)});

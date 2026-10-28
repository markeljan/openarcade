import test from 'node:test';import assert from 'node:assert/strict';import {createRuleboundPuzzle} from '../src/feature-games35.js';
function drawing(g){const rects=[],fills=[],noop=()=>{},ctx=new Proxy({fillRect(x,y,w,h){rects.push({x,y,w,h,color:ctx.fillStyle})},fill(){fills.push(ctx.fillStyle)}},{get:(o,k)=>o[k]??noop,set:(o,k,v)=>(o[k]=v,true)});g.draw(ctx);return{rects,fills}}
function press(g,k){g.input(k,true);g.update(1/60,false);g.input(k,false);g.update(21/60,false)}
const pushBadge=g=>drawing(g).rects.some(r=>r.x===149&&r.y===319&&r.color==='#35796c');
test('manual BOX IS PUSH marks the crate and undo removes its badge',()=>{const g=createRuleboundPuzzle({page:1,seed:0});assert.equal(pushBadge(g),false);for(let i=0;i<3;i++)press(g,'ArrowUp');assert.equal(pushBadge(g),true);press(g,'x');assert.equal(pushBadge(g),false)});
test('star is dim without WIN and lit with WIN',()=>{assert.ok(drawing(createRuleboundPuzzle({page:2,seed:0})).fills.includes('#77766c'));assert.ok(drawing(createRuleboundPuzzle({page:0,seed:0})).fills.includes('#f1ca66'))});
test('AI rule rewrite visibly marks a pushable crate',()=>{const g=createRuleboundPuzzle({page:1,seed:0});for(let i=0;i<1000&&!pushBadge(g);i++)g.update(1/60,true);assert.ok(pushBadge(g))});

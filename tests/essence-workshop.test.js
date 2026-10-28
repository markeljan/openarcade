import test from 'node:test';
import assert from 'node:assert/strict';
import {alchemist} from '../src/feature-games33.js';
function move(g,x,y){for(let i=0;i<1000;i++){const p=g.snapshot().p,dx=x-p.x,dy=y-p.y;if(Math.hypot(dx,dy)<8)break;const k=Math.abs(dx)>Math.abs(dy)?dx>0?'ArrowRight':'ArrowLeft':dy>0?'ArrowDown':'ArrowUp';g.input(k,true);g.update(1/60,false);g.input(k,false)}}
function act(g,k=' '){g.update(.21,false);g.input(k,true);g.input(k,false)}
function ingredient(g,x){move(g,x,410);act(g);assert.equal(g.snapshot().carry.kind,'raw');move(g,45,260);act(g);assert.equal(g.snapshot().carry,null);g.update(.7,false);act(g);assert.equal(g.snapshot().carry.kind,'essence');move(g,130,260);act(g)}
test('manual recipe distills both ingredients and requires vent before restoration',()=>{const g=alchemist();ingredient(g,35);ingredient(g,120);assert.equal(g.snapshot().ingredients.length,2);g.update(.6,false);assert.equal(g.snapshot().phase,'warning');move(g,120,105);act(g);assert.equal(g.snapshot().score,0);move(g,202,220);act(g,'c');g.update(.9,false);assert.equal(g.snapshot().phase,'ready');move(g,120,105);act(g);assert.equal(g.snapshot().score,1);assert.equal(g.snapshot().phase,'idle')});
test('wrong ingredient is rejected and raises pressure',()=>{const g=alchemist();ingredient(g,205);assert.equal(g.snapshot().ingredients.length,0);assert.ok(g.snapshot().pressure>20);assert.equal(g.snapshot().notice,'INCOMPATIBLE')});
test('AI completes rotating recipes',()=>{const g=alchemist();for(let i=0;i<12000&&g.snapshot().score<3;i++)g.update(1/60,true);assert.ok(g.snapshot().score>=3)});

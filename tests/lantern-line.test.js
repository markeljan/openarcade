import test from 'node:test';
import assert from 'node:assert/strict';
import {lantern} from '../src/feature-games16.js';
const withSeed=(seed,fn)=>{let old=Math.random;Math.random=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296);try{fn()}finally{Math.random=old}};
function press(g,k){g.input(k,true);g.input(k,false)}
function move(g,x,y){for(let i=0;i<400;i++){let p=g.snapshot().keeper,dx=x-p.x,dy=y-p.y;if(Math.hypot(dx,dy)<5)break;for(let [k,on] of [['ArrowLeft',dx< -3],['ArrowRight',dx>3],['ArrowUp',dy< -3],['ArrowDown',dy>3]])g.input(k,on);g.update(.02,false)}for(let k of ['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'])g.input(k,false)}
function align(g,side){let s=g.snapshot(),need=(s.order[side].hue-s.raw+3)%3;while(g.snapshot().lanes[1].orientation!==need)press(g,'x')}
test('manual prism rotations produce a two-half exact lantern',()=>withSeed(42,()=>{
 let g=lantern();move(g,160,400);align(g,0);for(let i=0;i<200&&!g.snapshot().motes.length;i++)g.update(.02,false);assert.equal(g.snapshot().motes.length,1);
 for(let i=0;i<100&&g.snapshot().motes[0]?.stage===0;i++)g.update(.02,false);align(g,1);for(let i=0;i<600&&!g.snapshot().orderIndex;i++)g.update(.02,false);let s=g.snapshot();assert.equal(s.exact,1);assert.equal(s.imperfect,0);assert.equal(s.orderIndex,1);assert.equal(s.districts,0);
}));
test('manual player can guard a warned coil against a clog',()=>withSeed(42,()=>{
 let g=lantern();move(g,74,300);for(let i=0;i<500&&!g.snapshot().threat;i++)g.update(.02,false);let t=g.snapshot().threat;assert.equal(t.state,'windup');move(g,g.snapshot().lanes[t.lane].x,300);press(g,' ');assert.ok(g.snapshot().lanes[t.lane].guard>0);for(let i=0;i<100&&g.snapshot().threat;i++)g.update(.02,false);assert.equal(g.snapshot().lanes[t.lane].jam,0);
}));
test('AI matches paired orders and lights four districts',()=>withSeed(42,()=>{
 let g=lantern();for(let i=0;i<4000&&g.snapshot().districts<4;i++)g.update(.033,true);const s=g.snapshot();assert.equal(s.districts,4);assert.ok(s.exact>=10);assert.equal(s.imperfect,0);
}));

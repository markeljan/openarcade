import test from 'node:test';
import assert from 'node:assert/strict';
import {frog} from '../src/feature-games10.js';
const step=(g,n,auto=false)=>{for(let i=0;i<n;i++)g.update(1/60,auto)};
test('holding a direction repeats hops and releasing stops at the next landing',()=>{const g=frog();g.input('ArrowRight',true);step(g,70);let s=g.snapshot();assert.equal(s.leader.x,6);assert.equal(s.leader.row,11);assert.equal(s.route.length,3);g.input('ArrowRight',false);step(g,40);s=g.snapshot();assert.equal(s.leader.x,6);assert.equal(s.route.length,3)});
test('direction pressed during a hop is used when the cooldown ends',()=>{const g=frog();g.input('ArrowRight',true);step(g,5);g.input('ArrowRight',false);g.input('ArrowLeft',true);step(g,20);g.input('ArrowLeft',false);step(g,20);const s=g.snapshot();assert.equal(s.leader.x,3);assert.equal(s.route.length,2)});
test('AI ignores a held manual direction after takeover',()=>{const old=Math.random;Math.random=()=>.5;try{const a=frog(),b=frog();for(const g of [a,b]){g.input('ArrowRight',true);step(g,5);g.input('ArrowRight',false)}a.input('ArrowLeft',true);step(a,80,true);step(b,80,true);assert.deepEqual(a.snapshot().route,b.snapshot().route)}finally{Math.random=old}});

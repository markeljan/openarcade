import test from 'node:test';import assert from 'node:assert/strict';import {pursuit} from '../src/feature-games9.js';
function run(handbrake,steer){const g=pursuit();g.input('ArrowUp',true);g.input('ArrowRight',steer);g.input(' ',handbrake);for(let i=0;i<24;i++)g.update(1/60,false);return g.snapshot()}
test('manual handbrake costs speed during a committed turn',()=>{const normal=run(false,true),slide=run(true,true);assert.ok(slide.speed<normal.speed-10);assert.ok(slide.x>normal.x)});
test('holding handbrake straight does not add a speed penalty',()=>{const normal=run(false,false),held=run(true,false);assert.equal(held.speed,normal.speed)});
test('AI drives and continues advancing through pursuit',()=>{const old=Math.random;Math.random=()=>.5;try{const g=pursuit();for(let i=0;i<2400;i++)g.update(1/60,true);assert.ok(g.snapshot().distance>100)}finally{Math.random=old}});


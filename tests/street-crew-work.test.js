import test from 'node:test';import assert from 'node:assert/strict';import {createRoadsGame} from '../src/feature-games39.js';
const tick=(g,n)=>{for(let i=0;i<n;i++)g.update(1/60,false)};
test('signal needs ten held frames in reach and release interrupts work',()=>{const g=createRoadsGame();g.input('ArrowUp',true);tick(g,88);g.input('ArrowUp',false);g.input('x',true);tick(g,9);assert.equal(g.snapshot().signalTimer,0);g.input('x',false);g.input('x',true);tick(g,9);assert.equal(g.snapshot().signalTimer,0);tick(g,1);assert.ok(g.snapshot().signalTimer>0);g.input('x',false)});
test('crew cannot cross the river without a built bridge',()=>{const g=createRoadsGame();g.input('ArrowRight',true);tick(g,150);g.input('ArrowRight',false);assert.ok(g.snapshot().hero.x<87)});

test('held signal renews every ten frames while the crew stays in reach',()=>{const cues=[],g=createRoadsGame(c=>cues.push(c));g.input('ArrowUp',true);tick(g,88);g.input('ArrowUp',false);g.input('x',true);tick(g,20);g.input('x',false);assert.equal(cues.filter(c=>c==='street-signal').length,2);assert.ok(g.snapshot().signalTimer>1.6)});

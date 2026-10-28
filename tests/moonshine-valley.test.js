import test from 'node:test';
import assert from 'node:assert/strict';
import {createMoonGame} from '../src/feature-games14.js';
function move(g,x,y){for(let i=0;i<1000;i++){const p=g.snapshot().hero,dx=x-p.x,dy=y-p.y;if(Math.hypot(dx,dy)<8)break;for(const [k,v] of [['ArrowLeft',dx< -3],['ArrowRight',dx>3],['ArrowUp',dy< -3],['ArrowDown',dy>3]])g.input(k,v);g.update(.02,false)}for(const k of ['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'])g.input(k,false)}
function use(g){g.input(' ',true);for(let i=0;i<16;i++)g.update(.02,false);g.input(' ',false)}
test('manual sowing completes the first objective once and pays seven coins',()=>{const g=createMoonGame();for(const [x,y] of [[190,290],[255,290],[255,370],[190,370],[125,370],[60,370]]){move(g,x,y);use(g)}let s=g.snapshot();assert.equal(s.counts.plant,6);assert.equal(s.objective.done,true);assert.equal(s.coins,15);assert.equal(s.completed,1);for(let i=0;i<20;i++)g.update(.02,false);assert.equal(g.snapshot().coins,15)});
test('autoplay completes rotating tasks and advances seasons every three days',()=>{const g=createMoonGame(),kinds=new Set();for(let i=0;i<10000&&g.snapshot().day<6;i++){g.update(.033,true);kinds.add(g.snapshot().objective.kind)}const s=g.snapshot();assert.equal(s.day,6);assert.equal(s.season,1);for(const k of ['plant','ship','ward','harvest','fence'])assert.ok(kinds.has(k));assert.ok(s.wards>=1);assert.ok(s.fence>=2);assert.ok(s.completed>=4)});

test('opening farm has sixteen plots, six watered crops and fourteen seeds',()=>{
 const g=createMoonGame();let s=g.snapshot();assert.equal(s.crops.length,16);assert.equal(s.seeds,14);assert.equal(s.crops.filter(p=>p.growth>=0).length,6);assert.ok(s.crops.slice(0,6).every(p=>p.watered));assert.deepEqual(s.crops.slice(0,6).map(p=>p.growth),[180,360,590,820,940,1040].map(n=>n/900));assert.equal(s.crops.filter(p=>p.growth>=1).length,2);assert.deepEqual(s.crops.slice(0,6).map(p=>p.variant),[0,1,2,3,0,1]);
 for(let i=0;i<3000;i++)g.update(.033,true);s=g.snapshot();assert.ok(s.counts.harvest>=2);assert.ok(s.counts.plant>=6);assert.ok(s.counts.ship>0);
});

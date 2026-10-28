import test from 'node:test';
import assert from 'node:assert/strict';
import {createPotteryHouse} from '../src/feature-games20.js';

const points={clay:[42,402],wheel:[114,393],glaze:[189,357],ash:[189,409],water:[30,296],kiln:[166.5,243],vent:[213,192],wood:[208.5,280.5],shelf:[61.5,186]};
function go(g,name){const [x,y]=points[name];for(const [axis,target,minus,plus] of [['x',x,'ArrowLeft','ArrowRight'],['y',y,'ArrowUp','ArrowDown']]){let n=0;while(Math.abs(g.snapshot().hero[axis]-target)>.01&&n++<1000){const diff=target-g.snapshot().hero[axis],key=diff<0?minus:plus;g.input(key,true);g.update(Math.min(.05,Math.abs(diff)/133.2),false);g.input(key,false)}}}
function work(g,name,key=' '){go(g,name);g.input(key,true);for(let i=0;i<25;i++)g.update(1/60,false);g.input(key,false)}

test('manual craft uses separate clay, wheel, glaze and ash stations',()=>{
 const g=createPotteryHouse();work(g,'clay');assert.equal(g.snapshot().hero.carry.state,'clay');
 work(g,'wheel');assert.equal(g.snapshot().hero.carry.state,'shaped');
 work(g,'glaze');assert.equal(g.snapshot().hero.carry.state,'glazed');assert.ok(g.snapshot().hero.carry.glaze>=0);
 work(g,'ash');assert.equal(g.snapshot().hero.carry.ash.phase,'loaded');
 work(g,'kiln');const s=g.snapshot();assert.equal(s.hero.carry,null);assert.equal(s.kiln.baking.state,'glazed');assert.equal(s.kiln.baking.ash.phase,'firing');
});

test('dry clay can crack and be repaired at the water station',()=>{
 const g=createPotteryHouse();work(g,'clay');for(let i=0;i<1200&&!g.snapshot().hero.carry.cracked;i++)g.update(1/60,false);
 assert.ok(g.snapshot().hero.carry.cracked);work(g,'water','z');assert.equal(g.snapshot().hero.carry.cracked,false);assert.ok(g.snapshot().hero.carry.dry<3);
});

test('autoplay heats, vents, cools ash and displays multiple pieces through real stations',()=>{
 const g=createPotteryHouse();let baked=false,cooling=false,vented=false;
 for(let i=0;i<18000;i++){g.update(1/60,true);if(i%5===0){const s=g.snapshot();baked ||= !!s.kiln.baking;cooling ||= s.hero.carry?.state==='cooling';vented ||= s.kiln.curve.vented;if(s.completed>=4)break}}
 const s=g.snapshot();assert.ok(baked);assert.ok(cooling);assert.ok(vented);assert.ok(s.completed>=4);assert.ok(s.shelf.some(v=>v.iridescent));assert.equal(s.stage,Math.floor(s.completed/3));assert.ok(s.score>=s.completed*100);
});

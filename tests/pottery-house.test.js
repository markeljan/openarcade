import test from 'node:test';
import assert from 'node:assert/strict';
import {createPotteryHouse} from '../src/feature-games20.js';

const points={clay:[42,402],wheel:[114,393],glaze:[189,357],ash:[189,409],water:[30,296],kiln:[166.5,243],vent:[213,192],wood:[208.5,280.5],shelf:[61.5,186]};
function go(g,name){const [x,y]=points[name];for(const [axis,target,minus,plus] of [['x',x,'ArrowLeft','ArrowRight'],['y',y,'ArrowUp','ArrowDown']]){let n=0;while(Math.abs(g.snapshot().hero[axis]-target)>1.12&&n++<1000){const diff=target-g.snapshot().hero[axis],key=diff<0?minus:plus;g.input(key,true);g.update(1/60,false);g.input(key,false)}}}
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
 assert.ok(g.snapshot().hero.carry.cracked);const h=g.snapshot().hero,marks=[];let color='';const ctx=new Proxy({fillRect(x,y,w,ht){marks.push({x,y,w,ht,color})}},{get:(o,k)=>k==='fillStyle'?color:o[k]??(()=>{}),set:(o,k,v)=>{if(k==='fillStyle')color=v;else o[k]=v;return true}});g.draw(ctx);assert.ok(marks.some(p=>p.x===h.x+h.facing*13-1&&p.y===h.y-7&&p.color==='#f26d3d'),'carried crack is visible');work(g,'water','z');assert.equal(g.snapshot().hero.carry.cracked,false);assert.ok(g.snapshot().hero.carry.dry<3);
});

test('autoplay heats, vents, cools ash and displays multiple pieces through real stations',()=>{
 const g=createPotteryHouse();let baked=false,cooling=false,vented=false;
 for(let i=0;i<18000;i++){g.update(1/60,true);if(i%5===0){const s=g.snapshot();baked ||= !!s.kiln.baking;cooling ||= s.hero.carry?.state==='cooling';vented ||= s.kiln.curve.vented;if(s.completed>=4)break}}
 const s=g.snapshot();assert.ok(baked);assert.ok(cooling);assert.ok(vented);assert.ok(s.completed>=4);assert.ok(s.shelf.some(v=>v.iridescent));assert.equal(s.stage,Math.floor(s.completed/3));assert.ok(s.score>=s.completed*100);
});
test('HUD identifies hot ash and cooled iridescent vessels during AI firing',()=>{const g=createPotteryHouse();let hot=false,cooled=false;const labels=[],noop=()=>{},ctx=new Proxy({fillText(t){labels.push(String(t))}},{get:(o,k)=>o[k]??noop,set:(o,k,v)=>(o[k]=v,true)});for(let i=0;i<8000&&(!hot||!cooled);i++){g.update(1/60,true);const v=g.snapshot().hero.carry;if(v?.state==='cooling'||v?.ash?.phase==='cooled'){labels.length=0;g.draw(ctx);if(v.state==='cooling'){assert.ok(labels.includes('HOT ASH: FIND WATER'));hot=true}else{assert.ok(labels.includes('IRIDESCENT VESSEL'));cooled=true}}}assert.ok(hot&&cooled)});


test('seeded manual station work is identical at 30Hz and 60Hz',()=>{
 const run=hz=>{let seed=42;const old=Math.random;Math.random=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/2**32);try{const cues=[],g=createPotteryHouse(e=>cues.push(e));g.input(' ',true);g.input('ArrowLeft',true);for(let i=0;i<hz/2;i++)g.update(1/hz,false);g.input('ArrowLeft',false);g.input('ArrowUp',true);for(let i=0;i<hz/2;i++)g.update(1/hz,false);g.input('ArrowUp',false);for(let i=0;i<hz;i++)g.update(1/hz,false);return {state:g.snapshot(),cues}}finally{Math.random=old}};const a=run(30),b=run(60);assert.deepEqual(a,b);assert.ok(a.cues.includes('clay'));
});
test('seeded AI firing and hazard progression match at 30Hz and 60Hz',()=>{
 const run=hz=>{let seed=42;const old=Math.random;Math.random=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/2**32);try{const cues=[],g=createPotteryHouse(e=>cues.push(e));for(let i=0;i<hz*90;i++)g.update(1/hz,true);return {state:g.snapshot(),cues}}finally{Math.random=old}};const a=run(30),b=run(60);assert.deepEqual(a,b);assert.ok(a.state.completed>0);assert.ok(a.cues.includes('fired'));assert.ok(a.cues.includes('warning'));
});
test('reset clears accumulated partial frame',()=>{const g=createPotteryHouse();g.input('ArrowLeft',true);g.update(1/120,false);g.reset();g.input('ArrowLeft',true);g.update(1/120,false);assert.equal(g.snapshot().hero.x,114);g.update(1/120,false);assert.ok(g.snapshot().hero.x<114)});

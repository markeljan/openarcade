import test from 'node:test';import assert from 'node:assert/strict';
import {garden,gardenBiteCueDue,gardenBiteInRange,gardenAdvanceShots} from '../src/feature-games8.js';
function fixed(value,fn){const old=Math.random;Math.random=()=>value;try{fn()}finally{Math.random=old}}
function advance(g,seconds,auto=false){for(let i=0;i<Math.ceil(seconds*60);i++)g.update(1/60,auto)}
test('planting, harvest and moon cues follow actual garden events',()=>fixed(.3,()=>{
 const events=[],g=garden(e=>events.push(e));g.input('ArrowDown',true);g.input('ArrowRight',true);g.input(' ',true);assert.equal(events.length,0);advance(g,2);assert.equal(events.filter(e=>e==='garden-plant').length,1);assert.equal(events.filter(e=>e==='garden-harvest').length,0);advance(g,1.1);assert.equal(events.filter(e=>e==='garden-harvest').length,1);advance(g,67);assert.equal(events.filter(e=>e==='garden-warning').length,1);assert.ok(events.includes('alert'));advance(g,4);assert.ok(events.includes('boss'));
}));
test('soft and armored projectile impacts emit distinct cues only on contact',()=>{
 const events=[],sound=e=>events.push(e);gardenAdvanceShots([{x:50,lane:0,kind:'pea',damage:1}],[{x:250,lane:0,kind:'bucket',hp:5}],.1,sound);assert.deepEqual(events,[]);gardenAdvanceShots([{x:50,lane:0,kind:'pea',damage:1}],[{x:75,lane:0,kind:'hound',hp:5}],.1,sound);gardenAdvanceShots([{x:50,lane:0,kind:'pea',damage:1}],[{x:75,lane:0,kind:'bucket',hp:5}],.1,sound);assert.deepEqual(events,['garden-hit','garden-clang']);
});
test('AI physically uproots and replants with event cues',()=>fixed(.2,()=>{
 const events=[],g=garden(e=>events.push(e));for(let i=0;i<60*240&&!events.includes('garden-uproot');i++)g.update(1/60,true);assert.ok(events.includes('garden-uproot'));const prior=events.filter(e=>e==='garden-plant').length;for(let i=0;i<60*10&&events.filter(e=>e==='garden-plant').length===prior;i++)g.update(1/60,true);assert.ok(events.filter(e=>e==='garden-plant').length>prior);
}));


test('manual and AI audible bites follow the attacking zombie clock',()=>fixed(.3,()=>{
 for(const auto of [false,true]){const events=[],g=garden(e=>events.push(e));let found=false;for(let frame=1;frame<60*300;frame++){const before=g.snapshot(),expected=before.zombies.some(z=>z.hp>0&&z.x>150&&gardenBiteCueDue(z.id,frame-1,frame)&&before.plants.some(p=>p.hp>0&&p.lane===z.lane&&gardenBiteInRange(before.bedPositions.x[p.col],z.x)));const n=events.length;g.update(1/60,auto);if(expected&&events.slice(n).includes('garden-hit')){found=true;break}}assert.ok(found,`${auto?'AI':'manual'} run must emit a timed bite`)}
}));

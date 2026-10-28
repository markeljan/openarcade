import test from 'node:test';
import assert from 'node:assert/strict';
import {createAshenRage} from '../src/feature-games17.js';
function seeded(fn){const old=Math.random;let seed=42;Math.random=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/2**32);try{return fn()}finally{Math.random=old}}
test('manual swing winds up before hitting one rival and recovers',()=>seeded(()=>{
 const g=createAshenRage();g.input('ArrowRight',true);for(let i=0;i<45;i++)g.update(1/60,false);g.input('ArrowRight',false);for(let i=0;i<600&&g.snapshot().rivals[4].y<540;i++)g.update(1/60,false);const before=g.snapshot();assert.ok(before.rivals[4].y>=540);g.input('x',true);g.input('x',false);assert.equal(g.snapshot().swingPhase,'windup');assert.equal(g.snapshot().rivals[4].hp,before.rivals[4].hp);for(let i=0;i<11;i++)g.update(1/60,false);assert.equal(g.snapshot().rivals[4].hp,before.rivals[4].hp);for(let i=0;i<7;i++)g.update(1/60,false);assert.equal(g.snapshot().rivals[4].hp,before.rivals[4].hp-1);assert.equal(g.snapshot().swingHit,true);for(let i=0;i<30;i++)g.update(1/60,false);assert.equal(g.snapshot().swingPhase,'ready');
}));
test('AI executes a timed swing and lands a hit',()=>seeded(()=>{const g=createAshenRage();let hit=false;for(let i=0;i<60*30;i++){g.update(1/60,true);if(g.snapshot().swingHit){hit=true;break}}assert.ok(hit)}));

test('position determines rank and an AI pass replenishes boost',()=>seeded(()=>{
 const g=createAshenRage();let passed=false,prior=g.snapshot();for(let i=0;i<60*30;i++){g.update(1/60,true);const s=g.snapshot();assert.equal(s.rank,1+s.rivals.filter(r=>!r.down&&r.y<560).length);if(s.overtakes>prior.overtakes){passed=true;assert.ok(s.boost>prior.boost);break}prior=s}assert.ok(passed,'AI should physically overtake a rider');
}));
test('traffic wreck is a temporary setback and recovers the rider',()=>seeded(()=>{
 const g=createAshenRage();for(let i=0;i<60*60&&!g.snapshot().wrecks;i++){const s=g.snapshot(),car=s.cars.filter(c=>!c.hit&&c.y<550).sort((a,b)=>b.y-a.y)[0];g.input('ArrowLeft',!!car&&car.x<s.p.x-3);g.input('ArrowRight',!!car&&car.x>s.p.x+3);g.update(1/60,false)}const wreck=g.snapshot();assert.ok(wreck.wrecks>0);assert.ok(wreck.wreckTime>0);assert.equal(wreck.dead,0);for(let i=0;i<100;i++)g.update(1/60,false);const recovered=g.snapshot();assert.equal(recovered.wreckTime,0);assert.ok(recovered.health>0);assert.equal(recovered.dead,0);
}));

test('manual race finishes at 900 seconds rather than the former distance limit',()=>seeded(()=>{
 const g=createAshenRage();for(let i=0;i<1601;i++)g.update(.05,false);let s=g.snapshot();assert.ok(s.dist>7000);assert.equal(s.dead,0);for(let i=1601;i<17999;i++)g.update(.05,false);s=g.snapshot();assert.equal(s.dead,0);assert.ok(s.time>0&&s.time<.051);g.update(.05,false);s=g.snapshot();assert.equal(s.time,0);assert.equal(s.dead,7);assert.equal(s.result,s.rank===1?'COUNTY CROWN':s.rank<=3?'PODIUM FINISH':'MID-PACK');g.update(10,false);assert.equal(g.snapshot().dead,7);
}));
test('AI runs the full race and restarts after its seven-second podium',()=>seeded(()=>{
 const g=createAshenRage();for(let i=0;i<18000;i++)g.update(.05,true);let s=g.snapshot();assert.equal(s.dead,7);assert.equal(s.time,0);for(let i=0;i<139;i++)g.update(.05,true);assert.ok(g.snapshot().dead>0);g.update(.1,true);s=g.snapshot();assert.equal(s.dead,0);assert.equal(s.time,900);
}));

test('manual steering accelerates and coasts after release; AI uses the same velocity state',()=>{
 const g=createAshenRage();const start=g.snapshot().p.x;g.input('ArrowRight',true);g.update(1/60,false);const first=g.snapshot();assert.ok(first.p.vx>0);assert.ok(first.p.x>start);for(let i=0;i<20;i++)g.update(1/60,false);const moving=g.snapshot();assert.ok(moving.p.vx>first.p.vx);g.input('ArrowRight',false);g.update(1/60,false);const coast=g.snapshot();assert.ok(coast.p.x>moving.p.x);assert.ok(coast.p.vx>0&&coast.p.vx<moving.p.vx);
 const ai=createAshenRage();let moved=false;for(let i=0;i<300;i++){ai.update(1/60,true);if(Math.abs(ai.snapshot().p.vx)>1){moved=true;break}}assert.ok(moved);
});

test('rival impacts impart lateral impulse and wobble',()=>{
 const old=Math.random;Math.random=()=>.5;try{const g=createAshenRage();g.input('ArrowLeft',true);for(let i=0;i<12;i++)g.update(1/60,false);g.input('ArrowLeft',false);let s;for(let i=0;i<500;i++){g.update(1/60,false);s=g.snapshot();if(s.p.wobble)break}assert.ok(s.p.wobble>0);assert.ok(s.p.vx<0);assert.ok(s.speed<150);const x=s.p.x;g.update(1/60,false);assert.ok(g.snapshot().p.x<x)}finally{Math.random=old}
});

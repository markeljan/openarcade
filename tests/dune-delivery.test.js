import test from 'node:test';
import assert from 'node:assert/strict';
import {dune} from '../src/feature-games27.js';
function move(g,target){for(let i=0;i<500;i++){const p=g.snapshot().hero,dx=target.x-p.x,dy=target.y-p.y;if(Math.hypot(dx,dy)<5)break;for(const [k,on] of [['ArrowLeft',dx< -4],['ArrowRight',dx>4],['ArrowUp',dy< -4],['ArrowDown',dy>4]])g.input(k,on);g.update(.02,false)}for(const k of ['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'])g.input(k,false)}
test('manual well relay carries water and retains interrupted pouring',()=>{
 const g=dune();move(g,{x:90,y:310});let s=g.snapshot();assert.equal(s.relay.phase,'carrying');assert.equal(s.wellSites[0].water,0);assert.ok(s.water<9);
 move(g,{x:90,y:260});for(let i=0;i<10;i++)g.update(.02,false);s=g.snapshot();assert.ok(s.wellSites[0].water>0&&s.wellSites[0].water<2.24);move(g,{x:90,y:300});s=g.snapshot();const saved=s.wellSites[0].water;assert.equal(s.relay.phase,'carrying');move(g,{x:90,y:260});for(let i=0;i<120&&!g.snapshot().wellSites[0].filled;i++)g.update(.02,false);s=g.snapshot();assert.ok(s.wellSites[0].filled);assert.ok(saved>0);assert.equal(s.wells,1);assert.equal(s.relay,null);
});
test('travel consumes water and a warning precedes the storm',()=>{
 const g=dune(),start=g.snapshot().water;move(g,{x:120,y:440});assert.ok(g.snapshot().water<start);for(let i=0;i<600&&g.snapshot().storm.phase==='calm';i++)g.update(.02,false);assert.equal(g.snapshot().storm.phase,'warning');for(let i=0;i<120&&g.snapshot().storm.phase==='warning';i++)g.update(.02,false);assert.equal(g.snapshot().storm.phase,'active');
});
test('AI restores both wells permanently and continues deliveries',()=>{
 const g=dune();for(let i=0;i<2500&&(g.snapshot().wells<2||g.snapshot().deliveries<2);i++)g.update(.033,true);const s=g.snapshot();assert.equal(s.wells,2);assert.ok(s.wellSites.every(w=>w.filled&&w.water===2.24));assert.ok(s.deliveries>=2);for(let i=0;i<500;i++)g.update(.033,true);assert.ok(g.snapshot().wellSites.every(w=>w.filled));
});

test('storm warns, hurts an exposed caravan repeatedly, and shelters behind the rock',()=>{
 const old=Math.random;Math.random=()=>.5;try{
  const exposed=dune();for(let i=0;i<600&&exposed.snapshot().storm.phase!=='active';i++)exposed.update(1/60,false);let start=exposed.snapshot();assert.equal(start.storm.phase,'active');for(let i=0;i<50;i++)exposed.update(1/60,false);let end=exposed.snapshot();assert.ok(end.health<=3);assert.ok(end.water<=start.water-1.1);
  const protectedRun=dune();move(protectedRun,protectedRun.snapshot().rock);protectedRun.input('x',true);for(let i=0;i<600&&protectedRun.snapshot().storm.phase!=='active';i++)protectedRun.update(1/60,false);start=protectedRun.snapshot();assert.equal(start.shelter,true);for(let i=0;i<50;i++)protectedRun.update(1/60,false);end=protectedRun.snapshot();assert.equal(end.health,start.health);assert.equal(end.water,start.water);
 }finally{Math.random=old}
});
test('dust devil telegraphs its target and a trimmed manual dodge avoids the lane',()=>{
 const old=Math.random;Math.random=()=>.5;try{const g=dune();for(let i=0;i<600&&g.snapshot().devil?.phase!=='windup';i++)g.update(1/60,false);let s=g.snapshot();assert.equal(s.devil.phase,'windup');const before=s.water;g.input(' ',true);g.input('ArrowUp',true);for(let i=0;i<28;i++)g.update(1/60,false);g.input('ArrowUp',false);s=g.snapshot();assert.ok(s.dodges>=1);for(let i=0;i<35;i++)g.update(1/60,false);assert.notEqual(g.snapshot().message,'DUST DEVIL HIT');assert.ok(g.snapshot().water<=before);
 }finally{Math.random=old}
});

test('AI responds to dust devil warnings and continues the delivery route',()=>{
 const old=Math.random;Math.random=()=>.5;try{const g=dune();for(let i=0;i<60*50;i++)g.update(1/60,true);const s=g.snapshot();assert.ok(s.dodges>0);assert.ok(s.deliveries>=2);assert.ok(s.wells>=2);assert.ok(s.health>=1)}finally{Math.random=old}
});
test('holding shelter at a rock prevents movement',()=>{const g=dune();move(g,g.snapshot().rock);g.input('x',true);g.input('ArrowRight',true);const before=g.snapshot().hero;g.update(.2,false);const after=g.snapshot();assert.equal(after.shelter,true);assert.deepEqual(after.hero,before)});

test('manual wind-shadow detour shelters a parcel and credits its matching outpost',()=>{
 const old=Math.random;Math.random=()=>.5;try{const g=dune();move(g,{x:110,y:432});while(g.snapshot().storm.phase==='calm')g.update(.02,false);const shadow=g.snapshot().caravan.shadow;move(g,shadow.detour);let s=g.snapshot();assert.ok(s.caravan.shadow.committed);assert.ok(s.caravan.shadow.watered);assert.equal(s.caravan.oasisVisits,1);
 move(g,s.rock);g.input('x',true);for(let i=0;i<200&&g.snapshot().storm.phase!=='calm';i++)g.update(.02,false);g.input('x',false);s=g.snapshot();assert.ok(s.caravan.shadow.protected);assert.equal(s.caravan.parcel.destination,s.nextStop);move(g,s.stop);g.input('z',true);s=g.snapshot();assert.equal(s.caravan.protectedDeliveries,1);assert.equal(s.caravan.parcel,null);assert.equal(s.caravan.route[0].protected,true);assert.equal(s.deliveries,1);
 }finally{Math.random=old}
});
test('unprotected storm does not create a parcel and trading refills above seven water',()=>{
 const old=Math.random;Math.random=()=>.5;try{const unattended=dune();for(let i=0;i<300;i++)unattended.update(1/60,false);assert.equal(unattended.snapshot().caravan.parcel,null);const g=dune(),s0=g.snapshot();move(g,s0.stop);const before=g.snapshot();assert.ok(before.water>7&&before.water<11.9);g.input('z',true);const after=g.snapshot();assert.equal(after.water,12);assert.equal(after.caravan.protectedDeliveries,0);assert.equal(after.caravan.route[0].protected,false);
 }finally{Math.random=old}
});
test('AI protects and delivers a storm parcel across several fixed random streams',()=>{
 const old=Math.random;try{for(const value of [.1,.5,.9]){Math.random=()=>value;const g=dune();for(let i=0;i<60*45&&g.snapshot().caravan.protectedDeliveries===0;i++)g.update(1/60,true);const s=g.snapshot();assert.ok(s.caravan.oasisVisits>0);assert.ok(s.caravan.protectedDeliveries>0);assert.ok(s.caravan.route.some(r=>r.protected))}}finally{Math.random=old}
});

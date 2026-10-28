import test from 'node:test';
import assert from 'node:assert/strict';
import {createBurrowGame} from '../src/feature-games11.js';
const step=(g,n,auto=false)=>{for(let i=0;i<n;i++)g.update(1/60,auto)};
test('tremor warns, drops rocks and enrages the boss before magma warns later',()=>{
 const g=createBurrowGame({persona:'SURVEYOR'});step(g,3899);assert.equal(g.snapshot().act.phase,'calm');step(g,1);let s=g.snapshot();assert.equal(s.act.phase,'warn');assert.equal(s.act.type,'tremor');step(g,240);s=g.snapshot();assert.equal(s.act.phase,'live');assert.equal(s.hazards.length,7);assert.ok(s.boss.rage>=419);step(g,660);assert.equal(g.snapshot().act.phase,'calm');step(g,5100);s=g.snapshot();assert.equal(s.act.type,'magma');assert.equal(s.act.phase,'warn');step(g,210);s=g.snapshot();assert.equal(s.act.phase,'live');assert.equal(s.act.hazardLane,29);
});
test('AI surveys a persona-scored trap and heads toward safety during warning',()=>{
 const g=createBurrowGame({persona:'HOOK'});step(g,1,true);let s=g.snapshot();assert.equal(s.persona.name,'HOOK');assert.ok(Number.isFinite(s.plan.quality));assert.ok(Number.isFinite(s.plan.anchorCost));
 const h=createBurrowGame({persona:'SHOWBOAT'});step(h,3900);s=h.snapshot();const before=Math.hypot(s.hero.x-s.act.safe.x,s.hero.y-s.act.safe.y);step(h,10,true);s=h.snapshot();assert.ok(Math.hypot(s.hero.x-s.act.safe.x,s.hero.y-s.act.safe.y)<before);
});
test('manual movement slows in the live magma zone',()=>{
 const g=createBurrowGame({persona:'SURVEYOR'});step(g,3900+240+660+5100+210);g.input('ArrowDown',true);step(g,400);g.input('ArrowDown',false);let s=g.snapshot();assert.ok(s.hero.y>=s.act.hazardLane);const x=s.hero.x;g.input('ArrowRight',true);step(g,1);g.input('ArrowRight',false);assert.ok(Math.abs(g.snapshot().hero.x-x-(.76-.17)/8)<1e-9);
});

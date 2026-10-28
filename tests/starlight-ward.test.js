import test from 'node:test';
import assert from 'node:assert/strict';
import {prism} from '../src/feature-games28.js';
const step=(g,n,auto=false)=>{for(let i=0;i<n;i++)g.update(1/60,auto)};
function moveTo(g,target){for(let i=0;i<700;i++){const p=g.snapshot().p,dx=target.x-p.x,dy=target.y-p.y;if(Math.hypot(dx,dy)<5)break;for(const [key,on] of [['ArrowRight',dx>3],['ArrowLeft',dx< -3],['ArrowDown',dy>3],['ArrowUp',dy< -3]])g.input(key,on);g.update(1/60,false)}for(const k of ['ArrowRight','ArrowLeft','ArrowDown','ArrowUp'])g.input(k,false)}
const tap=(g,k)=>{g.input(k,true);g.input(k,false)};
test('only the vault is unlocked and remote device actions are ignored',()=>{
 const g=prism();let s=g.snapshot();assert.deepEqual(s.rooms.map(r=>r.unlocked),[true,false,false]);const before=s.rooms[0].prism.orientation;tap(g,'x');assert.equal(g.snapshot().rooms[0].prism.orientation,before);
 moveTo(g,{x:58.5,y:360});g.input('ArrowUp',true);step(g,40);g.input('ArrowUp',false);assert.ok(g.snapshot().p.y>=354,'locked gate blocks passage');
});
test('manual alignment charges both vault emitters and unlocks the orrery',()=>{
 const g=prism();moveTo(g,g.snapshot().rooms[0].prism);tap(g,'x');step(g,11);moveTo(g,g.snapshot().rooms[0].mirror);tap(g,' ');step(g,55);let s=g.snapshot();assert.equal(s.rooms[0].restored,true);assert.ok(s.manualScore>=85);assert.equal(s.manualScore,s.score);assert.equal(s.rooms[1].unlocked,true);assert.equal(s.rooms[2].unlocked,false);assert.ok(s.rooms[0].emitters.every(e=>e.charge>=42));
 moveTo(g,{x:58.5,y:365});g.input('ArrowUp',true);step(g,35);g.input('ArrowUp',false);assert.ok(g.snapshot().p.y<354,'opened gate permits passage');
});
test('AI restores all three rooms and begins another alignment cycle',()=>{
 const g=prism();let saw=[false,false,false],restored=false;for(let i=0;i<60*90;i++){g.update(1/60,true);const s=g.snapshot();s.rooms.forEach((r,j)=>saw[j]||=r.unlocked);if(s.counters.restorations){restored=true;break}}assert.deepEqual(saw,[true,true,true]);assert.ok(restored);assert.ok(g.snapshot().stage>=1);assert.equal(g.snapshot().manualScore,0);
});
test('reflected lens energizes when the moving beam endpoint enters its target',()=>{const g=prism();moveTo(g,g.snapshot().rooms[0].mirror);tap(g,' ');let found;for(let i=0;i<60;i++){g.update(1/120,false);const m=g.snapshot().rooms[0].mirror,e=g.snapshot().rooms[0].emitters[1];if(e.powered){found={angle:m.angle,charge:e.charge};break}}assert.ok(found);assert.ok(found.angle<42,'geometry reaches the lens before the mirror finishes turning');assert.ok(found.charge>0)});
test('manual keeper is blocked by the upper room wall away from doorways',()=>{const g=prism();g.input('ArrowUp',true);step(g,60);g.input('ArrowUp',false);let s=g.snapshot();assert.ok(s.p.y>=420,'central wall blocks the high ledge');assert.ok(s.p.x>63&&s.p.x<210);g.input('ArrowLeft',true);step(g,45);g.input('ArrowLeft',false);g.input('ArrowUp',true);step(g,45);g.input('ArrowUp',false);s=g.snapshot();assert.ok(s.p.y<420,'side passage allows approach to the closed gate');assert.ok(s.p.y>=354,'locked gate remains closed')});

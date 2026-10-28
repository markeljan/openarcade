import test from 'node:test';
import assert from 'node:assert/strict';
import { dam } from '../src/feature-games25.js';
const press=g=>{g.input(' ',true);g.input(' ',false);g.update(.25,false)};
function move(g,x,y){for(const [axis,target,neg,pos] of [['x',x,'ArrowLeft','ArrowRight'],['y',y,'ArrowUp','ArrowDown']]){const d=target-g.snapshot().p[axis];if(d){const k=d<0?neg:pos;g.input(k,true);g.update(Math.abs(d)/80,false);g.input(k,false)}}}
test('three gnaws yield a log and the built gate lets stranded kits cross',()=>{
 const g=dam();move(g,131,340);press(g);assert.equal(g.snapshot().gate.timer,0);
 move(g,45,135);press(g);press(g);assert.equal(g.snapshot().logs.length,0);press(g);assert.equal(g.snapshot().logs.length,1);
 for(let i=0;i<300&&!g.snapshot().carry;i++){const s=g.snapshot(),l=s.logs[0];assert.ok(l,'log washed away before retrieval');const dx=l.x-s.p.x,dy=l.y-s.p.y;for(const [k,on] of [['ArrowLeft',dx<-8],['ArrowRight',dx>8],['ArrowUp',dy<-8],['ArrowDown',dy>8]])g.input(k,on);g.update(1/60,false);if(Math.hypot(dx,dy)<22)press(g)}for(const k of ['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'])g.input(k,false);assert.equal(g.snapshot().carry,true);
 move(g,131,340);press(g);assert.equal(g.snapshot().bays[3].built,true);assert.equal(g.snapshot().kits[0].state,'stranded');press(g);assert.ok(g.snapshot().gate.timer>0);
 for(let i=0;i<600;i++)g.update(1/60,false);assert.equal(g.snapshot().rescued,2);assert.equal(g.snapshot().bays[3].built,true);
});
test('autoplay repairs bays, rescues kits and restores habitats',()=>{
 const g=dam();let done=false;for(let i=0;i<24000;i++){g.update(1/60,true);const s=g.snapshot();if(s.rescued===2&&s.habitats===4&&s.bays.every(b=>b.built&&!b.breach)){done=true;break}}assert.ok(done);
});
test('floating timber follows the channel and washes through an open dam',()=>{const g=dam();move(g,45,135);press(g);press(g);press(g);const initial=g.snapshot().logs[0];for(let i=0;i<60;i++)g.update(1/60,false);assert.notEqual(g.snapshot().logs[0].x,initial.x);for(let i=0;i<600&&g.snapshot().logs.length;i++)g.update(1/60,false);const s=g.snapshot();assert.equal(s.lostLogs,1);assert.equal(s.logs.length,0);assert.notEqual(initial.x,120)});
test('AI lines up upstream and family assistance reinforces a current-guided placement',()=>{const g=dam();let sawApproach=false,sawAssistance=false,placed=false;for(let i=0;i<12000;i++){g.update(1/60,true);const s=g.snapshot();if(s.currentBuild?.phase==='approach')sawApproach=true;if(s.currentBuild?.assists>0)sawAssistance=true;if(s.bays.some(b=>b.weave>0)){placed=true;assert.ok(s.bays.some(b=>b.weave>0&&b.integrity>=2));break}}assert.ok(sawApproach&&sawAssistance&&placed)});

import test from 'node:test';
import assert from 'node:assert/strict';
import {prism} from '../src/feature-games28.js';
const step=(g,n,auto=false)=>{for(let i=0;i<n;i++)g.update(1/60,auto)};const tap=(g,k)=>{g.input(k,true);g.input(k,false)};
test('a shadow investigates, warns, lunges and drains its targeted lens',()=>{
 const g=prism();let phases=new Set(),startCharge=0,drained=false;for(let i=0;i<300;i++){g.update(1/60,false);const s=g.snapshot(),shadow=s.shadows[0];if(shadow){phases.add(shadow.state);if(shadow.state==='windup')startCharge=s.lenses[shadow.target][shadow.kind];if(shadow.state==='retreat'&&s.lenses[shadow.target][shadow.kind]<startCharge)drained=true}if(drained)break}assert.ok(phases.has('investigate')&&phases.has('windup')&&phases.has('lunge'));assert.ok(drained);
});
test('manual shield needs a charged nearby lens and has a cooldown',()=>{
 const g=prism();tap(g,'z');assert.equal(g.snapshot().pulse,0);step(g,50);let s=g.snapshot(),q=s.receivers[0].split;for(let i=0;i<150;i++){s=g.snapshot();let dx=q.x-s.p.x,dy=q.y-s.p.y;if(Math.hypot(dx,dy)<20)break;g.input('ArrowLeft',dx< -2);g.input('ArrowRight',dx>2);g.input('ArrowUp',dy< -2);g.input('ArrowDown',dy>2);g.update(1/60,false)}for(const k of ['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'])g.input(k,false);tap(g,'z');s=g.snapshot();assert.ok(s.pulse>0);assert.ok(s.shieldCooldown>0);
});
test('AI responds to shadow threats while continuing to seal breaches',()=>{
 const g=prism();step(g,900,true);const s=g.snapshot();assert.ok(s.shadowSerial>0);assert.ok(s.sealed>0);assert.ok(s.hp>0);
});

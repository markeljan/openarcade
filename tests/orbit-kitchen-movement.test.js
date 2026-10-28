import test from 'node:test';
import assert from 'node:assert/strict';
import {createKitchen} from '../src/feature-games23.js';
const step=(g,n,auto=false)=>{for(let i=0;i<n;i++)g.update(1/60,auto)};
test('manual chef accelerates and coasts in zero gravity, then boots damp momentum',()=>{const g=createKitchen();g.input('ArrowRight',true);step(g,1);let first=g.snapshot().p.vx;step(g,10);let p=g.snapshot().p;assert.ok(p.vx>first);g.input('ArrowRight',false);const oldX=p.x,oldV=p.vx;step(g,1);p=g.snapshot().p;assert.ok(p.x>oldX);assert.ok(p.vx>0&&p.vx<oldV);const before=p.vx;g.input('x',true);g.input('x',false);assert.ok(Math.abs(g.snapshot().p.vx-before*.48)<1e-9);step(g,6);assert.ok(g.snapshot().p.vx<before*.2)});
test('AI uses physical movement while completing meals',()=>{const g=createKitchen();let accelerating=false;for(let i=0;i<10000;i++){const prev=g.snapshot();g.update(1/60,true);const s=g.snapshot();accelerating ||= Math.hypot(s.p.vx-prev.p.vx,s.p.vy-prev.p.vy)>1;if(s.served>=2){assert.ok(accelerating);return}}assert.fail('AI did not serve two meals')});

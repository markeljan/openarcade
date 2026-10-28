import test from 'node:test';
import assert from 'node:assert/strict';
import {lift} from '../src/feature-games26.js';
test('manual balance centers a lone passenger and leaves an empty action on cooldown',()=>{const g=lift();assert.equal(g.snapshot().imbalance,-1);g.input('z',true);g.input('z',false);let s=g.snapshot();assert.equal(s.passengers[0].seat,0);assert.equal(s.imbalance,0);assert.ok(s.balanceCooldown>0);for(let i=0;i<120;i++)g.update(1/60,false);assert.ok(Number.isFinite(g.snapshot().balance))});
test('AI carries seated passengers and continues the rescue',()=>{const g=lift();let seated=false;for(let i=0;i<4000;i++){g.update(1/60,true);let s=g.snapshot();seated ||= s.passengers.length>0&&s.passengers.every(p=>[-1,0,1].includes(p.seat));if(s.rescue.phase==='safe'){assert.ok(seated);assert.ok(s.delivered>=2);return}}assert.fail('rescue did not finish')});

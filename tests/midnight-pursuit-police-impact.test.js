import test from 'node:test';
import assert from 'node:assert/strict';
import {pursuit} from '../src/feature-games9.js';
for(const auto of [false,true])test(`${auto?'AI':'manual'} police contact causes one impact then observes its cooldown`,()=>{
 const cues=[],g=pursuit(e=>cues.push(e),{cops:[{x:120,y:410,kind:'cruiser',disabled:0}]});g.update(1/60,auto);let s=g.snapshot();assert.equal(s.damage,8);assert.ok(s.impactCd>0);assert.equal(cues.filter(c=>c==='pursuit-crash').length,1);for(let i=0;i<15;i++)g.update(1/60,auto);s=g.snapshot();assert.equal(s.damage,8);assert.equal(cues.filter(c=>c==='pursuit-crash').length,1);
});
test('a van contact deals the reference heavier impact',()=>{const g=pursuit(()=>{},{cops:[{x:120,y:410,kind:'van',disabled:0}]});g.update(1/60,false);assert.equal(g.snapshot().damage,13)});

test('airborne car passes a police contact without damage',()=>{for(const auto of [false,true]){const g=pursuit(()=>{},{air:.5,cops:[{x:120,y:410,kind:'cruiser',disabled:0}]});g.update(1/60,auto);assert.equal(g.snapshot().damage,0);assert.equal(g.snapshot().impactCd,0)}});

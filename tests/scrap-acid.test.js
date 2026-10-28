import test from 'node:test';
import assert from 'node:assert/strict';
import {scrap,scrapAcidTick} from '../src/feature-games6.js';
const seeded=fn=>{const old=Math.random;let n=42;Math.random=()=>((n=(Math.imul(n,1664525)+1013904223)>>>0)/2**32);try{fn()}finally{Math.random=old}};
test('acid pulses only on the rig cadence, in range, and without invulnerability',()=>{const p=[{x:37.5,y:265.5,r:16.5}],c={x:37.5,y:265.5,inv:0};assert.equal(scrapAcidTick(c,0,35/60,36/60,p),true);assert.equal(scrapAcidTick(c,0,34/60,35/60,p),false);c.inv=1;assert.equal(scrapAcidTick(c,0,35/60,36/60,p),false);c.inv=0;c.x=100;assert.equal(scrapAcidTick(c,0,35/60,36/60,p),false)});
test('manual steering can drive a rig into the acid and take damage',()=>seeded(()=>{const g=scrap();let hit=false;for(let i=0;i<600&&!hit;i++){const s=g.snapshot(),c=s.cars[0],p=s.puddles[0],a=Math.atan2(p.y-c.y,p.x-c.x),d=((a-c.a+Math.PI*3)%(Math.PI*2))-Math.PI;g.input('ArrowLeft',d<-.08);g.input('ArrowRight',d>.08);g.input('ArrowUp',true);g.update(1/60,false);hit=(g.snapshot().cars[0].acidHits||0)>0}assert.ok(hit);assert.ok(g.snapshot().cars[0].hp<100)}));
test('AI rigs encounter the authored puddles during a match',()=>seeded(()=>{const g=scrap();let hit=false;for(let i=0;i<1800&&!hit;i++){g.update(1/60,true);hit=g.snapshot().cars.some(c=>c.acidHits>0)}assert.ok(hit)}));

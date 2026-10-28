import test from 'node:test';
import assert from 'node:assert/strict';
import {wing,ghost} from '../src/feature-games7.js';
test('manual dive banks on downhill and release launches on the rising slope',()=>{const g=wing();g.input('ArrowDown',true);for(let i=0;i<120;i++)g.update(1/60,false);assert.ok(g.snapshot().energy>3);g.input('ArrowDown',false);let launched=false;for(let i=0;i<400;i++){g.update(1/60,false);if(g.snapshot().launches){launched=true;break}}assert.ok(launched,'release did not launch');assert.ok(!g.snapshot().grounded)});
test('AI repeatedly banks, launches, lands and strikes forts',()=>{const old=Math.random;Math.random=()=>.5;try{const g=wing();for(let i=0;i<7200;i++)g.update(1/60,true);const s=g.snapshot();assert.ok(s.launches>=2,`launches ${s.launches}`);assert.ok(s.landings>=1,`landings ${s.landings}`);assert.ok(s.score>0,'no forts struck')}finally{Math.random=old}});
test('Ghost Shift sibling still updates and draws',()=>{const g=ghost(),noop=()=>{},c=new Proxy({},{get:()=>noop,set:()=>true});for(let i=0;i<120;i++)g.update(1/60,true);assert.doesNotThrow(()=>g.draw(c))});

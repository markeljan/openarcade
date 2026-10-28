import test from 'node:test';
import assert from 'node:assert/strict';
import {machineHunt,machineHuntSawtoothMove} from '../src/feature-games.js';

test('Sawtooth circles either direction at artillery distance and can reverse',()=>{
 const hero={x:0,y:0};for(const orbit of [-1,1]){const r={x:110,y:0,orbit};machineHuntSawtoothMove(r,hero,1,()=>1);assert.ok(Math.abs(r.x-110)<1e-8);assert.equal(Math.sign(r.y),-orbit);assert.equal(r.orbit,orbit)}
 const r={x:110,y:0,orbit:1};machineHuntSawtoothMove(r,hero,1/60,()=>0);assert.equal(r.orbit,-1);
});

test('manual and AI encounters see alerted Sawtooth orbit before pouncing',()=>{
 const old=Math.random;try{for(const auto of [false,true]){let seed=42;Math.random=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/2**32);const game=machineHunt();if(!auto){game.input('ArrowUp',true);game.input('x',true)}let seen=false;
 for(let i=0;i<60*120;i++){game.update(1/60,auto);const s=game.snapshot();if(s.robots.some(r=>r.kind===2&&r.detect>=100&&r.orbit!==undefined&&r.windCd>0)){seen=true;break}if(!auto&&s.gameOver)break}assert.ok(seen,`${auto?'AI':'manual'} should see the circling phase`)
 }}finally{Math.random=old}
});

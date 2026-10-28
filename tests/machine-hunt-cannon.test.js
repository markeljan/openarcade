import test from 'node:test';
import assert from 'node:assert/strict';
import {machineHunt,machineHuntCannonStep,machineHuntAdvanceShot} from '../src/feature-games.js';

test('cannon waits one alerted second, fires only at artillery range and resets for 110 frames',()=>{
 const boss={};for(let i=0;i<59;i++)assert.equal(machineHuntCannonStep(boss,120,1/60),false);assert.equal(machineHuntCannonStep(boss,120,1/60),true);for(let i=0;i<110;i++)assert.equal(machineHuntCannonStep(boss,30,1/60),false);assert.equal(machineHuntCannonStep(boss,120,1/60),true);
});

test('a cannon shot travels for 90 frames and follows camera movement',()=>{
 const shot={x:0,y:0,vx:204,vy:0,life:1.5};for(let i=0;i<89;i++)assert.equal(machineHuntAdvanceShot(shot,1/60,1),true);assert.equal(machineHuntAdvanceShot(shot,1/60,1),false);assert.ok(Math.abs(shot.x-306)<1e-8);assert.equal(shot.y,90);
});

test('manual and AI encounters receive twin finite-lived Thunderjaw shots',()=>{
 const old=Math.random;try{for(const auto of [false,true]){let seed=1;Math.random=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/2**32);const game=machineHunt();if(!auto){game.input('ArrowUp',true);game.input('x',true)}let shots=null;for(let i=0;i<60*120;i++){game.update(1/60,auto);const s=game.snapshot();if(s.shots.length>=2){shots=s.shots;break}if(!auto&&s.gameOver)break}assert.ok(shots,`${auto?'AI':'manual'} should encounter twin cannon fire`);assert.ok(shots.every(s=>s.life>0&&s.life<=1.5));assert.notEqual(shots[0].vx,shots[1].vx);}}finally{Math.random=old}
});

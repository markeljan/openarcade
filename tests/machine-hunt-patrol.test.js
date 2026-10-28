import test from 'node:test';
import assert from 'node:assert/strict';
import {machineHunt,machineHuntPatrolStep} from '../src/feature-games.js';

test('unaware machines patrol around home; suspicious machines approach the hunter',()=>{
 const robot={x:100,y:100,kind:0,detect:0};machineHuntPatrolStep(robot,{x:200,y:200},1,()=>.75);
 assert.ok(robot.x>100&&robot.y>100);assert.ok(Math.hypot(robot.x-100,robot.y-100)<=126*.28+1e-8);
 const before={x:robot.x,y:robot.y},hunter={x:200,y:200};robot.detect=45;machineHuntPatrolStep(robot,hunter,1);
 assert.ok(Math.hypot(robot.x-hunter.x,robot.y-hunter.y)<Math.hypot(before.x-hunter.x,before.y-hunter.y));
 assert.ok(Math.abs(Math.hypot(robot.x-before.x,robot.y-before.y)-126*.4)<1e-8);
});

test('manual and AI encounters contain physically patrolling machines',()=>{
 const original=Math.random;try{for(const auto of [false,true]){let seed=42;Math.random=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/2**32);const game=machineHunt();if(!auto)game.input('ArrowUp',true);let patrol=false;
  for(let i=0;i<60*120;i++){const a=game.snapshot();game.update(1/60,auto);const b=game.snapshot();for(const r of a.robots.filter(r=>r.detect<45&&r.homeX!==undefined&&!r.mode)){const next=b.robots.find(q=>q.band===r.band&&q.homeX===r.homeX);if(next&&Math.hypot(next.x-r.x,next.y-r.y-(b.scroll-a.scroll))>.01){patrol=true;break}}if(patrol||b.gameOver)break}
  assert.ok(patrol,`${auto?'AI':'manual'} should encounter an actual patrol`);
 }}finally{Math.random=original}
});


test('machines patrol before they scroll into view during manual and AI play',()=>{
 const old=Math.random;try{for(const auto of [false,true]){let seed=42;Math.random=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/2**32);const game=machineHunt();game.update(0,auto);let before=game.snapshot();const r=before.robots.find(m=>m.y<0&&m.homeX!==undefined);assert.ok(r,'offscreen machine should have a patrol');
 for(let i=0;i<30;i++)game.update(1/60,auto);const after=game.snapshot(),m=after.robots.find(x=>x.band===r.band&&x.homeX===r.homeX);assert.ok(m);assert.ok(Math.hypot(m.x-r.x,m.y-r.y-(after.scroll-before.scroll))>1,'offscreen patrol advances in world coordinates');
 }}finally{Math.random=old}
});

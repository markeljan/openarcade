import test from 'node:test';
import assert from 'node:assert/strict';
import {webslam,applyWebSlamWall} from '../src/feature-games5.js';

test('charged opposing touches spread wall damage and an already-open panel scores',()=>{
 const walls=[Array(8).fill(0),Array(8).fill(0)];
 assert.deepEqual(applyWebSlamWall(walls,1,3,-1,4),{breach:false,damaged:false});
 assert.deepEqual(applyWebSlamWall(walls,1,3,1,4),{breach:false,damaged:false});
 assert.deepEqual(applyWebSlamWall(walls,1,3,0,4),{breach:false,damaged:true});
 assert.deepEqual(walls[1],[0,1,1,1,1,1,0,0]);
 assert.deepEqual(applyWebSlamWall(walls,1,3,0,1),{breach:false,damaged:true});
 assert.equal(walls[1][3],2);assert.equal(applyWebSlamWall(walls,1,3,0,1).breach,true);
});

test('manual controls move and jump; automatic players continue a timed match',()=>{
 const g=webslam(),start=g.snapshot();g.input('ArrowRight',true);for(let i=0;i<30;i++)g.update(1/60,false);g.input('ArrowRight',false);assert.ok(g.snapshot().fighters[0].x>start.fighters[0].x);
 g.input(' ',true);g.input(' ',false);g.update(1/60,false);assert.ok(g.snapshot().fighters[0].y<640);
 let progressed=false;for(let i=0;i<7200;i++){g.update(1/60,true);if(i%60===0){const s=g.snapshot();assert.ok(Number.isFinite(s.ball.x));progressed||=s.clock<120||s.ended>0}}assert.ok(progressed,'automatic match should leave the countdown');
});
test('manual and AI racket hits send the ball at reference-scaled speed toward the opposing wall',()=>{const old=Math.random;try{for(const auto of [false,true]){let seed=1;Math.random=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/2**32);let sounds=[];const g=webslam({sound:x=>sounds.push(x)}),seen=new Set();for(let i=0;i<10000&&seen.size<2;i++){const a=g.snapshot();if(!auto){g.input('ArrowLeft',a.ball.x<a.fighters[0].x-5);g.input('ArrowRight',a.ball.x>a.fighters[0].x+5);if(a.ball.y<a.fighters[0].y-65){g.input(' ',true);g.input(' ',false)}g.input('x',true);g.input('x',false)}sounds=[];g.update(1/60,auto);if(sounds.includes('web-hit')){const s=g.snapshot(),i=s.ball.last,base=(s.ball.vx-s.fighters[i].vx*.45)*(i?-1:1);assert.ok(base>=444-1e-6&&base<=576+1e-6);assert.ok(s.ball.vy<=-216&&s.ball.vy>=-432);seen.add(i)}}assert.deepEqual([...seen].sort(),[0,1])}}finally{Math.random=old}});

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
 for(let i=0;i<7200;i++)g.update(1/60,true);const s=g.snapshot();assert.ok(Number.isFinite(s.ball.x));assert.ok(s.clock<120||s.ended>0);
});

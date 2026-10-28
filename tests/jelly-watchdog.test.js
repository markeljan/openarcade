import test from 'node:test';
import assert from 'node:assert/strict';
import {race,jellyWatchdog,jellyTouchesCrown} from '../src/feature-games2.js';
test('watchdog resets stalled racers and reseats them only on ladder courses',()=>{
 let bean={x:20,y:400,minY:400,stall:0,skill:1,recoveries:0,vx:3,vy:8,ground:false};let platforms=[{x:40,y:390,w:50},{x:10,y:475,w:200}];assert.equal(jellyWatchdog(bean,platforms,5,false),false);assert.equal(jellyWatchdog(bean,platforms,.1,false),true);assert.equal(bean.x,65);assert.equal(bean.y,390);assert.equal(bean.recoveries,1);
 let door={x:20,y:400,minY:400,stall:5,skill:1,recoveries:0};assert.equal(jellyWatchdog(door,platforms,.1,true),true);assert.equal(door.x,20);
});
test('crown contact requires proximity in both axes',()=>{
 assert.ok(jellyTouchesCrown({x:120,y:-100},120,-100));assert.equal(jellyTouchesCrown({x:135,y:-100},120,-100),false);assert.equal(jellyTouchesCrown({x:120,y:-120},120,-100),false);
});
test('manual idle and automatic racers remain finite as watchdogs operate',()=>{
 const game=race({firstCourse:1});for(let i=0;i<510;i++)game.update(1/60,false);let s=game.snapshot();assert.ok(s.player.recoveries>=1||s.player.done||s.player.eliminated);for(let i=0;i<6000;i++)game.update(1/60,true);s=game.snapshot();assert.ok(s.beans.every(b=>Number.isFinite(b.x)&&Number.isFinite(b.y)));
});


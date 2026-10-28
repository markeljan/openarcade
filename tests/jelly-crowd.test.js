import test from 'node:test';
import assert from 'node:assert/strict';
import {race,pushJellyCrowd} from '../src/feature-games2.js';
test('nearby active racers push apart, while finished racers do not',()=>{
 const a={x:80,y:100,vx:0,vy:0},b={x:86,y:102,vx:0,vy:0},c={x:84,y:102,vx:0,vy:0,done:true};pushJellyCrowd([a,b,c],1/60);assert.ok(a.x<80&&b.x>86);assert.ok(a.vx<0&&b.vx>0);assert.equal(c.x,84);
});
test('manual and automatic racers remain finite in a crowded round',()=>{
 const g=race({firstCourse:0});for(let i=0;i<100;i++)g.update(1/60,false);g.input('ArrowRight',true);g.input(' ',true);for(let i=0;i<120;i++)g.update(1/60,false);g.input('ArrowRight',false);g.input(' ',false);let s=g.snapshot();assert.ok(s.player.x>35);assert.ok(s.beans.every(b=>Number.isFinite(b.x)&&Number.isFinite(b.vx)));
 for(let i=0;i<60*80&&g.snapshot().round===0;i++)g.update(1/60,true);s=g.snapshot();assert.ok(s.round>0||s.phase==='OVER');
});

import test from 'node:test';
import assert from 'node:assert/strict';
import {race,jellyShouldDive} from '../src/feature-games2.js';
test('AI dive choices require the finish or crown window',()=>{
 const b={x:120,y:100,vy:-30,ground:false,dive:false,stun:0,player:true};assert.equal(jellyShouldDive(b,0,0,120,1/60,()=>0),false);b.y=50;assert.equal(jellyShouldDive(b,0,0,120,1/60,()=>0),true);b.y=0;assert.equal(jellyShouldDive(b,2,0,120,1/60,()=>0),true);b.x=160;assert.equal(jellyShouldDive(b,2,0,120,1/60,()=>0),false);b.ground=true;assert.equal(jellyShouldDive(b,0,0,120,1/60,()=>0),false);
});
test('manual dive keeps its pose until landing and then recovers',()=>{
 let seed=42,old=Math.random;Math.random=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/2**32);try{let g=race({firstCourse:1});for(let i=0;i<160;i++)g.update(1/60,false);g.input(' ',true);g.input(' ',false);g.update(1/60,false);g.input('x',true);g.input('x',false);assert.equal(g.snapshot().player.dive,true);for(let i=0;i<12;i++)g.update(1/60,false);let s=g.snapshot();assert.equal(s.player.dive,true);for(let i=0;i<100&&!g.snapshot().player.ground;i++)g.update(1/60,false);s=g.snapshot();assert.equal(s.player.ground,true);assert.equal(s.player.dive,0);assert.ok(s.player.stun>0)}finally{Math.random=old}
});

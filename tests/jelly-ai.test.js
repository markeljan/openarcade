import test from 'node:test';
import assert from 'node:assert/strict';
import {chooseJellyDoor,jellyArmDistance,race} from '../src/feature-games2.js';
test('rivals reconsider remembered fake doors and favor open doors',()=>{
 const bean={x:50,skill:.8,player:false,doorMemory:[]},fake={row:0,x:50,real:false,open:false,bonks:0},real={row:0,x:100,real:true,open:false,bonks:0};assert.equal(chooseJellyDoor(bean,[fake,real],()=>0),fake);bean.doorMemory=['0:50'];assert.equal(chooseJellyDoor(bean,[fake,real],()=>0),real);fake.open=true;assert.equal(chooseJellyDoor(bean,[fake,real],()=>0),fake);
});
test('sweeper lookahead measures both arms at the future angle',()=>{
 const sweep=[{x:100,y:100,len:30,phase:0,dir:1}];assert.equal(jellyArmDistance(sweep,80,100,0,'none'),0);assert.ok(jellyArmDistance(sweep,80,100,0,'none',.5)>10);
});
test('automatic racers carry individual skills and progress through hazards',()=>{
 const game=race({firstCourse:1,modifier:'frenzy'});let s=game.snapshot();assert.equal(s.player.skill,1);assert.ok(s.beans.filter(b=>!b.player).every(b=>b.skill>=.8&&b.skill<.95));for(let i=0;i<60*78&&game.snapshot().round===0;i++)game.update(1/60,true);s=game.snapshot();assert.ok(s.finished>0||s.round>0||s.phase==='OVER');
});

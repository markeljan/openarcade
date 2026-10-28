import test from 'node:test';
import assert from 'node:assert/strict';
import {race,hitJellyDoor} from '../src/feature-games2.js';
test('real doors open and fake doors stay shut after repeated contact',()=>{
 let real={real:true,open:false,bonks:0},fake={real:false,open:false,bonks:0};assert.equal(hitJellyDoor(real),true);assert.equal(real.open,true);assert.equal(hitJellyDoor(fake),false);assert.equal(hitJellyDoor(fake),false);assert.equal(fake.bonks,2);assert.equal(fake.open,false);
});
test('each Door Dash wall has at least one real and one fake door and AI plays the race',()=>{
 const g=race({firstCourse:0});let s=g.snapshot();for(let row=0;row<14;row++){const doors=s.doors.filter(d=>d.row===row);assert.ok(doors.some(d=>d.real));assert.ok(doors.some(d=>!d.real))}
 for(let i=0;i<60*80&&g.snapshot().round===0;i++)g.update(1/60,true);s=g.snapshot();assert.ok(s.round>0||s.phase==='OVER');
});

import test from 'node:test';
import assert from 'node:assert/strict';
import {reconsiderJellyDoor,race} from '../src/feature-games2.js';
test('racer commits to a door and switches only when another opens',()=>{
 const bean={x:50,skill:.8,player:false,doorMemory:[],choiceRow:null,choiceX:null,doorReconsider:0};const a={row:0,x:50,real:false,open:false,bonks:0},b={row:0,x:110,real:true,open:false,bonks:0};assert.equal(reconsiderJellyDoor(bean,[a,b],0,.1,'none',()=>0),a);bean.x=110;assert.equal(reconsiderJellyDoor(bean,[a,b],0,.6,'none',()=>0),a);b.open=true;assert.equal(reconsiderJellyDoor(bean,[a,b],0,.6,'none',()=>0),b);
});
test('manual eliminated player spectates while AI navigates staggered doors',()=>{
 const g=race({firstCourse:0});for(let i=0;i<60*80&&!g.snapshot().spectating;i++)g.update(1/60,false);const s=g.snapshot();assert.ok(s.spectating);for(let i=0;i<60*10;i++)g.update(1/60,false);assert.ok(g.snapshot().beans.every(b=>Number.isFinite(b.x)));
});

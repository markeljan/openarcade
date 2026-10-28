import test from 'node:test';
import assert from 'node:assert/strict';
import {resolveRallyRegister,robots} from '../src/feature-games12.js';
const setup=()=>[{x:2,y:9,dir:1,hp:3},{x:4,y:9,dir:3,hp:3},{x:5,y:9,dir:0,hp:3},{x:0,y:1,dir:0,hp:3}];
const cmds=['MOVE','MOVE','MOVE','BRAKE'];
test('final register pulls a nearby third robot into a physical pileup',()=>{const r=resolveRallyRegister(setup(),cmds,0,0,'movement',null,{round:1,slot:4});assert.deepEqual(r.bots.slice(0,3).map(b=>[b.x,b.y,b.hp]),[[2,9,2],[4,9,2],[5,9,2]]);});
test('ordinary register lets the third robot move and avoids damage',()=>{const r=resolveRallyRegister(setup(),cmds,0,0,'movement',null,{round:1,slot:1});assert.deepEqual([r.bots[2].x,r.bots[2].y,r.bots[2].hp],[5,8,3]);});
test('manual and automatic races continue through multiple rounds',()=>{for(const auto of [false,true]){const g=robots();if(!auto)g.input('ArrowUp',true);for(let i=0;i<3600;i++)g.update(1/60,auto);assert.ok(g.snapshot().round>3);}});

test('collision holds only the robots whose locked destinations conflict',()=>{
 const bots=[{x:1,y:10,dir:1,hp:3},{x:2,y:10,dir:1,hp:3},{x:3,y:10,dir:1,hp:3}];
 const r=resolveRallyRegister(bots,['MOVE','MOVE','BRAKE'],0,0,'movement',null,{round:1,slot:0});
 assert.deepEqual(r.bots.map(b=>[b.x,b.y,b.hp]),[[2,10,3],[2,10,2],[3,10,2]]);
});
test('third-round magnetic pileup holds and damages the nearest third racer',()=>{
 const r=resolveRallyRegister(setup(),cmds,0,0,'movement',null,{round:3,slot:0});
 assert.deepEqual([r.bots[2].x,r.bots[2].y,r.bots[2].hp],[5,9,2]);
});

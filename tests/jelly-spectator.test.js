import test from 'node:test';
import assert from 'node:assert/strict';
import {race} from '../src/feature-games2.js';
const context=()=>new Proxy({},{get:(o,k)=>o[k]??(()=>{}),set:(o,k,v)=>(o[k]=v,true)});
function seeded(seed,fn){const old=Math.random;Math.random=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/2**32);try{fn()}finally{Math.random=old}}
test('door walls alternate three and two offset slots',()=>seeded(7,()=>{
 const s=race({firstCourse:0}).snapshot(),even=s.doors.filter(d=>d.row===0),odd=s.doors.filter(d=>d.row===1);assert.equal(even.length,3);assert.equal(odd.length,2);assert.ok(even.every(d=>odd.every(q=>Math.abs(d.x-q.x)>15)));
}));
test('a human elimination switches to spectator camera and follows tournament play',()=>seeded(42,()=>{
 const calls=[],g=race({firstCourse:2,modifier:'hungry',records:{finish:v=>calls.push(v)}});let s;for(let i=0;i<60*100;i++){g.update(1/60,false);s=g.snapshot();if(s.spectating)break}assert.ok(s.spectating);assert.equal(calls.length,1);const round=s.round;let advanced=false;
 for(let i=0;i<60*100;i++){g.update(1/60,false);s=g.snapshot();if(s.round!==round){advanced=true;break}}assert.ok(advanced,'the tournament continues after elimination');g.draw(context());s=g.snapshot();const live=s.beans.filter(b=>!b.done&&!b.eliminated).sort((a,b)=>a.y-b.y);if(live.length&&!s.winner)assert.equal(s.camera,Math.max(0,Math.min(110-s.finishY,340-live[0].y)));assert.equal(calls.length,1);
}));

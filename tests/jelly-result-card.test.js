import test from 'node:test';
import assert from 'node:assert/strict';
import {race} from '../src/feature-games2.js';
function seeded(seed,fn){const old=Math.random;Math.random=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/2**32);try{fn()}finally{Math.random=old}}
test('manual game over remains centered while AI continues, then resets after twelve seconds',()=>seeded(42,()=>{
 const calls=[],g=race({firstCourse:2,modifier:'hungry',records:{finish:v=>calls.push(v),best:()=>0}});let s;for(let i=0;i<60*100;i++){g.update(1/60,false);s=g.snapshot();if(s.spectating)break}assert.ok(s.spectating);assert.equal(s.resultHold,12);assert.equal(s.resultReason,'ROUND 1');let labels=[];const ctx=new Proxy({fillText(t,x,y){labels.push({t,x,y})}},{get:(o,k)=>o[k]??(()=>{}),set:(o,k,v)=>(o[k]=v,true)});g.draw(ctx);const title=labels.find(l=>l.t==='GAME OVER');assert.ok(title);assert.equal(title.x,120);assert.ok(title.y>200&&title.y<300);const round=s.round;let advanced=false;for(let i=0;i<719;i++){g.update(1/60,false);s=g.snapshot();if(s.round>round)advanced=true}assert.ok(advanced);assert.ok(s.spectating);g.update(1/60,false);s=g.snapshot();assert.equal(s.spectating,false);assert.equal(s.attract,true);assert.equal(s.round,0);assert.equal(calls.length,1);assert.equal(g.canTakeover(),false);
}));

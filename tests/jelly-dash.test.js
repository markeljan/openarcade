import test from 'node:test';
import assert from 'node:assert/strict';
import {race} from '../src/feature-games2.js';
function context(){let round='',qual='',player=null;const ctx=new Proxy({arc(x,y,r){if(ctx.fillStyle==='#ff78a9'&&r===9)player={x,y}},fillText(s){if(/^R\d /.test(s))round=s;if(/^Q /.test(s))qual=s}}, {get:(o,k)=>o[k]??(()=>{}),set:(o,k,v)=>(o[k]=v,true)});return {ctx,read:()=>({round,qual,player})}}
function seeded(seed,fn){const orig=Math.random;Math.random=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/2**32);try{return fn()}finally{Math.random=orig}}
test('Jelly Dash AI qualifies across distinct tournament courses',()=>{
 for(const seed of [1,2,3,42,1337,98765,305419896,3735928559]) for(let firstCourse=0;firstCourse<3;firstCourse++)seeded(seed,()=>{
  const game=race({firstCourse}), {ctx,read}=context(), seen=new Map(),entered=new Map();let prior='',restarted=false;
  for(let frame=0;frame<60*240;frame++){game.update(1/60,true);if(frame%30===0){game.draw(ctx);const {round,qual}=read(),count=Number(qual.match(/\d+/)?.[0]||0);if(prior.startsWith('R3 ')&&round.startsWith('R1 '))restarted=true;if(round!==prior&&!entered.has(round))entered.set(round,frame/60);prior=round;if(count>0&&!seen.has(round))seen.set(round,frame/60)}}
  assert.ok([...seen.keys()].some(v=>v.startsWith('R1 ')));
  assert.ok([...seen.keys()].some(v=>v.startsWith('R2 ')));
  assert.ok([...seen.keys()].some(v=>v==='R3 FALL MOUNTAIN'));
  assert.ok(restarted,`seed ${seed}, course ${firstCourse} should restart after the final`);
  for(const [round,at] of seen)assert.ok(at-entered.get(round)<80,`seed ${seed}: ${round} should qualify before timeout`);
 });
});
test('Jelly Dash manual movement, jump and dive control player',()=>seeded(42,()=>{
 const game=race({firstCourse:1}),{ctx,read}=context();for(let i=0;i<160;i++)game.update(1/60,false);game.draw(ctx);const start=read().player;
 game.input('ArrowRight',true);game.input(' ',true);for(let i=0;i<15;i++)game.update(1/60,false);game.draw(ctx);const jumping=read().player;
 assert.ok(jumping.x>start.x+10);assert.ok(jumping.y<start.y-20);
 game.input('b',true);game.update(1/60,false);const dive=game.snapshot().player;assert.ok(dive.dive>0,'dive starts while airborne');assert.ok(dive.vx>0,'dive travels in the facing direction');
}));

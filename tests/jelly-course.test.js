import test from 'node:test';
import assert from 'node:assert/strict';
import {race} from '../src/feature-games2.js';
const seed=(n,fn)=>{const old=Math.random;Math.random=()=>((n=(Math.imul(n,1664525)+1013904223)>>>0)/2**32);try{fn()}finally{Math.random=old}};
test('opening courses contain fourteen ascending rows and camera follows manual progress',()=>seed(4,()=>{
 const g=race({firstCourse:1});let s=g.snapshot();assert.equal(s.platforms.filter(p=>!p.bonus).length,15);assert.ok(s.finishY<0);
 let progressed=false,scrolled=false;for(let i=0;i<60*30&&g.snapshot().round===0;i++){s=g.snapshot();if(s.phase==='RACE'&&s.player&&!s.player.done){const p=s.player,next=s.platforms.filter(q=>q.y<p.y-5).sort((a,b)=>b.y-a.y)[0];if(next){g.input('ArrowRight',p.x<next.x+18);g.input('ArrowLeft',p.x>next.x+next.w-18)}if(p.ground){g.input(' ',true);g.input(' ',false)}}g.update(1/60,false);s=g.snapshot();if(s.player?.y<300)progressed=true;const noop=()=>{};g.draw(new Proxy({}, {get:(o,k)=>o[k]??noop,set:(o,k,v)=>(o[k]=v,true)}));if(g.snapshot().camera>0)scrolled=true}
 assert.ok(progressed);assert.ok(scrolled);
}));
test('AI reaches an opening-course finish before the reference timeout',()=>seed(42,()=>{
 const g=race({firstCourse:0});let s;for(let i=0;i<60*70;i++){g.update(1/60,true);s=g.snapshot();if(s.finished)break}assert.ok(s.finished>0);assert.ok(s.time<75);assert.ok(s.beans.some(b=>b.done&&b.y<s.finishY));
}));

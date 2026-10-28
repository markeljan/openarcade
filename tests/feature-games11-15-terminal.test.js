import test from 'node:test';
import assert from 'node:assert/strict';
import {createFeatureGame15} from '../src/feature-games15.js';

for(const [id,make] of [['dungeon-relay',createFeatureGame15],['gravity-claw',createFeatureGame15]]){
 test(`${id} retains manual result and AI recovers`,t=>{
  const originalRandom=Math.random, originals=Object.fromEntries(['window','ResizeObserver','requestAnimationFrame','cancelAnimationFrame'].map(k=>[k,globalThis[k]]));
  t.after(()=>{Math.random=originalRandom;Object.assign(globalThis,originals)});
  let seed=42,now=0,seq=0,texts=[],floors=new Set();Math.random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296};
  globalThis.window={devicePixelRatio:1};globalThis.ResizeObserver=class{observe(){}disconnect(){}};const scheduled=new Map(),listeners=new Map(),noop=()=>{};
  globalThis.requestAnimationFrame=fn=>{const i=++seq;scheduled.set(i,fn);return i};globalThis.cancelAnimationFrame=i=>scheduled.delete(i);
  const ctx=new Proxy({fillStyle:'',fillText(s){texts.push(String(s))},fillRect(x,y,w,h){if(id==='dungeon-relay'&&w===19&&h===19&&(this.fillStyle==='#303e3b'||this.fillStyle==='#53675b'))floors.add(`${(x-10)/20},${(y-82)/20}`)}},{get:(o,k)=>o[k]??noop,set:(o,k,v)=>(o[k]=v,true)});
  const canvas={getContext:()=>ctx,getBoundingClientRect:()=>({left:0,top:0,width:240,height:540}),setAttribute:noop,addEventListener:(k,fn)=>listeners.set(k,fn),removeEventListener:k=>listeners.delete(k)};
  const game=make(canvas,id,{interactive:true});const step=()=>{now+=1000/60;texts=[];floors=new Set();const pending=[...scheduled.values()];scheduled.clear();pending.forEach(fn=>fn(now))};
  const press=key=>{listeners.get('keydown')({key,preventDefault:noop});listeners.get('keyup')({key,preventDefault:noop})};
  function lose(){
   step();
   if(id==='dungeon-relay'){
    const targets=new Set(['7,7','5,3']),q=[['1,11',[]]],seen=new Set(['1,11']);let route;
    while(q.length){const [pos,path]=q.shift();if(targets.has(pos)){route=path;break}const [x,y]=pos.split(',').map(Number);for(const [dx,dy,key] of [[1,0,'ArrowRight'],[-1,0,'ArrowLeft'],[0,1,'ArrowDown'],[0,-1,'ArrowUp']]){const next=`${x+dx},${y+dy}`;if(next!=='9,1'&&floors.has(next)&&!seen.has(next)){seen.add(next);q.push([next,[...path,key]])}}}
    assert.ok(route,'enemy should be reachable in generated maze');
    for(let n=0;n<3;n++)for(const key of route){press(key);step()}
   }else{for(let n=0;n<18000&&!texts.includes('GAME OVER');n++)step()}
   assert.ok(texts.includes('GAME OVER'),`${id} did not reach game over`);
  }
  lose();for(let n=0;n<600;n++)step();assert.ok(texts.includes('GAME OVER'),'manual result must persist');
  seed=42;game.restart();step();assert.ok(!texts.includes('GAME OVER'),'restart must clear result');lose();game.setInteractive(false);for(let n=0;n<300;n++)step();assert.ok(!texts.includes('GAME OVER'),'AI must recover');game.destroy();assert.equal(scheduled.size,0);
 });
}

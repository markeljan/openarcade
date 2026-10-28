import test from 'node:test';
import assert from 'node:assert/strict';
import { createFeatureGame4 } from '../src/feature-games4.js';

test('Rune Swarm keeps a manual result until restart and preview recovers', t=>{
  const random=Math.random, originals=Object.fromEntries(['window','ResizeObserver','requestAnimationFrame','cancelAnimationFrame'].map(k=>[k,globalThis[k]]));
  t.after(()=>{Math.random=random;Object.assign(globalThis,originals)});
  let seed=42,sequence=0,now=0,text=[];Math.random=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296);
  const scheduled=new Map(),noop=()=>{};globalThis.window={devicePixelRatio:1};globalThis.ResizeObserver=class{observe(){}disconnect(){}};
  globalThis.requestAnimationFrame=fn=>{scheduled.set(++sequence,fn);return sequence};globalThis.cancelAnimationFrame=id=>scheduled.delete(id);
  const ctx=new Proxy({fillText(s){text.push(String(s))}},{get:(o,k)=>o[k]??noop,set:(o,k,v)=>(o[k]=v,true)});
  const canvas={getContext:()=>ctx,getBoundingClientRect:()=>({left:0,top:0,width:240,height:540}),setAttribute:noop,focus:noop,addEventListener:noop,removeEventListener:noop};
  const game=createFeatureGame4(canvas,'rune-swarm',{interactive:true});
  const step=()=>{now+=1000/60;text=[];const next=[...scheduled.values()];scheduled.clear();next.forEach(fn=>fn(now))};
  let n=0;while(!text.includes('RUN OVER')&&n++<30000)step();
  assert.ok(text.includes('RUN OVER'),'idle manual run should reach a result');
  for(let i=0;i<600;i++)step();assert.ok(text.includes('RUN OVER'),'manual result must remain visible');
  game.restart();step();assert.ok(!text.includes('RUN OVER'),'restart clears the result');
  n=0;while(!text.includes('RUN OVER')&&n++<30000)step();assert.ok(text.includes('RUN OVER'));
  game.setInteractive(false);for(let i=0;i<300;i++)step();assert.ok(!text.includes('RUN OVER'),'AI should start another run');
  game.destroy();assert.equal(scheduled.size,0);
});

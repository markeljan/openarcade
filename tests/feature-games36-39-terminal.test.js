import test from 'node:test';
import assert from 'node:assert/strict';
import { createFeatureGame36 } from '../src/feature-games36.js';

for (const [id, make] of [['ashen-courier',createFeatureGame36]]) {
  test(`${id} returns manual terminal runs to attract mode`, t => {
    const originalRandom=Math.random;
    const originals=Object.fromEntries(['window','ResizeObserver','requestAnimationFrame','cancelAnimationFrame'].map(key=>[key,globalThis[key]]));
    t.after(()=>{Math.random=originalRandom;Object.assign(globalThis,originals)});
    let seed=42,sequence=0,now=0,text=[];
    Math.random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296};
    globalThis.window={devicePixelRatio:1};globalThis.ResizeObserver=class {observe(){} disconnect(){}};
    const scheduled=new Map(),listeners=new Map(),noop=()=>{};
    globalThis.requestAnimationFrame=fn=>{const n=++sequence;scheduled.set(n,fn);return n};
    globalThis.cancelAnimationFrame=n=>scheduled.delete(n);
    const ctx=new Proxy({fillText(value){text.push(String(value))}}, {get:(object,key)=>object[key]??noop,set:(object,key,value)=>(object[key]=value,true)});
    const canvas={getContext:()=>ctx,getBoundingClientRect:()=>({left:0,top:0,width:320,height:720}),setAttribute:noop,focus:noop,addEventListener:(key,fn)=>listeners.set(key,fn),removeEventListener:key=>listeners.delete(key)};
    let handoffs=0;const game=make(canvas,id,{interactive:true,onAttract:()=>handoffs++});
    const step=()=>{now+=1000/60;text=[];const pending=[...scheduled.values()];scheduled.clear();pending.forEach(fn=>fn(now))};
    let frames=0;while(!text.includes('GAME OVER') && frames++<18000)step();
    assert.ok(text.includes('GAME OVER'),`${id} did not reach a manual terminal state`);
    for(let i=0;i<120;i++)step();
    assert.equal(handoffs,1,'manual finish hands off once to the player UI');
    assert.equal(canvas.tabIndex,-1);
    assert.ok(!text.includes('GAME OVER'),'attract run restarted');
    game.setInteractive(true);assert.equal(canvas.tabIndex,0);
    step();assert.equal(handoffs,1,'manual takeover is retained');
    frames=0;while(!text.includes('GAME OVER') && frames++<18000)step();
    assert.ok(text.includes('GAME OVER'),'second manual run reaches a terminal state');
    for(let i=0;i<120;i++)step();assert.equal(handoffs,2);
    game.destroy();assert.equal(scheduled.size,0);
  });
}

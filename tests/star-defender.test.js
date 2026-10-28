import test from 'node:test';
import assert from 'node:assert/strict';
import { createMoreGame } from '../src/more-games.js';

test('Star Defender retains its score and advances waves during autoplay', t => {
  const originals = Object.fromEntries(['performance','window','ResizeObserver','requestAnimationFrame','cancelAnimationFrame'].map(key=>[key,globalThis[key]]));
  t.after(()=>Object.assign(globalThis,originals));
  let now=0, sequence=0, status='';
  const scheduled=new Map(), listeners=new Map(), noop=()=>{};
  globalThis.performance={now:()=>now};
  globalThis.window={devicePixelRatio:1};
  globalThis.ResizeObserver=class {observe(){} disconnect(){}};
  globalThis.requestAnimationFrame=callback=>{const id=++sequence;scheduled.set(id,callback);return id};
  globalThis.cancelAnimationFrame=id=>scheduled.delete(id);
  const ctx=new Proxy({fillText(value){if(value.startsWith('WAVE '))status=value}}, {get:(object,key)=>object[key]??noop,set:(object,key,value)=>(object[key]=value,true)});
  const canvas={getContext:()=>ctx,getBoundingClientRect:()=>({width:320,height:240}),setAttribute:noop,addEventListener:(key,fn)=>listeners.set(key,fn),removeEventListener:key=>listeners.delete(key)};
  const game=createMoreGame(canvas,'star-defender');
  const runFrames=count=>{for(let i=0;i<count;i++){now+=1000/60;const callbacks=[...scheduled.values()];scheduled.clear();callbacks.forEach(callback=>callback(now))}};
  runFrames(1800);
  const [,wave,score]=status.match(/WAVE (\d+)\s+SCORE (\d+)/).map(Number);
  assert.ok(wave>=2,`expected a later wave, got ${status}`);
  assert.ok(score>=24,`expected score to survive wave completion, got ${status}`);
  game.setInteractive(true);
  game.restart();
  runFrames(180);
  assert.match(status,/WAVE 01\s+SCORE 0$/);
  listeners.get('keydown')({key:' ',preventDefault:noop});
  runFrames(240);
  assert.ok(Number(status.match(/SCORE (\d+)/)[1])>0,`manual firing should still hit enemies: ${status}`);
  listeners.get('keyup')({key:' ',preventDefault:noop});
  game.destroy();
});

test('Star Defender autoplay keeps advancing with bounded enemy movement', t => {
  const keys=['performance','window','ResizeObserver','requestAnimationFrame','cancelAnimationFrame'];
  const originals=Object.fromEntries(keys.map(key=>[key,globalThis[key]]));
  const originalRandom=Math.random;
  t.after(()=>{Object.assign(globalThis,originals);Math.random=originalRandom});
  const noop=()=>{};
  globalThis.window={devicePixelRatio:1};
  globalThis.ResizeObserver=class {observe(){} disconnect(){}};
  // A frozen wall clock models fast offline rendering and catches accumulated drift.
  globalThis.performance={now:()=>1400};
  for (const initialSeed of [1,42,98765,0x12345678]) {
    let seed=initialSeed,sequence=0,status=''; const scheduled=new Map();
    Math.random=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/2**32);
    globalThis.requestAnimationFrame=callback=>{const id=++sequence;scheduled.set(id,callback);return id};
    globalThis.cancelAnimationFrame=id=>scheduled.delete(id);
    const ctx=new Proxy({fillText(value){if(value.startsWith('WAVE '))status=value}}, {get:(o,k)=>o[k]??noop,set:(o,k,v)=>(o[k]=v,true)});
    const canvas={getContext:()=>ctx,getBoundingClientRect:()=>({width:320,height:240}),setAttribute:noop,addEventListener:noop,removeEventListener:noop};
    const game=createMoreGame(canvas,'star-defender');
    const samples=[];
    for(let frame=1;frame<=3600;frame++){
      const callbacks=[...scheduled.values()];scheduled.clear();callbacks.forEach(cb=>cb(frame*1000/60));
      if(frame===1800||frame===3600) samples.push(Number(status.match(/SCORE (\d+)/)?.[1]||0));
    }
    assert.ok(samples[0]>=24,`seed ${initialSeed}: ${status}`);
    assert.ok(samples[1]>samples[0],`seed ${initialSeed}: score stalled at ${samples}`);
    game.destroy();
  }
});

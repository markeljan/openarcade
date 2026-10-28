import test from 'node:test';
import assert from 'node:assert/strict';
import {createExtraGame} from '../src/extra-games.js';

// Maze Runner has a static HUD. Each completed maze generates a new wall
// layout, so observing distinct wall paths verifies that the AI reaches exits.
for (const initialSeed of [1, 42]) test(`Maze Runner solves generated mazes (seed ${initialSeed})`,()=>{
  let seed=initialSeed, nextId=0, pending=new Map(), currentPath=[], layouts=new Set();
  const oldRandom=Math.random;
  Math.random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/0x100000000};
  globalThis.window={devicePixelRatio:1};
  globalThis.ResizeObserver=class {observe(){} disconnect(){}};
  globalThis.requestAnimationFrame=fn=>{let id=++nextId;pending.set(id,fn);return id};
  globalThis.cancelAnimationFrame=id=>pending.delete(id);
  const ctx=new Proxy({}, {get(obj,key){if(key in obj)return obj[key];if(key==='beginPath')return ()=>{currentPath=[]};if(key==='moveTo'||key==='lineTo')return (x,y)=>currentPath.push(`${key}:${x},${y}`);if(key==='stroke')return ()=>{if(currentPath.length>20)layouts.add(currentPath.join(';'))};return ()=>{}},set(obj,key,value){obj[key]=value;return true}});
  const listeners=new Map(),noop=()=>{};
  const canvas={width:320,height:720,getContext:()=>ctx,getBoundingClientRect:()=>({left:0,top:0,width:320,height:720}),setAttribute:noop,focus:noop,addEventListener:(name,fn)=>listeners.set(name,fn),removeEventListener:(name,fn)=>{if(listeners.get(name)===fn)listeners.delete(name)}};
  let game;
  try {
    game=createExtraGame(canvas,'maze',{interactive:false});
    for(let frame=1;frame<=3600;frame++){let next=[...pending.values()];pending.clear();for(const callback of next)callback(frame*1000/60)}
    assert.ok(layouts.size>=2,`expected a completed maze, observed ${layouts.size} layout(s)`);
  } finally {game?.destroy();Math.random=oldRandom;}
  assert.equal(pending.size,0);
});

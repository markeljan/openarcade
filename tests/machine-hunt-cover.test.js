import test from 'node:test';
import assert from 'node:assert/strict';
import {createFeatureGame} from '../src/feature-games.js';

test('Machine Hunt cover hides a stationary hunter and movement reveals them',()=>{
  const oldRandom=Math.random;let seed=0x7acafe12,scheduled,id=0,labels=[],frame=0;
  Math.random=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/0x100000000);
  const noop=()=>{},listeners=new Map();globalThis.window={devicePixelRatio:1};globalThis.ResizeObserver=class{observe(){} disconnect(){}};
  globalThis.requestAnimationFrame=fn=>(scheduled=fn,++id);globalThis.cancelAnimationFrame=()=>{scheduled=null};
  const context=new Proxy({fillText(text){labels.push(text)}},{get:(o,k)=>k in o?o[k]:noop,set:(o,k,v)=>(o[k]=v,true)});
  const canvas={getContext:()=>context,getBoundingClientRect:()=>({width:320,height:720}),setAttribute:noop,addEventListener(k,v){listeners.set(k,v)},removeEventListener(k){listeners.delete(k)}};
  const game=createFeatureGame(canvas,'machine-hunt',{interactive:true});
  const step=()=>{labels=[];scheduled(++frame*1000/60)};
  try {while(frame<1200&&!labels.includes('HIDDEN IN COVER')){listeners.get('keydown')({key:'ArrowUp',preventDefault:noop});step();listeners.get('keyup')({key:'ArrowUp',preventDefault:noop});step();}
    assert.ok(labels.includes('HIDDEN IN COVER'),'hunter never entered cover');
    listeners.get('keydown')({key:'ArrowRight',preventDefault:noop});step();
    assert.ok(!labels.includes('HIDDEN IN COVER'),'moving hunter remained hidden');
  } finally {game.destroy();Math.random=oldRandom;}
});

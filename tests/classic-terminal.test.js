import test from 'node:test';
import assert from 'node:assert/strict';
import {createGame} from '../src/games.js';

for(const id of ['snake','breakout','pong','orbit','flappy','dodge']) test(`${id} holds the manual result and resumes AI`,t=>{
  const originals=Object.fromEntries(['window','ResizeObserver','requestAnimationFrame','cancelAnimationFrame'].map(k=>[k,globalThis[k]])),oldRandom=Math.random;
  t.after(()=>{Object.assign(globalThis,originals);Math.random=oldRandom});
  let seed=42,sequence=0,time=0,labels=[];Math.random=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296);
  const callbacks=new Map(),listeners=new Map(),noop=()=>{};globalThis.window={devicePixelRatio:1};globalThis.ResizeObserver=class{observe(){}disconnect(){}};
  globalThis.requestAnimationFrame=fn=>{callbacks.set(++sequence,fn);return sequence};globalThis.cancelAnimationFrame=n=>callbacks.delete(n);
  const ctx=new Proxy({fillText(value){labels.push(String(value))}},{get:(o,k)=>o[k]??noop,set:(o,k,v)=>(o[k]=v,true)});
  const canvas={getContext:()=>ctx,getBoundingClientRect:()=>({left:0,top:0,width:320,height:720}),setAttribute:noop,focus:noop,addEventListener:(k,fn)=>listeners.set(k,fn),removeEventListener:k=>listeners.delete(k)};
  const game=createGame(canvas,id,{interactive:true});
  const key=(value,down)=>listeners.get(down?'keydown':'keyup')?.({key:value,preventDefault:noop});
  const step=()=>{time+=1000/60;labels=[];const next=[...callbacks.values()];callbacks.clear();next.forEach(fn=>fn(time))};
  const finished=()=>labels.includes('RESTART TO PLAY AGAIN');
  let frame=0;while(!finished()&&frame++<18000){if(id==='orbit'&&frame%120===1){key(frame%240===1?'ArrowRight':'ArrowLeft',true);key(frame%240===1?'ArrowLeft':'ArrowRight',false)}step()}
  assert.ok(finished(),`${id} must reach a result in this scripted manual run`);
  const result=labels.find(s=>['GAME OVER','POINT LOST','POINT WON','BOARD CLEAR'].includes(s));assert.ok(result);
  for(let i=0;i<300;i++)step();assert.ok(finished(),`${id} result must remain until restart`);
  game.restart();step();assert.ok(!finished(),`${id} should reset when asked`);
  frame=0;while(!finished()&&frame++<18000){if(id==='orbit'&&frame%120===1){key(frame%240===1?'ArrowRight':'ArrowLeft',true);key(frame%240===1?'ArrowLeft':'ArrowRight',false)}step()}
  assert.ok(finished(),`${id} must reach another result`);game.setInteractive(false);step();assert.ok(!finished(),`${id} should return to autoplay`);
  game.destroy();assert.equal(callbacks.size,0);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import {createExtraGame} from '../src/extra-games.js';

function harness(t, make, id, callback=()=>{}) {
 const keys=['window','ResizeObserver','requestAnimationFrame','cancelAnimationFrame'];
 const saved=Object.fromEntries(keys.map(key=>[key,globalThis[key]])),random=Math.random;
 const pending=new Map(),all=new Map();let seq=0,now=0,draws=0;
 t.after(()=>{Object.assign(globalThis,saved);Math.random=random;});
 Math.random=()=>.5;
 globalThis.window={devicePixelRatio:1};
 globalThis.ResizeObserver=class{observe(){}disconnect(){}};
 globalThis.requestAnimationFrame=fn=>{const n=++seq;pending.set(n,fn);all.set(n,fn);return n;};
 globalThis.cancelAnimationFrame=id=>pending.delete(id);
 const noop=()=>{},ctx=new Proxy({setTransform(){draws++;}},{get:(o,k)=>o[k]??noop,set:(o,k,v)=>(o[k]=v,true)});
 const canvas={getContext:()=>ctx,getBoundingClientRect:()=>({left:0,top:0,width:320,height:240}),setAttribute:noop,focus:noop,addEventListener:noop,removeEventListener:noop};
 const player=make(canvas,id,{interactive:true,onResult:callback});
 return {player,pending,get draws(){return draws;},fire(id){all.get(id)(now+=50);},step(){const entry=pending.entries().next().value;if(entry){pending.delete(entry[0]);entry[1](now+=50);}}};
}

for(const [name,make,id] of [['extras',createExtraGame,'lander']]) {
 test(`${name}: a canceled callback cannot consume the replacement frame`,t=>{
  const h=harness(t,make,id),old=h.pending.keys().next().value;
  h.player.pause();h.player.resume();const replacement=h.pending.keys().next().value;
  assert.notEqual(old,replacement);h.fire(old);
  assert.equal(h.draws,0);assert.deepEqual([...h.pending.keys()],[replacement]);
  h.step();assert.equal(h.pending.size,1);h.player.destroy();assert.equal(h.pending.size,0);
  const draws=h.draws;h.fire(old);h.fire(replacement);assert.equal(h.draws,draws);assert.equal(h.pending.size,0);
 });
 test(`${name}: restart invalidates the previous callback before a new run`,t=>{
  const h=harness(t,make,id),old=h.pending.keys().next().value;h.player.restart();
  const replacement=h.pending.keys().next().value;h.fire(old);
  assert.equal(h.draws,0);assert.deepEqual([...h.pending.keys()],[replacement]);h.player.destroy();
 });
 test(`${name}: actual terminal pause/resume skips the old draw and leaves one frame`,t=>{
  let h,terminalDraws,results=0;
  h=harness(t,make,id,()=>{results++;terminalDraws=h.draws;h.player.pause();h.player.resume();});
  for(let n=0;n<1800&&!results;n++)h.step();
  assert.equal(results,1);assert.equal(h.draws,terminalDraws);assert.equal(h.pending.size,1);
  h.player.destroy();assert.equal(h.pending.size,0);
 });
 test(`${name}: actual terminal destruction cannot draw or schedule afterward`,t=>{
  let h,terminalDraws,results=0;
  h=harness(t,make,id,()=>{results++;terminalDraws=h.draws;h.player.destroy();});
  for(let n=0;n<1800&&!results;n++)h.step();
  assert.equal(results,1);assert.equal(h.draws,terminalDraws);assert.equal(h.pending.size,0);
 });
}

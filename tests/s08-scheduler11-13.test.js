import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

const cases=[[11,'tower-panic'],[12,'idol-escape'],[13,'castle-crasher']];
async function harness(number,id,{onResult,paused=false,terminal=true}={}){
 const names=['window','ResizeObserver','requestAnimationFrame','cancelAnimationFrame','__s08Scheduler'],saved=new Map(names.map(k=>[k,globalThis[k]]));
 let serial=0,updates=0,draws=0,canvasDraws=0;const pending=new Map(),callbacks=new Map(),results=[],noop=()=>{};
 globalThis.window={devicePixelRatio:1};globalThis.ResizeObserver=class{observe(){}disconnect(){}};
 globalThis.requestAnimationFrame=fn=>{const id=++serial;pending.set(id,fn);callbacks.set(id,fn);return id};
 globalThis.cancelAnimationFrame=id=>pending.delete(id);
 globalThis.__s08Scheduler=({finish})=>({input(){},update(){updates++;if(terminal)finish({score:7,result:'COMPLETE'})},draw(){draws++}});
 let source=await readFile(new URL(`../src/feature-games${number}.js`,import.meta.url),'utf8');
 source=source.replace("'./audio.js'",JSON.stringify(new URL('../src/audio.js',import.meta.url).href)).replace("'./scores/run.js'",JSON.stringify(new URL('../src/scores/run.js',import.meta.url).href));
 source+=`\nfactories[${JSON.stringify(id)}]=(_sound,options)=>globalThis.__s08Scheduler(options);`;
 const module=await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));
 const ctx=new Proxy({},{get:()=>()=>{canvasDraws++},set:()=>true}),canvas={getContext:()=>ctx,getBoundingClientRect:()=>({width:320,height:720}),setAttribute:noop,addEventListener:noop,removeEventListener:noop};
 const player=module[`createFeatureGame${number}`](canvas,id,{interactive:true,paused,onResult(record){results.push(record);onResult?.(player)}});
 return {player,pending,results,get updates(){return updates},get draws(){return draws},get canvasDraws(){return canvasDraws},first(){return pending.keys().next().value},fire(id,time=50){pending.delete(id);callbacks.get(id)(time)},replay(id,time=50){callbacks.get(id)(time)},close(){player.destroy();for(const [key,value]of saved){if(value===undefined)delete globalThis[key];else globalThis[key]=value}}};
}
for(const [number,id]of cases){
 for(const action of ['pause','destroy'])test(`${id}: onResult ${action} stops draw and rescheduling inside the active frame`,async()=>{
  const h=await harness(number,id,{onResult:player=>player[action]()});try{const first=h.first();h.fire(first);assert.equal(h.results.length,1);assert.equal(h.updates,1);assert.equal(h.draws,0);assert.equal(h.canvasDraws,0);assert.equal(h.pending.size,0);h.replay(first);assert.equal(h.updates,1);assert.equal(h.canvasDraws,0);assert.equal(h.pending.size,0);}finally{h.close()}
 });
 test(`${id}: onResult pause and resume leaves one new frame and invalidates the running epoch`,async()=>{
  const h=await harness(number,id,{onResult:player=>{player.pause();player.resume();player.resume()}});try{const first=h.first();h.fire(first);assert.equal(h.results.length,1);assert.equal(h.pending.size,1);assert.equal(h.canvasDraws,0);const resumed=h.first();assert.notEqual(resumed,first);h.replay(first,100);assert.equal(h.first(),resumed);assert.equal(h.pending.size,1);assert.equal(h.updates,1);h.fire(resumed,100);assert.equal(h.draws,1);assert.equal(h.results.length,1);assert.equal(h.pending.size,1);h.player.destroy();const count=h.canvasDraws;h.replay(resumed,150);assert.equal(h.pending.size,0);assert.equal(h.canvasDraws,count);}finally{h.close()}
 });
 test(`${id}: a delayed canceled frame cannot consume or overwrite the resumed pending ticket`,async()=>{
  const h=await harness(number,id,{terminal:false});try{const canceled=h.first();h.player.pause();assert.equal(h.pending.size,0);h.player.resume();h.player.resume();const resumed=h.first();assert.notEqual(resumed,canceled);assert.equal(h.pending.size,1);h.replay(canceled);assert.equal(h.updates,0);assert.equal(h.canvasDraws,0);assert.equal(h.first(),resumed);h.fire(resumed,100);assert.equal(h.updates,1);assert.equal(h.draws,1);const successor=h.first();h.replay(canceled,150);assert.equal(h.first(),successor);assert.equal(h.pending.size,1);assert.equal(h.updates,1);h.player.pause();h.replay(successor,200);assert.equal(h.updates,1);assert.equal(h.pending.size,0);}finally{h.close()}
 });
 test(`${id}: paused construction and repeated resume schedule at most one frame`,async()=>{
  const h=await harness(number,id,{paused:true,terminal:false});try{assert.equal(h.pending.size,0);h.player.resume();h.player.resume();assert.equal(h.pending.size,1);const frame=h.first();h.player.destroy();h.replay(frame);assert.equal(h.pending.size,0);assert.equal(h.updates,0);assert.equal(h.canvasDraws,0);}finally{h.close()}
 });
}

import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

const entries=[[14,'kaiju-control'],[14,'moonshine-valley'],[15,'dungeon-relay'],[15,'gravity-claw'],[16,'ricochet-foundry'],[16,'lantern-line']];
async function fixture(number,id){
 let source=await readFile(new URL(`../src/feature-games${number}.js`,import.meta.url),'utf8');
 source=source.replace("'./audio.js'",JSON.stringify(new URL('../src/audio.js',import.meta.url).href)).replace("'./scores/run.js'",JSON.stringify(new URL('../src/scores/run.js',import.meta.url).href));
 const args=id==='gravity-claw'?'(_records,_sound,finish)':'(_sound,finish)';
 source+=`\nexport const probe={updates:0,draws:0,factories:0,complete:false};factories[${JSON.stringify(id)}]=${args}=>{probe.factories++;return {input(){},update(){probe.updates++;if(probe.complete)finish({score:7,result:'COMPLETE'})},draw(){probe.draws++}}};`;
 return import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));
}
function harness(make,id,options={}){
 const names=['window','ResizeObserver','requestAnimationFrame','cancelAnimationFrame'],saved=Object.fromEntries(names.map(name=>[name,globalThis[name]]));
 let serial=0,time=0;const tasks=new Map(),listeners=new Map(),noop=()=>{};
 globalThis.window={devicePixelRatio:1};globalThis.ResizeObserver=class{observe(){}disconnect(){}};
 globalThis.requestAnimationFrame=callback=>{tasks.set(++serial,callback);return serial};globalThis.cancelAnimationFrame=handle=>tasks.delete(handle);
 const ctx=new Proxy({},{get:()=>noop,set:()=>true}),canvas={getContext:()=>ctx,getBoundingClientRect:()=>({width:320,height:720}),setAttribute:noop,addEventListener:(key,value)=>listeners.set(key,value),removeEventListener:key=>listeners.delete(key)};
 const player=make(canvas,id,{interactive:true,...options});
 return {player,tasks,listeners,step(dt=50){time+=dt;const pending=[...tasks.values()];tasks.clear();for(const fn of pending)fn(time)},close(){player.destroy();Object.assign(globalThis,saved)}};
}
for(const [number,id] of entries)for(const action of ['pause','pause-resume','destroy','restart','error-pause-resume'])test(`${id} single frame slot survives onResult ${action}`,async()=>{
 const mod=await fixture(number,id);Object.assign(mod.probe,{updates:0,draws:0,factories:0,complete:true});let notifications=0,h;
 const hResult=()=>{notifications++;if(action==='error-pause-resume')throw Error('consumer error');if(action==='destroy')h.player.destroy();else if(action==='restart')h.player.restart();else{h.player.pause();if(action==='pause-resume')h.player.resume()}};
 h=harness(mod[`createFeatureGame${number}`],id,{onResult:hResult,onError(){h.player.pause();h.player.resume()}});
 try{
  assert.equal(h.tasks.size,1);h.step();assert.equal(notifications,1);assert.equal(mod.probe.updates,1);assert.equal(mod.probe.draws,0,'interrupted tick cannot draw after the callback');
  const running=['pause-resume','error-pause-resume','restart'].includes(action);assert.equal(h.tasks.size,running?1:0,'only the resumed or restarted frame may remain');
  if(running){mod.probe.complete=false;h.step();assert.equal(h.tasks.size,1);assert.equal(mod.probe.draws,1);assert.equal(mod.probe.updates,action==='restart'?2:1,'a terminal must not run another update');h.player.resume();assert.equal(h.tasks.size,1)}
  if(action==='destroy')assert.equal(h.listeners.size,0);
 }finally{h.close()}
});

for(const [number,id] of entries)test(`${id} canceled callbacks cannot update, draw or consume a newer ticket`,async()=>{
 const mod=await fixture(number,id);Object.assign(mod.probe,{updates:0,draws:0,factories:0,complete:false});const h=harness(mod[`createFeatureGame${number}`],id);
 try{
  h.step();assert.equal(mod.probe.updates,1);const canceled=[...h.tasks.values()][0];h.player.pause();assert.equal(h.tasks.size,0);
  canceled(1000);assert.equal(mod.probe.updates,1);assert.equal(mod.probe.draws,1);assert.equal(h.tasks.size,0);
  h.player.resume();h.player.resume();const active=[...h.tasks.entries()][0];assert.equal(h.tasks.size,1);
  canceled(2000);assert.deepEqual([...h.tasks.entries()],[active],'stale delivery cannot clear the live frame slot');assert.equal(mod.probe.updates,1);assert.equal(mod.probe.draws,1);
  h.step();assert.equal(mod.probe.updates,2);assert.equal(mod.probe.draws,2);assert.equal(h.tasks.size,1);
  canceled(3000);assert.equal(mod.probe.updates,2);assert.equal(mod.probe.draws,2);assert.equal(h.tasks.size,1);
  const beforeRestart=[...h.tasks.values()][0];h.player.restart();const restarted=[...h.tasks.entries()][0];assert.equal(h.tasks.size,1);beforeRestart(4000);assert.deepEqual([...h.tasks.entries()],[restarted]);assert.equal(mod.probe.updates,2);assert.equal(mod.probe.draws,2);
  h.step();assert.equal(mod.probe.updates,3);assert.equal(mod.probe.draws,3);const beforeClose=[...h.tasks.values()][0];h.player.destroy();beforeClose(5000);canceled(6000);assert.equal(mod.probe.updates,3);assert.equal(mod.probe.draws,3);assert.equal(h.tasks.size,0);
 }finally{h.close()}
});

for(const [number,id] of entries)test(`${id} preview throttle owns one ticket after pause and resume`,async()=>{
 const mod=await fixture(number,id);Object.assign(mod.probe,{updates:0,draws:0,factories:0,complete:false});const h=harness(mod[`createFeatureGame${number}`],id,{interactive:false});
 try{
  h.step(50);h.step(10);assert.equal(mod.probe.updates,1);assert.equal(mod.probe.draws,1);assert.equal(h.tasks.size,1);
  const throttled=[...h.tasks.values()][0];h.player.pause();h.player.resume();const live=[...h.tasks.entries()][0];throttled(1000);assert.deepEqual([...h.tasks.entries()],[live]);assert.equal(mod.probe.updates,1);assert.equal(mod.probe.draws,1);
  h.step(50);assert.equal(mod.probe.updates,2);assert.equal(mod.probe.draws,2);assert.equal(h.tasks.size,1);
 }finally{h.close()}
});

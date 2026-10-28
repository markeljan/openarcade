import test from 'node:test';
import assert from 'node:assert/strict';
import {createFeatureGame31} from '../src/feature-games31.js';
import {createFeatureGame32} from '../src/feature-games32.js';
import {createFeatureGame33} from '../src/feature-games33.js';

function harness(create,id,interactive=false) {
 let scheduled,now=0;const records=[],listeners=new Map(),noop=()=>{};
 globalThis.window={devicePixelRatio:1};globalThis.ResizeObserver=class {observe(){} disconnect(){}};
 globalThis.requestAnimationFrame=f=>(scheduled=f,1);globalThis.cancelAnimationFrame=noop;
 const ctx=new Proxy({},{get:()=>noop,set:()=>true});
 const canvas={getContext:()=>ctx,getBoundingClientRect:()=>({width:320,height:720}),setAttribute:noop,addEventListener:(k,f)=>listeners.set(k,f),removeEventListener:k=>listeners.delete(k)};
 const player=create(canvas,id,{interactive,onResult:r=>records.push(r)});
 return {player,records,step(n=1){for(let i=0;i<n;i++)scheduled(now+=1000/30)},key(k){listeners.get('keydown')({key:k,isTrusted:true,preventDefault:noop})}};
}
for(const [create,id] of [[createFeatureGame32,'glacier-glide'],[createFeatureGame33,'essence-workshop'],[createFeatureGame33,'mill-mechanic']]) {
 test(`${id} reports a bounded AI round and a fresh manual run`,()=>{const h=harness(create,id);try{h.step(3700);assert.equal(h.records.length,1);assert.equal(h.records[0].actor,'ai');assert.equal(h.records[0].submissionEligible,false);assert.ok(h.records[0].durationMs>=119950&&h.records[0].durationMs<=120050);h.player.beginRun({interactive:true,context:'manual-player'});h.step(100);h.player.pause();const count=h.records.length;h.player.resume();h.step(3700);assert.equal(h.records.length,count+1);assert.equal(h.records.at(-1).actor,'human');assert.equal(h.player.getSessionState(),'result');h.key('Escape');assert.equal(h.player.getSessionState(),'result');h.key('Enter');assert.equal(h.player.getSessionState(),'playing');}finally{h.player.destroy()}});
}
for(const [create,id] of [[createFeatureGame31,'tower-heist'],[createFeatureGame31,'storm-slot'],[createFeatureGame32,'cloud-shepherd']]) {
 test(`${id} AI reaches its objective and reports once`,()=>{const h=harness(create,id);try{for(let i=0;i<30000&&!h.records.length;i++)h.step();assert.equal(h.records.length,1);assert.equal(h.records[0].actor,'ai');assert.ok(h.records[0].score>=0);assert.equal(h.player.getSessionState(),'result');}finally{h.player.destroy()}});
}

// The fixture positions the final objective; the original update and interaction perform the finish.
import {readFile} from 'node:fs/promises';
async function instrument(file, anchor, replacement) {
 let source=await readFile(new URL(`../src/${file}`,import.meta.url),'utf8');
 assert.ok(source.includes(anchor));
 source=source.replace("'./audio.js'",JSON.stringify(new URL('../src/audio.js',import.meta.url).href)).replace("'./scores/run.js'",JSON.stringify(new URL('../src/scores/run.js',import.meta.url).href)).replace(anchor,replacement);
 return import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));
}
for (const auto of [false,true]) {
 test(`tower escape reports on the ${auto?'AI':'manual'} return transition`,async()=>{
  const anchor="return {input(k,d){keys[k]=d;if(!d)return;";
  const {createHeistGame}=await instrument('feature-games31.js',anchor,"return {fixture(){p={x:37,y:468,vx:0,vy:0};guards=[];returning=true},input(k,d){keys[k]=d;if(!d)return;");
  const records=[],g=createHeistGame(()=>{},v=>records.push(v));g.fixture();g.update(1/60,auto);assert.deepEqual(records,[{result:'ESCAPE COMPLETE'}]);
 });
 test(`storm cup reports on the ${auto?'AI':'manual'} second lap transition`,async()=>{
  const anchor="return {input(k,d){keys[k]=d;if(!d)return;if(k==='ArrowLeft'||k==='a')switchLane(-1);";
  const {createStormSlot}=await instrument('feature-games31.js',anchor,"return {fixture(){cars[0].p=1.999;cars[0].speed=.2;raceLap=1},input(k,d){keys[k]=d;if(!d)return;if(k==='ArrowLeft'||k==='a')switchLane(-1);");
  const records=[],g=createStormSlot(()=>{},v=>records.push(v));g.fixture();g.update(1/60,auto);assert.equal(records.length,1);assert.equal(records[0].result,'CUP COMPLETE');assert.ok(records[0].score>=120);
 });
 test(`shepherd reports on the ${auto?'AI':'manual'} final sheep transition`,async()=>{
  const anchor='return {input,update,draw,reset,snapshot()';
  const {createShepherdGame}=await instrument('feature-games32.js',anchor,"return {fixture(){sheep.forEach((s,i)=>{s.saved=i!==0;s.x=shelter.x;s.y=170;s.vx=s.vy=0})},input,update,draw,reset,snapshot()");
  const records=[],g=createShepherdGame(()=>{},v=>records.push(v));g.fixture();g.update(1/60,auto);assert.deepEqual(records,[{score:360,result:'FLOCK HOME'}]);
 });
}

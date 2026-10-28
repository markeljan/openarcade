import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

async function moduleFixture(number){
 let source=await readFile(new URL(`../src/feature-games${number}.js`,import.meta.url),'utf8');
 source=source.replace("import {createGameAudio,unlockSound} from './audio.js';",'export const audioCalls=[];const createGameAudio=()=>({emit(){},setActive(value){audioCalls.push(value)},destroy(){audioCalls.push("destroy")}}),unlockSound=()=>{};');
 source=source.replace("'./scores/run.js'",JSON.stringify(new URL('../src/scores/run.js',import.meta.url).href));
 source=source.replace(/(\n  game=[^\n]+;)/,'$1probes.push(game);callbacks.push(finish);');
 source=source.replace('},reset,snapshot(){return structuredClone({p,props,enemies',`},reset,defeat(){health=25;invulnerable=0;enemies=[];props=[];vents=[];projectiles=[];bolts=[{x:p.x,y:p.y,vx:0,vy:0}]},snapshot(){return structuredClone({p,props,enemies`);
 source+='\nexport const probes=[],callbacks=[];';
 return import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));
}
function harness(make,id,options={}){
 const saved=Object.fromEntries(['window','ResizeObserver','requestAnimationFrame','cancelAnimationFrame'].map(k=>[k,globalThis[k]])),random=Math.random;
 let seed=42,serial=0,now=0,writes=0,disconnected=0;
 Math.random=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/2**32);
 const queue=new Map(),listeners=new Map(),noop=()=>{},results=[];
 globalThis.window={devicePixelRatio:1,localStorage:{getItem:()=>null,setItem(){writes++}}};
 globalThis.ResizeObserver=class{observe(){}disconnect(){disconnected++}};
 globalThis.requestAnimationFrame=fn=>{const handle=++serial;queue.set(handle,fn);return handle};globalThis.cancelAnimationFrame=handle=>queue.delete(handle);
 const ctx=new Proxy({},{get:()=>noop,set:()=>true}),canvas={getContext:()=>ctx,getBoundingClientRect:()=>({width:320,height:720}),setAttribute:noop,addEventListener:(k,v)=>listeners.set(k,v),removeEventListener:k=>listeners.delete(k)};
 const player=make(canvas,id,{...options,onResult:r=>results.push(r)});
 const step=(count=1)=>{for(let i=0;i<count;i++){now+=50;const pending=[...queue.values()];queue.clear();for(const fn of pending)fn(now)}};
 return {player,results,canvas,listeners,queue,step,key(k,down=true){listeners.get(down?'keydown':'keyup')?.({key:k,isTrusted:true,preventDefault:noop})},get writes(){return writes},get disconnected(){return disconnected},close(){player.destroy();Math.random=random;Object.assign(globalThis,saved)}};
}
const entries=[[14,'kaiju-control'],[14,'moonshine-valley'],[15,'dungeon-relay'],[15,'gravity-claw'],[16,'ricochet-foundry'],[16,'lantern-line']];
for(const [number,id] of entries)test(`${id} fresh takeover, restart, pause, Enter, AI identities and destroy`,async()=>{
 const mod=await moduleFixture(number);mod.probes.length=0;mod.callbacks.length=0;mod.audioCalls.length=0;
 const h=harness(mod[`createFeatureGame${number}`],id,{context:'watch-player',audioEnabled:true});
 const current=()=>mod.probes.at(-1),finishRun=()=>{const target=h.results.length+1;if(id==='gravity-claw')current().defeat();for(let i=0;i<2500&&h.results.length<target;i++)h.step();assert.equal(h.results.length,target)};
 try{
  h.step(50);const preview=current(),stale=mod.callbacks.at(-1);h.player.setInteractive(true);assert.notEqual(current(),preview);
  assert.equal(current().snapshot().manualScore??current().snapshot().runScore??current().snapshot().score,0);
  stale({score:99999,result:'STALE PREVIEW'});assert.equal(h.results.length,0);
  h.key('ArrowRight');const human=current(),releaseFinish=mod.callbacks.at(-1),nativeInput=human.input;
  human.input=(k,down)=>{nativeInput?.(k,down);if(!down)releaseFinish({score:99999,result:'RELEASED OLD RUN'})};
  h.player.restart();assert.notEqual(current(),human);assert.equal(h.results.length,0,'invalidate before input release');
  h.step(100);const pausedGame=current(),pausedFinish=mod.callbacks.at(-1),before=pausedGame.snapshot();
  h.player.pause();h.step(1000);h.key('Enter');h.key('x');pausedFinish({score:99999,result:'PAUSED'});
  assert.equal(current(),pausedGame);assert.deepEqual(current().snapshot(),before);assert.equal(h.results.length,0);assert.equal(h.queue.size,0);
  h.player.resume();finishRun();let result=h.results.at(-1);assert.equal(result.actor,'human');assert.equal(result.context,'manual-player');assert.equal(result.submissionEligible,true);
  if(id!=='gravity-claw')assert.equal(result.durationMs,120000,'pause excludes elapsed wall time');
  assert.equal(h.player.getSessionState(),'result');const terminal=current(),snapshot=terminal.snapshot();h.step(100);h.key('x');assert.deepEqual(current().snapshot(),snapshot);assert.equal(h.results.length,1);
  h.key('Enter');h.key('Enter',false);assert.notEqual(current(),terminal);assert.equal(h.player.getSessionState(),'playing');finishRun();assert.notEqual(h.results.at(-1).runId,result.runId);assert.equal(h.results.at(-1).context,'manual-player');
  h.player.setInteractive(false);finishRun();assert.equal(h.results.at(-1).actor,'ai');assert.equal(h.results.at(-1).context,'watch-player');
  h.player.beginRun({interactive:false,context:'embed'});h.player.restart();const writes=h.writes;finishRun();result=h.results.at(-1);assert.equal(result.actor,'ai');assert.equal(result.context,'embed');assert.equal(result.submissionEligible,true);assert.equal(h.writes,writes);
  const firstAi=current(),firstAiId=result.runId;h.step(id==='gravity-claw'?39:15);assert.equal(current(),firstAi,'retain the AI result for its hold');h.step(10);assert.notEqual(current(),firstAi);
  finishRun();assert.notEqual(h.results.at(-1).runId,firstAiId);assert.equal(h.results.at(-1).actor,'ai');assert.equal(h.results.at(-1).context,'embed');assert.equal(h.writes,writes);
  h.player.setInteractive(true);finishRun();assert.equal(h.results.at(-1).actor,'human');assert.equal(h.results.at(-1).context,'embed');
  h.player.restart();h.key('ArrowLeft');const late=mod.callbacks.at(-1),last=current();last.input=()=>late({score:99999,result:'CLOSE CLEANUP'});const count=h.results.length;
  h.player.destroy();late({score:99999,result:'AFTER DESTROY'});assert.equal(h.results.length,count);assert.equal(h.queue.size,0);assert.equal(h.listeners.size,0);assert.equal(h.disconnected,1);assert.ok(mod.audioCalls.includes(false));assert.equal(mod.audioCalls.at(-1),'destroy');
 }finally{h.close()}
});

for(const [number,id] of entries)test(`${id} gallery run is AI, ineligible and silent`,async()=>{
 const mod=await moduleFixture(number);mod.probes.length=0;mod.audioCalls.length=0;const h=harness(mod[`createFeatureGame${number}`],id,{paused:true});
 try{assert.equal(h.queue.size,0);h.player.resume();if(id==='gravity-claw')mod.probes.at(-1).defeat();for(let i=0;i<2500&&!h.results.length;i++)h.step();assert.equal(h.results.length,1);assert.equal(h.results[0].actor,'ai');assert.equal(h.results[0].context,'gallery-preview');assert.equal(h.results[0].submissionEligible,false);assert.equal(h.writes,0)}finally{h.close()}
});

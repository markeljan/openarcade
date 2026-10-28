import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createTowerGame,createBurrowGame,createFeatureGame11} from '../src/feature-games11.js';
import {idol,robots,createFeatureGame12} from '../src/feature-games12.js';
import {castle,hotel,createFeatureGame13} from '../src/feature-games13.js';
const trials=[['tower-panic',createTowerGame,createFeatureGame11],['idol-escape',idol,createFeatureGame12],['robot-register',robots,createFeatureGame12],['castle-crasher',castle,createFeatureGame13],['hotel-haunt',hotel,createFeatureGame13]];
const seeded=fn=>{const old=Math.random;let state=42;Math.random=()=>((state=(Math.imul(state,1664525)+1013904223)>>>0)/2**32);try{return fn()}finally{Math.random=old}};
for(const [id,factory] of trials)for(const auto of [false,true])test(`${id} ${auto?'AI':'human'} completes once at 120 active seconds with its event score`,()=>seeded(()=>{
 const results=[],events=[],g=factory(e=>events.push(e),{finish:r=>results.push(r)});
 if(!auto&&id==='hotel-haunt'){g.input('ArrowLeft',true);g.input(' ',true)}
 for(let i=0;i<2399;i++)g.update(.05,auto);assert.equal(results.length,0);
 g.update(.05,auto);assert.equal(results.length,1);const final=g.snapshot();assert.ok(final.runComplete);assert.ok(Math.abs(final.runElapsed-120)<1e-8);assert.equal(results[0].score,final.runScore);assert.ok(Number.isInteger(final.runScore));assert.ok(final.runScore>=0);
 if(id==='tower-panic')assert.equal(final.runScore,final.stage*620+final.hero.maxFloor*10+final.workers.filter(w=>w.joined).length*35+(final.mode==='extract'?180:0)+events.filter(e=>e==='tower-deflect').length*8);
 if(id==='idol-escape')assert.equal(final.runScore,final.distance);
 if(id==='robot-register')assert.equal(final.runScore,final.bots.reduce((n,b)=>n+b.score,0)*40+final.stageSerial*100);
 if(id==='castle-crasher')assert.equal(final.runScore,events.filter(e=>e==='castle-fire').length*4+events.filter(e=>e==='castle-impact').length*4+final.score.reduce((a,b)=>a+b,0)*3+(final.chapter-1)*250+(final.phase==='settle'&&final.blocks.some(b=>b.type==='core'&&b.dead)?150:0));
 if(auto&&id!=='idol-escape')assert.ok(final.runScore>0);
 for(let i=0;i<100;i++)g.update(.05,auto);assert.equal(results.length,1);assert.deepEqual(g.snapshot(),final);
}));
for(const auto of [false,true])test(`Burrow ${auto?'AI':'human'} finishes only after its full 900-second hunt and six-second finale`,()=>seeded(()=>{
 const results=[],records=[],g=createBurrowGame({finish:r=>results.push(r),records:{finish:s=>records.push(s),best:()=>0}});
 for(let i=0;i<18000;i++)g.update(.05,auto);assert.equal(g.snapshot().state,'ending');assert.equal(results.length,0);
 for(let i=0;i<119;i++)g.update(.05,auto);assert.equal(results.length,0);g.update(.05,auto);assert.equal(g.snapshot().state,'result');assert.equal(results.length,1);assert.equal(results[0].score,g.snapshot().score);assert.equal(records.length,auto?0:1);
 const final=g.snapshot();for(let i=0;i<100;i++)g.update(.05,auto);assert.deepEqual(g.snapshot(),final);assert.equal(results.length,1);
}));
function harness(create,id,interactive=false){
 const globals=['window','ResizeObserver','requestAnimationFrame','cancelAnimationFrame'],saved=new Map(globals.map(k=>[k,globalThis[k]]));let callback,time=100,writes=0,labels=[];const noop=()=>{},handlers=new Map(),results=[];
 globalThis.window={devicePixelRatio:1,localStorage:{getItem:()=>null,setItem(){writes++}}};globalThis.ResizeObserver=class{observe(){}disconnect(){}};globalThis.requestAnimationFrame=f=>(callback=f,1);globalThis.cancelAnimationFrame=noop;
 const ctx=new Proxy({fillText(s){labels.push(s)}},{get:(o,k)=>o[k]??noop,set:(o,k,v)=>(o[k]=v,true)}),canvas={getContext:()=>ctx,getBoundingClientRect:()=>({width:320,height:720}),setAttribute:noop,addEventListener:(k,v)=>handlers.set(k,v),removeEventListener:k=>handlers.delete(k)};
 const player=create(canvas,id,{interactive,onResult:r=>results.push(r)});
 return {player,results,get writes(){return writes},step(n=1){for(let i=0;i<n;i++){labels=[];callback(time+=50)}return labels},key(key,down=true){handlers.get(down?'keydown':'keyup')({key,preventDefault:noop})},enter(){handlers.get('keydown')({key:'Enter',preventDefault:noop})},close(){player.destroy();for(const [k,v]of saved){if(v===undefined)delete globalThis[k];else globalThis[k]=v}}};
}
for(const [id,,create]of trials)test(`${id} wrapper binds fresh actor, restart and successive AI runs`,()=>seeded(()=>{
 const h=harness(create,id);try{
  h.step(2402);assert.equal(h.results.length,1);const first=h.results[0];assert.equal(first.actor,'ai');assert.equal(first.context,'gallery-preview');assert.equal(first.submissionEligible,false);assert.equal(first.durationMs,120000);assert.equal(h.writes,0);assert.ok(Object.isFrozen(first));
  h.step(2426);assert.equal(h.results.length,2);assert.notEqual(h.results[1].runId,first.runId);assert.equal(h.writes,0);
  h.player.beginRun({interactive:true,context:'embed'});h.step(100);h.player.pause();h.enter();h.step(1000);assert.equal(h.results.length,2);h.player.resume();h.step(2302);assert.equal(h.results.length,3);assert.equal(h.results[2].actor,'human');assert.equal(h.results[2].context,'embed');assert.equal(h.results[2].durationMs,120000);
  h.enter();assert.equal(h.player.getSessionState(),'playing');h.step(10);h.player.restart();h.step(2402);assert.equal(h.results.length,4);assert.equal(h.results[3].context,'embed');assert.notEqual(h.results[3].runId,h.results[2].runId);
  h.player.setInteractive(false);h.step(2402);assert.equal(h.results.length,5);assert.equal(h.results[4].actor,'ai');assert.equal(h.results[4].context,'embed');const count=h.results.length;h.player.destroy();h.step(2600);assert.equal(h.results.length,count);
 }finally{h.close()}
}));
test('Burrow wrapper native result accepts Enter and returns to fresh AI after twelve seconds',()=>seeded(()=>{
 const h=harness(createFeatureGame11,'burrow-boss',true);try{h.step(18122);assert.equal(h.results.length,1);assert.equal(h.player.getSessionState(),'result');assert.equal(h.results[0].actor,'human');assert.equal(h.results[0].durationMs,906000);h.enter();assert.equal(h.player.getSessionState(),'playing');h.step(18122);assert.equal(h.results.length,2);assert.notEqual(h.results[0].runId,h.results[1].runId);h.step(242);assert.equal(h.player.getSessionState(),'playing');const writes=h.writes;h.step(18124);assert.equal(h.results.length,3);assert.equal(h.results[2].actor,'ai');assert.equal(h.results[2].context,'watch-player');assert.equal(h.writes,writes);h.step(18150);assert.equal(h.results.length,4);assert.equal(h.results[3].actor,'ai');assert.notEqual(h.results[2].runId,h.results[3].runId);assert.equal(h.writes,writes);}finally{h.close()}
}));

for(const [module,id] of [[11,'tower-panic'],[12,'robot-register'],[13,'castle-crasher']])test(`module ${module} rejects completion from released inputs, destroyed and paused factories`,async()=>{
 let source=await readFile(new URL(`../src/feature-games${module}.js`,import.meta.url),'utf8');
 source=source.replaceAll("'./audio.js'",JSON.stringify(new URL('../src/audio.js',import.meta.url).href)).replaceAll("'./scores/run.js'",JSON.stringify(new URL('../src/scores/run.js',import.meta.url).href));
 source=source.replaceAll('factories[id](audio.emit,{finish})','globalThis.__s08Factory({finish})');
 const factories=[];globalThis.__s08Factory=({finish})=>{const game={finish,input(k,down){if(!down)finish({score:999,result:'STALE RELEASE'})},update(){},draw(){},destroy(){finish({score:999,result:'STALE DESTROY'})}};factories.push(game);return game};
 const imported=await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));
 const h=harness(imported[`createFeatureGame${module}`],id,true);
 try{h.key(' ');const abandoned=factories.at(-1);h.player.restart();abandoned.finish({score:999,result:'STALE ASYNC'});assert.equal(h.results.length,0);assert.equal(h.writes,0);
  const active=factories.at(-1);h.player.pause();active.finish({score:8,result:'PAUSED'});assert.equal(h.results.length,0);h.player.resume();active.finish({score:8,result:'VALID'});assert.equal(h.results.length,1);assert.equal(h.results[0].score,8);assert.equal(h.writes,1);
  h.player.restart();const closed=factories.at(-1);h.player.destroy();closed.finish({score:999,result:'CLOSED'});assert.equal(h.results.length,1);assert.equal(h.writes,1);
 }finally{h.close();delete globalThis.__s08Factory}
});

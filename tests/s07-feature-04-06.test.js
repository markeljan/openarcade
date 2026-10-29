import test from 'node:test';
import assert from 'node:assert/strict';
import {createRuneSwarm,miner} from '../src/feature-games4.js';
import {webslam,deadline} from '../src/feature-games5.js';
import {scrap,bowl} from '../src/feature-games6.js';

for(const [name,make,seconds] of [
 ['rune',f=>createRuneSwarm({},()=>{},{finish:f}),180],
 ['miner',f=>{const w=Array.from({length:240},(_,y)=>Array(20).fill(y<3?0:1));w[2][10]=7;return miner(()=>{},{initialWorld:w,initialPosition:{x:10,y:2},dynamicSpawns:false,finish:f})},300],
 ['web',f=>webslam({},{finish:f}),150],
 ['deadline',f=>deadline({},{finish:f}),120],
 ['scrap',f=>scrap({},()=>{},{finish:f}),150],
 ['bowl',f=>bowl(()=>{},{},()=>{},{finish:f}),908],
]) test(`${name} reports one finite result at the natural boundary`,()=>{
 const events=[],g=make(e=>events.push(e));for(let i=0;i<seconds*20&&!events.length;i++)g.update(.05,false);
 assert.equal(events.length,1);assert.ok(Number.isFinite(events[0].score));assert.ok(events[0].result);for(let i=0;i<10;i++)g.update(.05,false);assert.equal(events.length,1);
});
import {createFeatureGame4} from '../src/feature-games4.js';
import {createFeatureGame5} from '../src/feature-games5.js';
import {createHarness} from './s07-harness.js';
for(const action of ['destroy','pause','restart'])test(`Gridiron timeout callback can ${action} without an orphan frame`,async()=>{
 const {createFeatureGame6}=await import('../src/feature-games6.js');let h;
 h=createHarness(createFeatureGame6,'gridiron-rush',{interactive:true,onAttract(){h.game[action]()}});
 try{for(let i=0;i<40000&&!h.attract.length;i++)h.step(1,1000/30);
  assert.equal(h.attract.length,1);assert.equal(h.results.length,1);
  assert.equal(h.pendingFrames,action==='restart'?1:0);
 }finally{h.cleanup()}
});
for(const [id,factory] of [['rune-swarm',createFeatureGame4],['deadline-deck',createFeatureGame5]]) test(`${id} wrapper abandons on takeover and re-arms on restart`,()=>{
 const h=createHarness(factory,id,{interactive:false});try{
  h.step(120);h.game.setInteractive(true);h.step(120);h.game.restart();
  for(let i=0;i<20000&&!h.results.length;i++)h.step();
  assert.equal(h.results.length,1);const r=h.results[0];assert.equal(r.actor,'human');assert.equal(r.context,'manual-player');assert.ok(r.durationMs>0);assert.ok(Number.isInteger(r.score));
  h.step(100);assert.equal(h.results.length,1);h.press('Enter');for(let i=0;i<20000&&h.results.length<2;i++)h.step();assert.equal(h.results.length,2);assert.notEqual(h.results[0].runId,h.results[1].runId);
 }finally{h.cleanup()}
});
for(const [name,make,seconds] of [
 ['rune',f=>createRuneSwarm({},()=>{},{finish:f}),180],
 ['web',f=>webslam({},{finish:f}),150],
 ['deadline',f=>deadline({},{finish:f}),120],
 ['scrap',f=>scrap({},()=>{},{finish:f}),180],
 ['bowl',f=>bowl(()=>{},{},()=>{},{finish:f}),908],
]) test(`${name} AI reports its own nonnegative point tally`,()=>{const events=[],g=make(e=>events.push(e));for(let i=0;i<seconds*20&&!events.length;i++)g.update(.05,true);assert.equal(events.length,1);assert.ok(Number.isInteger(events[0].score)&&events[0].score>=0);});
test('AI terminal re-arms with exactly one animation frame',()=>{const h=createHarness(createFeatureGame5,'deadline-deck',{interactive:false});try{for(let i=0;i<15000&&h.results.length<2;i++){h.step();assert.equal(h.pendingFrames,1)}assert.equal(h.results.length,2);assert.notEqual(h.results[0].runId,h.results[1].runId);assert.equal(h.results[0].actor,'ai');assert.equal(h.writes.length,0)}finally{h.cleanup()}});
test('pause and callback restart do not duplicate the frame loop',()=>{let h;h=createHarness(createFeatureGame5,'deadline-deck',{interactive:true,onResult(){h.game.restart()}});try{h.step(30);h.game.pause();assert.equal(h.pendingFrames,0);h.step(100);h.game.resume();for(let i=0;i<12000&&!h.results.length;i++){h.step();assert.equal(h.pendingFrames,1)}assert.equal(h.results.length,1);assert.equal(h.pendingFrames,1)}finally{h.cleanup()}});
test('Gridiron idle manual title loss reports the 80 point outcome bonus',()=>{const events=[],g=bowl(()=>{},{},()=>{},{finish:e=>events.push(e)});for(let i=0;i<18200&&!events.length;i++)g.update(.05,false);assert.deepEqual(events,[{score:80,result:'TITLE LOST'}]);});
test('Deep Digger AI health depletion reports exactly once before recovery',()=>{const world=Array.from({length:240},()=>Array(20).fill(7));const events=[],g=miner(()=>{},{initialWorld:world,initialPosition:{x:10,y:2},dynamicSpawns:false,finish:e=>events.push(e)});for(let i=0;i<3000&&!events.length;i++)g.update(.05,true);assert.equal(events.length,1);assert.equal(events[0].result,'Run over');assert.ok(Number.isInteger(events[0].score)&&events[0].score>=0);});

test('Gridiron manual result returns to AI with one scheduled frame',async()=>{const {readFile}=await import('node:fs/promises');let src=await readFile(new URL('../src/feature-games6.js',import.meta.url),'utf8');src=src.replace("'./scores/run.js'",JSON.stringify(new URL('../src/scores/run.js',import.meta.url).href)).replace("'./audio.js'",JSON.stringify(new URL('../src/audio.js',import.meta.url).href)).replace("notice='';matchClock=0;rivalScore=0;","notice='';matchClock=899.9;rivalScore=0;");const {createFeatureGame6}=await import('data:text/javascript;base64,'+Buffer.from(src).toString('base64'));const h=createHarness(createFeatureGame6,'gridiron-rush',{interactive:true});try{for(let i=0;i<1600&&!h.attract.length;i++){h.step();assert.equal(h.pendingFrames,1)}assert.equal(h.attract.length,1);assert.equal(h.game.getSessionState(),'playing');for(let i=0;i<1200&&h.results.length<2;i++)h.step();assert.equal(h.results[0].actor,'human');assert.equal(h.results[1].actor,'ai');assert.equal(h.results[1].context,'watch-player');assert.equal(h.pendingFrames,1)}finally{h.cleanup()}});
test('paused Enter preserves the finished Deadline Deck run until resume',()=>{const h=createHarness(createFeatureGame5,'deadline-deck',{interactive:true});try{for(let i=0;i<20000&&!h.results.length;i++)h.step();assert.equal(h.results.length,1);assert.equal(h.game.getSessionState(),'result');h.game.pause();h.press('Enter');h.step(60);assert.equal(h.results.length,1);assert.equal(h.game.getSessionState(),'result');h.game.resume();h.step();assert.equal(h.game.getSessionState(),'result');h.press('Enter');assert.equal(h.game.getSessionState(),'playing');for(let i=0;i<20000&&h.results.length<2;i++)h.step();assert.equal(h.results.length,2);assert.notEqual(h.results[0].runId,h.results[1].runId)}finally{h.cleanup()}});
test('Gridiron saves the human best before a terminal callback destroys the player',async()=>{const {readFile}=await import('node:fs/promises');let src=await readFile(new URL('../src/feature-games6.js',import.meta.url),'utf8');src=src.replace("'./scores/run.js'",JSON.stringify(new URL('../src/scores/run.js',import.meta.url).href)).replace("'./audio.js'",JSON.stringify(new URL('../src/audio.js',import.meta.url).href)).replace("notice='';matchClock=0;rivalScore=0;","notice='';matchClock=899.9;rivalScore=0;");const {createFeatureGame6}=await import('data:text/javascript;base64,'+Buffer.from(src).toString('base64'));let h,seen;h=createHarness(createFeatureGame6,'gridiron-rush',{interactive:true,onResult(record){seen=h.storage.getItem('miniarcade:best:gridiron-rush');h.game.destroy();assert.equal(Number(seen),record.score)}});try{for(let i=0;i<1000&&!h.results.length;i++)h.step();assert.equal(seen,'80');assert.equal(h.pendingFrames,0)}finally{h.cleanup()}});
test('Gridiron AI retains its ending for six seconds before a fresh run',async()=>{const {readFile}=await import('node:fs/promises');let src=await readFile(new URL('../src/feature-games6.js',import.meta.url),'utf8');src=src.replace("'./scores/run.js'",JSON.stringify(new URL('../src/scores/run.js',import.meta.url).href)).replace("'./audio.js'",JSON.stringify(new URL('../src/audio.js',import.meta.url).href)).replace("notice='';matchClock=0;rivalScore=0;","notice='';matchClock=899.9;rivalScore=0;");const {createFeatureGame6}=await import('data:text/javascript;base64,'+Buffer.from(src).toString('base64'));const h=createHarness(createFeatureGame6,'gridiron-rush',{interactive:false});try{for(let i=0;i<100&&!h.results.length;i++)h.step(1,50);assert.equal(h.results.length,1);h.step(119,50);assert.equal(h.results.length,1);for(let i=0;i<10&&h.results.length<2;i++)h.step(1,50);assert.equal(h.results.length,2);assert.equal(h.pendingFrames,1)}finally{h.cleanup()}});

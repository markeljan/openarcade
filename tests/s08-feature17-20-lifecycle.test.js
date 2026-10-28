import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

async function shortAshen(){
 let s=await readFile(new URL('../src/feature-games17.js',import.meta.url),'utf8');
 s=s.replace("'./audio.js'",JSON.stringify(new URL('../src/audio.js',import.meta.url).href)).replace("'./scores/run.js'",JSON.stringify(new URL('../src/scores/run.js',import.meta.url).href));
 assert.ok(s.includes('time=900;dead=0'));s=s.replace('time=900;dead=0','time=1;dead=0');
 return (await import('data:text/javascript;base64,'+Buffer.from(s).toString('base64'))).createFeatureGame17;
}
test('fresh AI terminals have distinct IDs, and manual takeover and restart bind new runs',async t=>{
 const names=['window','ResizeObserver','requestAnimationFrame','cancelAnimationFrame'],saved=Object.fromEntries(names.map(k=>[k,globalThis[k]]));t.after(()=>Object.assign(globalThis,saved));
 let next,now=0;const noop=()=>{},handlers=new Map(),records=[];globalThis.window={devicePixelRatio:1};globalThis.ResizeObserver=class{observe(){} disconnect(){}};globalThis.requestAnimationFrame=f=>(next=f,1);globalThis.cancelAnimationFrame=noop;
 const ctx=new Proxy({},{get:()=>noop,set:()=>true}),canvas={getContext:()=>ctx,getBoundingClientRect:()=>({width:320,height:720}),setAttribute:noop,addEventListener:(k,v)=>handlers.set(k,v),removeEventListener:k=>handlers.delete(k)};
 const make=await shortAshen(),g=make(canvas,'ashen-rage',{onResult:r=>records.push(r)}),step=n=>{for(let i=0;i<n;i++)next(now+=40)};
 try{step(180);assert.equal(records.length,2);assert.notEqual(records[0].runId,records[1].runId);assert.deepEqual(records.map(r=>[r.actor,r.score,r.result]),[['ai',500,'MID-PACK'],['ai',500,'MID-PACK']]);g.beginRun({interactive:true,context:'manual-player'});step(30);assert.equal(records.length,3);assert.equal(records[2].actor,'human');assert.equal(records[2].score,500);assert.equal(g.getSessionState(),'result');handlers.get('keydown')({key:'Enter',preventDefault:noop});step(30);assert.equal(records.length,4);assert.notEqual(records[2].runId,records[3].runId);g.pause();handlers.get('keydown')({key:'Enter',preventDefault:noop});handlers.get('keydown')({key:'x',preventDefault:noop});step(1);assert.equal(records.length,4);assert.equal(g.getSessionState(),'result');g.resume();step(1);assert.equal(g.getSessionState(),'result')}finally{g.destroy()}
});
const fixtures=[
 [17,'star-roller','time=300;score=0','time=1;score=0',200],
 [18,'dragon-lock','runSeconds=720','runSeconds=1',230],
 [18,'cursed-fist','runSeconds=630','runSeconds=1',230],
 [19,'coral-courier','scoreEnabled=!auto;time+=dt','scoreEnabled=!auto;revived=[true,true,false];sockets.forEach(q=>q.alive=true);checkBiome(2);time+=dt',3],
 [19,'beacon-bay','spawnBoat()}reset();','spawnBoat();saved=7;boats[0].x=bells[0].x;boats[0].color=bells[0].color;boats[0].y=541;boats[0].signalT=10}reset();',3],
 [20,'railway-rush','accumulator=0}reset();','accumulator=0;delivered=7;trains.push({id:1,lane:0,home:0,x:tracks[0],y:109,speed:55,brake:0,cargo:[0],crossed:[true,true],damage:0,turnoutState:"",velocity:55,warned:false,whistle:0})}reset();',3],
 [20,'pottery-house','function step(auto){const dt=1/60;', 'function step(auto){if(completed===2){hero.carry={state:"fired",quality:"masterwork"};perform("shelf")}const dt=1/60;',3],
];
for(const [module,id,needle,replacement,frames] of fixtures)test(`${id} reports one terminal for both actors`,async t=>{
 const names=['window','ResizeObserver','requestAnimationFrame','cancelAnimationFrame'],savedGlobals=Object.fromEntries(names.map(k=>[k,globalThis[k]]));t.after(()=>Object.assign(globalThis,savedGlobals));let next,now=0;const noop=()=>{},records=[];globalThis.window={devicePixelRatio:1};globalThis.ResizeObserver=class{observe(){} disconnect(){}};globalThis.requestAnimationFrame=f=>(next=f,1);globalThis.cancelAnimationFrame=noop;
 let s=await readFile(new URL(`../src/feature-games${module}.js`,import.meta.url),'utf8');assert.ok(s.includes(needle),`fixture anchor ${id}`);if(id==='pottery-house')s=s.replace('completed=0;masterworks=0','completed=2;masterworks=0');s=s.replace(needle,replacement).replace("'./audio.js'",JSON.stringify(new URL('../src/audio.js',import.meta.url).href)).replace("'./scores/run.js'",JSON.stringify(new URL('../src/scores/run.js',import.meta.url).href));const make=(await import('data:text/javascript;base64,'+Buffer.from(s).toString('base64')))[`createFeatureGame${module}`];
 const ctx=new Proxy({},{get:()=>noop,set:()=>true}),canvas={getContext:()=>ctx,getBoundingClientRect:()=>({width:320,height:720}),setAttribute:noop,addEventListener:noop,removeEventListener:noop},g=make(canvas,id,{interactive:true,onResult:r=>records.push(r)}),step=n=>{for(let i=0;i<n;i++)next(now+=40)};
 try{step(frames);assert.equal(records.length,1);assert.equal(records[0].actor,'human');assert.ok(Number.isFinite(records[0].score));const exact={'star-roller':72,'dragon-lock':410,'coral-courier':350,'beacon-bay':100,'railway-rush':100,'pottery-house':275};if(id in exact)assert.equal(records[0].score,exact[id]);step(20);assert.equal(records.length,1);g.beginRun({interactive:false,context:'watch-player'});step(frames);assert.equal(records.length,2);assert.equal(records[1].actor,'ai');if(id in exact&&!['star-roller','dragon-lock'].includes(id))assert.equal(records[1].score,exact[id]);assert.notEqual(records[0].runId,records[1].runId);step(100+frames);assert.ok(records.length>=3);assert.notEqual(records[1].runId,records[2].runId)}finally{g.destroy()}
});

for(const [module,id,signature] of [
 [17,'ashen-rage','export function createAshenRage(onSound=()=>{},finish){'],
 [18,'cursed-fist','export function fist({runSeconds=630,gateFirst=55,actInterval=70,finish}={},sound=()=>{}){'],
 [19,'coral-courier','export function coral(onSound=()=>{},finish){'],
 [20,'railway-rush','export function createRailwayGame(sound=()=>{},finish){'],
])test(`${id} rejects stale and paused factory callbacks`,async t=>{
 const names=['window','ResizeObserver','requestAnimationFrame','cancelAnimationFrame','__s08Callbacks'],saved=Object.fromEntries(names.map(k=>[k,globalThis[k]]));t.after(()=>Object.assign(globalThis,saved));const noop=()=>{},records=[];globalThis.__s08Callbacks=[];globalThis.window={devicePixelRatio:1};globalThis.ResizeObserver=class{observe(){}disconnect(){}};globalThis.requestAnimationFrame=()=>1;globalThis.cancelAnimationFrame=noop;
 let src=await readFile(new URL(`../src/feature-games${module}.js`,import.meta.url),'utf8');assert.ok(src.includes(signature));src=src.replace(signature,signature+'globalThis.__s08Callbacks.push(finish);').replace("'./audio.js'",JSON.stringify(new URL('../src/audio.js',import.meta.url).href)).replace("'./scores/run.js'",JSON.stringify(new URL('../src/scores/run.js',import.meta.url).href));const make=(await import('data:text/javascript;base64,'+Buffer.from(src).toString('base64')))[`createFeatureGame${module}`];const handlers=new Map(),ctx=new Proxy({},{get:()=>noop,set:()=>true}),canvas={getContext:()=>ctx,getBoundingClientRect:()=>({width:320,height:720}),setAttribute:noop,addEventListener:(k,v)=>handlers.set(k,v),removeEventListener:noop},g=make(canvas,id,{onResult:r=>records.push(r)});
 const old=globalThis.__s08Callbacks[0];g.restart();old({score:99,result:'STALE'});assert.equal(records.length,0);assert.equal(g.getSessionState(),'playing');const second=globalThis.__s08Callbacks[1];g.beginRun({interactive:true,context:'manual-player'});second({score:99,result:'STALE'});assert.equal(records.length,0);g.pause();const active=globalThis.__s08Callbacks[2];active({score:99,result:'PAUSED'});assert.equal(g.getSessionState(),'playing');g.resume();active({score:5,result:'VALID'});assert.equal(records.length,1);assert.equal(records[0].score,5);g.pause();handlers.get('keydown')({key:'Enter',preventDefault:noop});handlers.get('keydown')({key:'x',preventDefault:noop});assert.equal(globalThis.__s08Callbacks.length,3);assert.equal(g.getSessionState(),'result');g.resume();g.destroy();active({score:99,result:'STALE'});assert.equal(records.length,1);
});
test('embed actor changes and restart preserve embed context',async t=>{
 const names=['window','ResizeObserver','requestAnimationFrame','cancelAnimationFrame'],saved=Object.fromEntries(names.map(k=>[k,globalThis[k]]));t.after(()=>Object.assign(globalThis,saved));let next,now=0;const noop=()=>{},records=[];globalThis.window={devicePixelRatio:1};globalThis.ResizeObserver=class{observe(){}disconnect(){}};globalThis.requestAnimationFrame=f=>(next=f,1);globalThis.cancelAnimationFrame=noop;
 const ctx=new Proxy({},{get:()=>noop,set:()=>true}),canvas={getContext:()=>ctx,getBoundingClientRect:()=>({width:320,height:720}),setAttribute:noop,addEventListener:noop,removeEventListener:noop},g=(await shortAshen())(canvas,'ashen-rage',{context:'embed',onResult:r=>records.push(r)}),step=n=>{for(let i=0;i<n;i++)next(now+=40)};
 try{g.setInteractive(true);step(30);assert.deepEqual([records[0].actor,records[0].context],['human','embed']);g.restart();step(30);assert.deepEqual([records[1].actor,records[1].context],['human','embed']);g.setInteractive(false);step(30);assert.deepEqual([records[2].actor,records[2].context],['ai','embed']);assert.equal(new Set(records.map(r=>r.runId)).size,3)}finally{g.destroy()}
});

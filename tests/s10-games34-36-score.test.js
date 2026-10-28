import test from 'node:test';
import assert from 'node:assert/strict';
import {voidGame,createWobbleWar} from '../src/feature-games34.js';
import {createRuleboundPuzzle,createHexHamlet,createFeatureGame35} from '../src/feature-games35.js';
import {courier,createIceboundAscent} from '../src/feature-games36.js';

test('automatic games report their actual terminal boundary before resetting',()=>{
 const old=Math.random;let seed=1;Math.random=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/2**32);
 try{
  for(const [name,make,limit] of [
   ['wobble',f=>createWobbleWar(()=>{},{onFinish:f}),120000],['void',f=>voidGame(()=>{},f),15000],['rule',f=>createRuleboundPuzzle({onFinish:f,seed:0}),5000],
   ['hex',f=>createHexHamlet(()=>{},f),10000],['ashen',f=>courier(()=>{},f),10000],['ice',f=>createIceboundAscent(()=>{},f),12000],
  ]){const events=[],g=make(e=>events.push(e));for(let i=0;i<limit&&!events.length;i++)g.update(1/60,true);assert.equal(events.length,1,name);assert.ok(Number.isFinite(events[0].score),name);assert.ok(events[0].result,name)}
 }finally{Math.random=old}
});

test('manual hex exhaustion reports once, holds result, and restart gets a fresh run',t=>{
 const old=Object.fromEntries(['window','ResizeObserver','requestAnimationFrame','cancelAnimationFrame'].map(k=>[k,globalThis[k]]));t.after(()=>Object.assign(globalThis,old));
 let seq=0,now=0;const frames=new Map(),listeners=new Map(),noop=()=>{};
 globalThis.window={devicePixelRatio:1};globalThis.ResizeObserver=class{observe(){} disconnect(){}};globalThis.requestAnimationFrame=f=>{frames.set(++seq,f);return seq};globalThis.cancelAnimationFrame=id=>frames.delete(id);
 const ctx=new Proxy({},{get:(o,k)=>o[k]??noop,set:(o,k,v)=>(o[k]=v,true)}),canvas={getContext:()=>ctx,getBoundingClientRect:()=>({left:0,top:0,width:320,height:720}),setAttribute:noop,focus:noop,addEventListener:(k,f)=>listeners.set(k,f),removeEventListener:k=>listeners.delete(k)};
 const records=[],game=createFeatureGame35(canvas,'hex-hamlet',{interactive:true,onResult:r=>records.push(r)}),key=(k,d)=>listeners.get(d?'keydown':'keyup')({key:k,preventDefault:noop});
 const step=()=>{now+=1000/60;const f=[...frames.values()];frames.clear();f.forEach(x=>x(now))};
 game.pause();for(let i=0;i<10;i++)step();game.resume();step();for(let i=0;i<20;i++){key('z',true);key('z',false)}
 assert.equal(records.length,1);assert.equal(records[0].score,0);assert.equal(records[0].actor,'human');assert.equal(records[0].context,'manual-player');assert.equal(game.getSessionState(),'result');
 key('Escape',true);assert.equal(game.getSessionState(),'result');key('Enter',true);assert.equal(game.getSessionState(),'playing');for(let i=0;i<20;i++){key('z',true);key('z',false)}assert.equal(records.length,2);assert.notEqual(records[0].runId,records[1].runId);game.destroy();assert.equal(frames.size,0);
});
import {readFile} from 'node:fs/promises';

test('human terminal transitions report their actual score before reset',async()=>{
 const specs=[
  ['feature-games34.js','wobble',"scoreEnabled=!auto;cool=Math.max", "scoreEnabled=!auto;if(!auto&&phase==='draft'){phase='battle';time=3;runScore=195;units=units.filter(u=>u.team==='red')}cool=Math.max",m=>f=>m.createWobbleWar(()=>{},{onFinish:f}), 'Defeated',195],
  ['feature-games34.js','void',"function step(dt,preview){if(taps.auto)","function step(dt,preview){if(!preview){hp=0;wins=2;}if(taps.auto)",m=>f=>m.voidGame(()=>{},f),'Hull lost',2],
  ['feature-games35.js','rule',"return {input(k,d){const dir=", "chapter=5;page();motion={elapsed:22/60,from:state,to:{...state,won:true},moved:false,undo:false,attempted:false};return {input(k,d){const dir=",m=>f=>m.createRuleboundPuzzle({onFinish:f,seed:0}),'Book complete',0],
  ['feature-games36.js','ashen',"wave=Math.max(0,wave-dt);hurt=", "if(!auto){health=0;score=3;}wave=Math.max(0,wave-dt);hurt=",m=>f=>m.courier(()=>{},f),'Fallen',3],
  ['feature-games36.js','ice',"if(ground&&p.y===platforms.at(-1).y){completed++;", "if(!auto){level=3;ground=true;p.y=platforms.at(-1).y}if(ground&&p.y===platforms.at(-1).y){completed++;",m=>f=>m.createIceboundAscent(()=>{},f),'Summit reached',0],
 ];
 for(const [file,name,before,after,make,label,score] of specs){let src=await readFile(new URL(`../src/${file}`,import.meta.url),'utf8');assert.ok(src.includes(before),name);src=src.replace(before,after).replace("'./audio.js'",JSON.stringify(new URL('../src/audio.js',import.meta.url).href)).replace("'./scores/run.js'",JSON.stringify(new URL('../src/scores/run.js',import.meta.url).href));
  const m=await import(`data:text/javascript;base64,${Buffer.from(src).toString('base64')}`),events=[],g=make(m)(v=>events.push(v));for(let i=0;i<240&&!events.length;i++)g.update(1/60,false);assert.deepEqual(events,[{score,result:label}],name);
 }
});

import {createFeatureGame34} from '../src/feature-games34.js';
for(const method of ['keyboard','pointer'])test(`Void ${method} autoplay cannot submit a human result and fresh runs restore reporting`,t=>{
 const old=Object.fromEntries(['window','ResizeObserver','requestAnimationFrame','cancelAnimationFrame'].map(k=>[k,globalThis[k]])),random=Math.random;t.after(()=>{Object.assign(globalThis,old);Math.random=random});
 let seed=1,seq=0,now=0;Math.random=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/2**32);const frames=new Map(),listeners=new Map(),labels=[],noop=()=>{};
 globalThis.window={devicePixelRatio:1};globalThis.ResizeObserver=class{observe(){} disconnect(){}};globalThis.requestAnimationFrame=f=>{frames.set(++seq,f);return seq};globalThis.cancelAnimationFrame=id=>frames.delete(id);
 const ctx=new Proxy({fillText(s){labels.push(s)}},{get:(o,k)=>o[k]??noop,set:(o,k,v)=>(o[k]=v,true)}),canvas={getContext:()=>ctx,getBoundingClientRect:()=>({left:0,top:0,width:320,height:720}),setAttribute:noop,focus:noop,addEventListener:(k,f)=>listeners.set(k,f),removeEventListener:k=>listeners.delete(k)};
 const records=[],game=createFeatureGame34(canvas,'void-gambit',{interactive:true,onResult:r=>records.push(r)}),key=k=>{listeners.get('keydown')({key:k,preventDefault:noop});listeners.get('keyup')({key:k,preventDefault:noop})},step=()=>{now+=1000/60;labels.length=0;const f=[...frames.values()];frames.clear();f.forEach(x=>x(now))};
 if(method==='keyboard')key('z');else listeners.get('pointerdown')({clientX:250,clientY:655});
 for(let i=0;i<15000&&game.getSessionState()!=='result';i++)step();assert.equal(game.getSessionState(),'result');assert.ok(labels.includes('Assisted run'));assert.equal(records.length,0);
 game.restart();for(let i=0;i<15000&&game.getSessionState()!=='result';i++){if(i%120===0)key('x');step()}assert.equal(game.getSessionState(),'result');assert.equal(records.length,1);assert.equal(records[0].actor,'human');assert.equal(records[0].result,'Hull lost');
 game.beginRun({interactive:false,context:'watch-player'});for(let i=0;i<20000&&records.length<2;i++)step();assert.equal(records.length,2);assert.equal(records[1].actor,'ai');assert.equal(records[1].context,'watch-player');assert.equal(records[1].submissionEligible,true);game.destroy();
});

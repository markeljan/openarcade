import test from 'node:test';
import assert from 'node:assert/strict';
import {createGame} from '../src/games.js';

test('Snake reports fresh manual runs once, excludes pause and isolates callback errors', t=>{
 const old=Object.fromEntries(['window','ResizeObserver','requestAnimationFrame','cancelAnimationFrame','localStorage'].map(k=>[k,globalThis[k]])); const random=Math.random;
 t.after(()=>{Object.assign(globalThis,old);Math.random=random}); Math.random=()=>0;
 let now=0,seq=0,errors=0; const pending=new Map(),records=[],writes=[]; const noop=()=>{};
 globalThis.window={devicePixelRatio:1};globalThis.ResizeObserver=class{observe(){} disconnect(){}};
 globalThis.localStorage={getItem:()=>null,setItem:(...v)=>writes.push(v)};
 globalThis.requestAnimationFrame=fn=>(pending.set(++seq,fn),seq);globalThis.cancelAnimationFrame=id=>pending.delete(id);
 const ctx=new Proxy({}, {get:()=>noop,set:()=>true});const listeners=new Map();
 const canvas={getContext:()=>ctx,getBoundingClientRect:()=>({left:0,top:0,width:320,height:240}),setAttribute:noop,addEventListener:(k,v)=>listeners.set(k,v),removeEventListener:k=>listeners.delete(k)};
 const step=()=>{now+=16.667;const f=[...pending.values()];pending.clear();f.forEach(fn=>fn(now))};
 const game=createGame(canvas,'snake',{interactive:false,onResult:r=>{records.push(r);throw Error('callback')},onError:()=>errors++});
 for(let i=0;i<100;i++)step();game.beginRun({interactive:true,context:'manual-player'});
 game.pause();now+=60000;game.resume();for(let i=0;i<500&&!records.length;i++)step();
 assert.equal(records.length,1);assert.equal(records[0].actor,'human');assert.equal(records[0].score,0);assert.equal(records[0].result,'GAME OVER');assert.ok(records[0].durationMs<10000);assert.equal(errors,1);
 for(let i=0;i<100;i++)step();assert.equal(records.length,1);game.restart();for(let i=0;i<500&&records.length<2;i++)step();assert.equal(records.length,2);assert.notEqual(records[0].runId,records[1].runId);assert.equal(records[1].context,'manual-player');
 game.setInteractive(false);game.setInteractive(true);game.destroy();for(let i=0;i<100;i++)step();assert.equal(records.length,2);assert.equal(pending.size,0);assert.equal(writes.length,0);
});

test('Snake AI reports natural terminal before a fresh preview run without local best writes', t=>{
 const old=Object.fromEntries(['window','ResizeObserver','requestAnimationFrame','cancelAnimationFrame','localStorage'].map(k=>[k,globalThis[k]]));const random=Math.random;t.after(()=>{Object.assign(globalThis,old);Math.random=random});
 let seed=42,now=0,seq=0,writes=0;Math.random=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296);const pending=new Map(),records=[],noop=()=>{};
 globalThis.window={devicePixelRatio:1};globalThis.ResizeObserver=class{observe(){}disconnect(){}};globalThis.localStorage={getItem:()=>null,setItem:()=>writes++};globalThis.requestAnimationFrame=fn=>(pending.set(++seq,fn),seq);globalThis.cancelAnimationFrame=id=>pending.delete(id);
 const ctx=new Proxy({}, {get:()=>noop,set:()=>true});const canvas={getContext:()=>ctx,getBoundingClientRect:()=>({left:0,top:0,width:320,height:240}),setAttribute:noop,addEventListener:noop,removeEventListener:noop};
 const game=createGame(canvas,'snake',{onResult:r=>records.push(r)});for(let i=0;i<150000&&records.length<2;i++){now+=33.34;const f=[...pending.values()];pending.clear();f.forEach(fn=>fn(now))}game.destroy();
 assert.equal(records.length,2);assert.ok(records.every(r=>r.actor==='ai'&&!r.submissionEligible&&r.score>=0));assert.notEqual(records[0].runId,records[1].runId);assert.equal(writes,0);
});
import {factories} from '../src/games.js';
for (const action of ['destroy','pause','restart']) test(`Snake ignores cleanup callbacks and handles synchronous ${action}`, t=>{
 const originalFactory=factories.snake, names=['window','ResizeObserver','requestAnimationFrame','cancelAnimationFrame','localStorage'],old=Object.fromEntries(names.map(k=>[k,globalThis[k]]));
 t.after(()=>{factories.snake=originalFactory;Object.assign(globalThis,old)});
 let seq=0,now=0,created=0,records=[],game;const pending=new Map(),noop=()=>{};
 globalThis.window={devicePixelRatio:1};globalThis.ResizeObserver=class{observe(){}disconnect(){}};globalThis.localStorage={getItem:()=>null,setItem:noop};globalThis.requestAnimationFrame=fn=>(pending.set(++seq,fn),seq);globalThis.cancelAnimationFrame=id=>pending.delete(id);
 factories.snake=end=>{const n=++created;return {input(k,down){if(!down)end('STALE',99)},destroy(){end('STALE',99)},update(){if(n===1)end('GAME OVER',1)},draw:noop}};
 const ctx=new Proxy({}, {get:()=>noop,set:()=>true});const canvas={getContext:()=>ctx,getBoundingClientRect:()=>({left:0,top:0,width:320,height:240}),setAttribute:noop,addEventListener:noop,removeEventListener:noop};
 game=createGame(canvas,'snake',{interactive:true,onResult:r=>{records.push(r);game[action]()}});
 now+=17;const callbacks=[...pending.values()];pending.clear();callbacks.forEach(fn=>fn(now));
 assert.equal(records.length,1);assert.equal(records[0].result,'GAME OVER');
 if(action==='destroy'||action==='pause')assert.equal(pending.size,0);
 if(action==='restart')assert.equal(created,2);
 game.destroy();game.restart();game.setInteractive(true);game.beginRun({interactive:true});assert.equal(records.length,1);assert.equal(pending.size,0);
});

test('Snake abandons old run before releasing input and destroying factory on takeover',t=>{
 const original=factories.snake,names=['window','ResizeObserver','requestAnimationFrame','cancelAnimationFrame'],old=Object.fromEntries(names.map(k=>[k,globalThis[k]]));t.after(()=>{factories.snake=original;Object.assign(globalThis,old)});
 const records=[],noop=()=>{};let seq=0;globalThis.window={devicePixelRatio:1};globalThis.ResizeObserver=class{observe(){}disconnect(){}};globalThis.requestAnimationFrame=()=>++seq;globalThis.cancelAnimationFrame=noop;
 factories.snake=end=>({input(k,d){if(!d)end('STALE',9)},destroy(){end('STALE',9)},update:noop,draw:noop});
 const ctx=new Proxy({}, {get:()=>noop,set:()=>true});const canvas={getContext:()=>ctx,getBoundingClientRect:()=>({left:0,top:0,width:320,height:240}),setAttribute:noop,addEventListener:noop,removeEventListener:noop};
 const game=createGame(canvas,'snake',{onResult:r=>records.push(r)});game.setInteractive(true);assert.deepEqual(records,[]);game.destroy();assert.deepEqual(records,[]);
});
test('Snake actor transitions preserve embed or select intentional player contexts',t=>{
 const original=factories.snake,names=['window','ResizeObserver','requestAnimationFrame','cancelAnimationFrame'],old=Object.fromEntries(names.map(k=>[k,globalThis[k]]));t.after(()=>{factories.snake=original;Object.assign(globalThis,old)});let seq=0,now=0;const pending=new Map(),records=[],noop=()=>{};
 globalThis.window={devicePixelRatio:1};globalThis.ResizeObserver=class{observe(){}disconnect(){}};globalThis.requestAnimationFrame=f=>(pending.set(++seq,f),seq);globalThis.cancelAnimationFrame=id=>pending.delete(id);factories.snake=end=>({input:noop,update(){end('END',1)},draw:noop});
 const ctx=new Proxy({}, {get:()=>noop,set:()=>true}),canvas={getContext:()=>ctx,getBoundingClientRect:()=>({left:0,top:0,width:320,height:240}),setAttribute:noop,addEventListener:noop,removeEventListener:noop};const step=()=>{now+=34;const f=[...pending.values()];pending.clear();f.forEach(fn=>fn(now))};
 const game=createGame(canvas,'snake',{context:'embed',onResult:r=>records.push(r)});step();game.setInteractive(true);step();game.setInteractive(false);step();assert.deepEqual(records.map(r=>r.context),['embed','embed','embed']);game.beginRun({interactive:true,context:'manual-player'});step();game.setInteractive(false);step();assert.deepEqual(records.slice(-2).map(r=>r.context),['manual-player','watch-player']);game.destroy();
});
test('synchronous pause and resume schedules one frame',t=>{
 const original=factories.snake,names=['window','ResizeObserver','requestAnimationFrame','cancelAnimationFrame'],old=Object.fromEntries(names.map(k=>[k,globalThis[k]]));t.after(()=>{factories.snake=original;Object.assign(globalThis,old)});let seq=0,game;const pending=new Map(),noop=()=>{};globalThis.window={devicePixelRatio:1};globalThis.ResizeObserver=class{observe(){}disconnect(){}};globalThis.requestAnimationFrame=f=>(pending.set(++seq,f),seq);globalThis.cancelAnimationFrame=id=>pending.delete(id);factories.snake=end=>({input:noop,update(){end('END',1)},draw:noop});const ctx=new Proxy({}, {get:()=>noop,set:()=>true}),canvas={getContext:()=>ctx,getBoundingClientRect:()=>({left:0,top:0,width:320,height:240}),setAttribute:noop,addEventListener:noop,removeEventListener:noop};game=createGame(canvas,'snake',{interactive:true,onResult:()=>{game.pause();game.resume()}});const f=[...pending.values()];pending.clear();f.forEach(fn=>fn(17));assert.equal(pending.size,1);game.destroy();assert.equal(pending.size,0);
});
test('positive natural Snake score is reported and saved as local best',t=>{
 const names=['window','ResizeObserver','requestAnimationFrame','cancelAnimationFrame','localStorage'],old=Object.fromEntries(names.map(k=>[k,globalThis[k]])),random=Math.random;t.after(()=>{Object.assign(globalThis,old);Math.random=random});let count=0,seed=42,seq=0,now=0;Math.random=()=>count++===0?199.1/381:((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296);const pending=new Map(),data=new Map(),records=[],noop=()=>{};globalThis.window={devicePixelRatio:1};globalThis.ResizeObserver=class{observe(){}disconnect(){}};globalThis.localStorage={getItem:k=>data.get(k),setItem:(k,v)=>data.set(k,v)};globalThis.requestAnimationFrame=f=>(pending.set(++seq,f),seq);globalThis.cancelAnimationFrame=id=>pending.delete(id);const ctx=new Proxy({}, {get:()=>noop,set:()=>true}),canvas={getContext:()=>ctx,getBoundingClientRect:()=>({left:0,top:0,width:320,height:240}),setAttribute:noop,addEventListener:noop,removeEventListener:noop};const game=createGame(canvas,'snake',{interactive:true,onResult:r=>records.push(r)});for(let i=0;i<500&&!records.length;i++){now+=16.667;const f=[...pending.values()];pending.clear();f.forEach(fn=>fn(now))}assert.equal(records[0].score,1);assert.equal(data.get('tiny-arcade.best.snake'),'1');game.destroy();
});

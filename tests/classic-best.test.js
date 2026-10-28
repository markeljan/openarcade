import test from 'node:test';
import assert from 'node:assert/strict';
import {createGame} from '../src/games.js';
function setup(t,storage){
 const names=['window','ResizeObserver','requestAnimationFrame','cancelAnimationFrame','localStorage'],original=Object.fromEntries(names.map(k=>[k,globalThis[k]])),oldRandom=Math.random;
 t.after(()=>{Object.assign(globalThis,original);Math.random=oldRandom});let seq=0,now=0,labels=[],randomCount=0,seed=42;const callbacks=new Map(),noop=()=>{};
 Math.random=()=>randomCount++===0?199.1/381:((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296);
 globalThis.window={devicePixelRatio:1};globalThis.localStorage=storage;globalThis.ResizeObserver=class{observe(){}disconnect(){}};
 globalThis.requestAnimationFrame=fn=>{callbacks.set(++seq,fn);return seq};globalThis.cancelAnimationFrame=id=>callbacks.delete(id);
 const ctx=new Proxy({fillText(s){labels.push(String(s))}},{get:(o,k)=>o[k]??noop,set:(o,k,v)=>(o[k]=v,true)});
 const canvas={getContext:()=>ctx,getBoundingClientRect:()=>({left:0,top:0,width:320,height:720}),setAttribute:noop,focus:noop,addEventListener:noop,removeEventListener:noop};
 const step=()=>{now+=1000/60;labels=[];const next=[...callbacks.values()];callbacks.clear();next.forEach(fn=>fn(now))};
 return {canvas,step,get labels(){return labels}};
}
test('classic manual best is stored and shown in the next run',t=>{
 const data=new Map(),storage={getItem:k=>data.get(k)??null,setItem:(k,v)=>data.set(k,v)},h=setup(t,storage);
 let game=createGame(h.canvas,'snake',{interactive:true});for(let i=0;i<500&&!h.labels.includes('GAME OVER');i++)h.step();
 assert.equal(data.get('tiny-arcade.best.snake'),'1');assert.ok(h.labels.includes('SCORE 1   BEST 1'));game.destroy();
 game=createGame(h.canvas,'snake',{interactive:true});for(let i=0;i<500&&!h.labels.includes('GAME OVER');i++)h.step();
 assert.ok(h.labels.some(s=>/BEST 1/.test(s)));game.destroy();
});
test('autoplay never writes a best and blocked storage does not break manual play',t=>{
 let writes=0;const h=setup(t,{getItem(){throw Error('denied')},setItem(){writes++;throw Error('denied')}});
 const game=createGame(h.canvas,'snake',{interactive:false});for(let i=0;i<1800;i++)h.step();assert.equal(writes,0);
 game.setInteractive(true);game.restart();for(let i=0;i<500&&!h.labels.includes('GAME OVER');i++)h.step();
 assert.ok(h.labels.includes('GAME OVER'));game.destroy();
});


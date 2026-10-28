import test from 'node:test';
import assert from 'node:assert/strict';
import { createFeatureGame5, featureGames5 } from '../src/feature-games5.js';
import { createFeatureGame10, featureGames10 } from '../src/feature-games10.js';
import { createFeatureGame17, featureGames17 } from '../src/feature-games17.js';
import { createFeatureGame21, featureGames21 } from '../src/feature-games21.js';
import { createFeatureGame24, featureGames24 } from '../src/feature-games24.js';
import { createFeatureGame27, featureGames27 } from '../src/feature-games27.js';
import { createFeatureGame30, featureGames30 } from '../src/feature-games30.js';
import { createFeatureGame34, featureGames34 } from '../src/feature-games34.js';
import { createFeatureGame38, featureGames38 } from '../src/feature-games38.js';

for(const [make,list] of [[createFeatureGame5,featureGames5],[createFeatureGame10,featureGames10],[createFeatureGame17,featureGames17],[createFeatureGame21,featureGames21],[createFeatureGame24,featureGames24],[createFeatureGame27,featureGames27],[createFeatureGame30,featureGames30],[createFeatureGame34,featureGames34],[createFeatureGame38,featureGames38]])test(`${list[0].id} previews at 30fps and plays at display rate`,t=>{
 const originals=Object.fromEntries(['window','ResizeObserver','requestAnimationFrame','cancelAnimationFrame'].map(k=>[k,globalThis[k]]));t.after(()=>Object.assign(globalThis,originals));
 let seq=0,now=0,draws=0,seen=false;const scheduled=new Map(),noop=()=>{};globalThis.window={devicePixelRatio:1};globalThis.ResizeObserver=class{observe(){}disconnect(){}};globalThis.requestAnimationFrame=fn=>{const id=++seq;scheduled.set(id,fn);return id};globalThis.cancelAnimationFrame=id=>scheduled.delete(id);
 const context=new Proxy({setTransform(){if(!seen){seen=true;draws++}}},{get:(o,k)=>o[k]??noop,set:(o,k,v)=>(o[k]=v,true)});const canvas={getContext:()=>context,getBoundingClientRect:()=>({left:0,top:0,width:320,height:720}),setAttribute:noop,addEventListener:noop,removeEventListener:noop,focus:noop};
 const game=make(canvas,list[0].id,{interactive:false});function run(frames){draws=0;for(let i=0;i<frames;i++){now+=1000/60;seen=false;const callbacks=[...scheduled.values()];scheduled.clear();callbacks.forEach(fn=>fn(now))}return draws}
 const preview=run(120);assert.ok(preview>=59&&preview<=61,`preview drew ${preview} frames`);game.setInteractive(true);const manual=run(120);assert.equal(manual,120);game.pause();assert.equal(scheduled.size,0);game.resume();assert.ok(scheduled.size>0);game.destroy();assert.equal(scheduled.size,0);
});

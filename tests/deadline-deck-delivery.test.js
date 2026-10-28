import test from 'node:test';
import assert from 'node:assert/strict';
import {createFeatureGame5} from '../src/feature-games5.js';

test('Deadline Deck manual papers travel before they count as delivered',t=>{
 const originalRandom=Math.random,originals=Object.fromEntries(['window','ResizeObserver','requestAnimationFrame','cancelAnimationFrame'].map(k=>[k,globalThis[k]]));
 t.after(()=>{Math.random=originalRandom;Object.assign(globalThis,originals)});
 let seed=0x12345678,frame=0,next,labels=[],delivered=0,sawFlight=false;
 Math.random=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/2**32);
 const noop=()=>{},listeners=new Map();globalThis.window={devicePixelRatio:1};globalThis.ResizeObserver=class{observe(){}disconnect(){}};globalThis.requestAnimationFrame=fn=>(next=fn,1);globalThis.cancelAnimationFrame=noop;
 const ctx=new Proxy({fillText(s){labels.push(String(s))}},{get:(o,k)=>o[k]??noop,set:(o,k,v)=>(o[k]=v,true)});
 const canvas={getContext:()=>ctx,getBoundingClientRect:()=>({width:320,height:720}),setAttribute:noop,addEventListener:(k,v)=>listeners.set(k,v),removeEventListener:noop};
 const game=createFeatureGame5(canvas,'deadline-deck',{interactive:true});
 const step=()=>{labels=[];next(++frame*1000/60);const match=labels.find(s=>s.includes('DELIVERED '))?.match(/DELIVERED (\d+)/);if(match)delivered=Number(match[1]);};
 for(;frame<60*40&&!sawFlight;){if(frame%30===0){const before=delivered;listeners.get('keydown')({key:'x',preventDefault:noop});step();assert.equal(delivered,before,'throw must not instantly deliver');listeners.get('keyup')({key:'x',preventDefault:noop});for(let i=0;i<25;i++)step();if(delivered>before)sawFlight=true;}else step();}
 game.destroy();assert.ok(sawFlight,'a manual throw should reach a subscriber');
});

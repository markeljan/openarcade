import test from 'node:test';
import assert from 'node:assert/strict';
import {createFeatureGame3} from '../src/feature-games3.js';

test('Word Fall charges altars through collected gems and presents arena words', t=>{
 const originalRandom=Math.random,originals=Object.fromEntries(['window','ResizeObserver','requestAnimationFrame','cancelAnimationFrame'].map(k=>[k,globalThis[k]]));
 t.after(()=>{Math.random=originalRandom;Object.assign(globalThis,originals)});
 let seed=42,frame=0,next,labels=[],maxGems=0,sawAltar=false,sawClue=false;
 Math.random=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/2**32);
 const noop=()=>{};globalThis.window={devicePixelRatio:1};globalThis.ResizeObserver=class{observe(){}disconnect(){}};globalThis.requestAnimationFrame=fn=>(next=fn,1);globalThis.cancelAnimationFrame=noop;
 const ctx=new Proxy({fillText(s){labels.push(String(s))}},{get:(o,k)=>o[k]??noop,set:(o,k,v)=>(o[k]=v,true)});
 const canvas={getContext:()=>ctx,getBoundingClientRect:()=>({width:320,height:720}),setAttribute:noop,addEventListener:noop,removeEventListener:noop};
 const game=createFeatureGame3(canvas,'word-fall',{interactive:false});
 for(;frame<60*300&&!sawClue;){labels=[];next(++frame*1000/60);const hud=labels.find(s=>s.startsWith('GEMS '));if(hud)maxGems=Math.max(maxGems,Number(hud.match(/GEMS (\d+)/)[1]));if(labels.some(s=>['SLATE','ROUND','CHIME','BRAWL','POINT','CRANE','AUDIO','REACT','STARE','MOUND'].includes(s)))sawAltar=true;if(sawAltar&&labels.some(s=>s.length===1&&/[A-Z]/.test(s)))sawClue=true;}
 game.destroy();assert.ok(maxGems>=18,'combat must collect gems before an altar appears');assert.ok(sawAltar,'starter word altars should appear in the arena');assert.ok(sawClue,'choosing an altar should display letter clues');
});

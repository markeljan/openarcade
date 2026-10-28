import test from 'node:test';
import assert from 'node:assert/strict';
import {createFeatureGame17,ashenPickup} from '../src/feature-games17.js';

test('weapon, wrench and nitro pickups apply bounded upgrades',()=>{
  let state={weapon:0,health:2,boost:40};ashenPickup('weapon',state);ashenPickup('weapon',state);ashenPickup('weapon',state);assert.equal(state.weapon,2);ashenPickup('wrench',state);assert.equal(state.health,4);ashenPickup('nitro',state);assert.equal(state.boost,85);
});
function run(t,interactive){
  const original=Object.fromEntries(['window','ResizeObserver','requestAnimationFrame','cancelAnimationFrame'].map(k=>[k,globalThis[k]])),random=Math.random;t.after(()=>{Object.assign(globalThis,original);Math.random=random});let seed=4;Math.random=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296};globalThis.window={devicePixelRatio:1};globalThis.ResizeObserver=class{observe(){}disconnect(){}};let next,now=0,weapon=false;globalThis.requestAnimationFrame=f=>(next=f,1);globalThis.cancelAnimationFrame=()=>{};const noop=()=>{},handlers={},ctx=new Proxy({fillText(s){if(/CHAIN|PIPE/.test(s))weapon=true}},{get:(o,k)=>o[k]??noop,set:(o,k,v)=>(o[k]=v,true)});const canvas={getContext:()=>ctx,getBoundingClientRect:()=>({width:320,height:720}),setAttribute:noop,addEventListener:(k,f)=>handlers[k]=f,removeEventListener:noop};const game=createFeatureGame17(canvas,'ashen-rage',{interactive});if(interactive){handlers.keydown({key:'ArrowLeft',preventDefault:noop});for(let i=0;i<9;i++){now+=50;next(now)}handlers.keyup({key:'ArrowLeft',preventDefault:noop})}for(let i=0;i<1400&&!weapon;i++){now+=50;next(now)}game.destroy();return weapon;
}
test('manual rider collects the first weapon pickup',t=>assert.ok(run(t,true)));
test('preview rider seeks a weapon pickup',t=>assert.ok(run(t,false)));

import test from 'node:test';
import assert from 'node:assert/strict';
import {createFeatureGame17,createAshenRage,ashenPickup} from '../src/feature-games17.js';

test('weapon, wrench and nitro pickups apply bounded upgrades',()=>{
  let state={weapon:0,health:2,boost:40};ashenPickup('weapon',state);ashenPickup('weapon',state);ashenPickup('weapon',state);assert.equal(state.weapon,2);ashenPickup('wrench',state);assert.equal(state.health,4);ashenPickup('nitro',state);assert.equal(state.boost,85);
});
function run(t,interactive){
  const original=Object.fromEntries(['window','ResizeObserver','requestAnimationFrame','cancelAnimationFrame'].map(k=>[k,globalThis[k]])),random=Math.random;t.after(()=>{Object.assign(globalThis,original);Math.random=random});let seed=4;Math.random=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296};globalThis.window={devicePixelRatio:1};globalThis.ResizeObserver=class{observe(){}disconnect(){}};let next,now=0,weapon=false;globalThis.requestAnimationFrame=f=>(next=f,1);globalThis.cancelAnimationFrame=()=>{};const noop=()=>{},handlers={},ctx=new Proxy({fillText(s){if(/CHAIN|PIPE/.test(s))weapon=true}},{get:(o,k)=>o[k]??noop,set:(o,k,v)=>(o[k]=v,true)});const canvas={getContext:()=>ctx,getBoundingClientRect:()=>({width:320,height:720}),setAttribute:noop,addEventListener:(k,f)=>handlers[k]=f,removeEventListener:noop};const game=createFeatureGame17(canvas,'ashen-rage',{interactive});if(interactive){handlers.keydown({key:'ArrowLeft',preventDefault:noop});for(let i=0;i<28;i++){now+=50;next(now)}handlers.keyup({key:'ArrowLeft',preventDefault:noop})}for(let i=0;i<1400&&!weapon;i++){now+=50;next(now)}game.destroy();return weapon;
}
test('manual rider collects the first weapon pickup',t=>assert.ok(run(t,true)));
test('preview rider seeks a weapon pickup',t=>assert.ok(run(t,false)));

test('a near miss grants nitro once without collision damage',()=>{
 const old=Math.random;Math.random=()=>.5;try{const g=createAshenRage();g.input('ArrowRight',true);for(let i=0;i<35;i++)g.update(1/60,false);g.input('ArrowRight',false);g.input(' ',true);let s,previous;for(let i=0;i<500;i++){previous=g.snapshot();g.update(1/60,false);s=g.snapshot();if(s.nearMisses)break}assert.equal(s.nearMisses,1);assert.equal(s.health,previous.health);assert.ok(s.boost>previous.boost+6);const seen=s.nearMisses;for(let i=0;i<10;i++)g.update(1/60,false);assert.equal(g.snapshot().nearMisses,seen)}finally{Math.random=old}
});


test('nitro requires 30 charge and runs for 90 frames after release in manual and AI',()=>{const old=Math.random;Math.random=()=>.5;try{for(const auto of [false,true]){const g=createAshenRage();assert.equal(g.snapshot().boost,20);if(!auto)g.input(' ',true);g.update(1/60,auto);assert.equal(g.snapshot().boostTime,0);assert.equal(g.snapshot().boost,20);for(let i=0;i<500&&!g.snapshot().boostTime;i++)g.update(1/60,auto);let s=g.snapshot();assert.ok(s.boostTime>1.45,'overtake or pickup enables burst');if(!auto)g.input(' ',false);const start=s.boostTime;for(let i=0;i<30;i++)g.update(1/60,auto);s=g.snapshot();assert.ok(Math.abs(s.boostTime-(start-.5))<1e-6,'burst persists without holding the trigger')}}finally{Math.random=old}});

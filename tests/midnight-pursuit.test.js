import test from 'node:test';
import assert from 'node:assert/strict';
import {createFeatureGame9,pursuit,pursuitHitsRoadblock} from '../src/feature-games9.js';

test('a ramp jump clears a roadblock while an unsafe ground lane hits',()=>{
  assert.equal(pursuitHitsRoadblock(58,182,false),true);
  assert.equal(pursuitHitsRoadblock(58,182,true),false);
  assert.equal(pursuitHitsRoadblock(182,182,false),false);
});

test('AI pursuit uses garages, ramps or paint while continuing to drive',t=>{
  const originals=Object.fromEntries(['window','ResizeObserver','requestAnimationFrame','cancelAnimationFrame'].map(k=>[k,globalThis[k]])),random=Math.random;
  t.after(()=>{Object.assign(globalThis,originals);Math.random=random});let seed=7;Math.random=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296};
  globalThis.window={devicePixelRatio:1};globalThis.ResizeObserver=class{observe(){} disconnect(){}};let next,now=0,swaps=0,jumps=0,paints=0,dist=0;globalThis.requestAnimationFrame=f=>(next=f,1);globalThis.cancelAnimationFrame=()=>{};
  const noop=()=>{},ctx=new Proxy({fillText(s){let m=/^SWAPS (\d+)$/.exec(s);if(m)swaps=Math.max(swaps,+m[1]);m=/^JUMPS (\d+)  PAINT (\d+)$/.exec(s);if(m){jumps=Math.max(jumps,+m[1]);paints=Math.max(paints,+m[2])}m=/^DIST (\d+)m$/.exec(s);if(m)dist=Math.max(dist,+m[1])}},{get:(o,k)=>o[k]??noop,set:(o,k,v)=>(o[k]=v,true)});
  const canvas={getContext:()=>ctx,getBoundingClientRect:()=>({width:240,height:540}),setAttribute:noop,addEventListener:noop,removeEventListener:noop};const game=createFeatureGame9(canvas,'midnight-pursuit');
  for(let i=0;i<6000;i++){now+=50;next(now)}game.destroy();assert.ok(dist>500);assert.ok(swaps+jumps+paints>0,'AI never used a route feature');
});

test('manual driver can steer onto a ramp and launch',t=>{
  const originals=Object.fromEntries(['window','ResizeObserver','requestAnimationFrame','cancelAnimationFrame'].map(k=>[k,globalThis[k]])),random=Math.random;
  t.after(()=>{Object.assign(globalThis,originals);Math.random=random});let seed=7;Math.random=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296};
  globalThis.window={devicePixelRatio:1};globalThis.ResizeObserver=class{observe(){} disconnect(){}};let next,now=0,labels=[],carX=120,ramp=null,airborne=false;globalThis.requestAnimationFrame=f=>(next=f,1);globalThis.cancelAnimationFrame=()=>{};
  const noop=()=>{},handlers={},ctx=new Proxy({fillText(s,x,y){labels.push(s);if(s==='RAMP')ramp={x,y};if(s==='AIRBORNE')airborne=true},fillRect(x,y,w,h){if(w===24&&h===40&&(y===390||y===378))carX=x+12}},{get:(o,k)=>o[k]??noop,set:(o,k,v)=>(o[k]=v,true)});
  const canvas={getContext:()=>ctx,getBoundingClientRect:()=>({width:240,height:540}),setAttribute:noop,addEventListener:(k,f)=>handlers[k]=f,removeEventListener:noop};const game=createFeatureGame9(canvas,'midnight-pursuit',{interactive:true});
  const key=(k,d)=>handlers[d?'keydown':'keyup']({key:k,preventDefault:noop});key('ArrowUp',true);
  for(let i=0;i<4000&&!airborne;i++){labels=[];ramp=null;now+=50;next(now);if(ramp&&ramp.y<420){key('ArrowLeft',carX>ramp.x+5);key('ArrowRight',carX<ramp.x-5)}else{key('ArrowLeft',false);key('ArrowRight',false)}}
  game.destroy();assert.ok(airborne,'driver never launched from a ramp');
});

test('manual garage swap changes vehicle halfway through its 84-frame sequence',()=>{const old=Math.random;Math.random=()=>0;try{const g=pursuit(),sounds=[];g.input('ArrowUp',true);let s;for(let i=0;i<4000;i++){s=g.snapshot();if(s.swapTimer>0)break;if(s.garage){g.input('ArrowLeft',s.x>s.garage.x+5);g.input('ArrowRight',s.x<s.garage.x-5)}g.update(1/60,false)}assert.ok(s.swapTimer>0);assert.equal(s.vehicle,'coupe');assert.equal(s.swapTarget,'bike');assert.equal(s.decoy.vehicle,'coupe');for(let i=0;i<41;i++)g.update(1/60,false);assert.equal(g.snapshot().vehicle,'coupe');for(let i=0;i<2;i++)g.update(1/60,false);s=g.snapshot();assert.equal(s.vehicle,'bike');assert.ok(s.swapTimer>0);for(let i=0;i<43;i++)g.update(1/60,false);s=g.snapshot();assert.equal(s.swap,1);assert.equal(s.swapTarget,null);assert.equal(s.vehicle,'bike')}finally{Math.random=old}});
test('AI garage swaps choose and retain an actual new vehicle',()=>{const old=Math.random;Math.random=()=>0;try{const g=pursuit();for(let i=0;i<6000&&(g.snapshot().swap===0||g.snapshot().swapTimer>0);i++)g.update(1/60,true);const s=g.snapshot();assert.ok(s.swap>0);assert.equal(s.vehicle,'bike');assert.equal(s.swapTarget,null)}finally{Math.random=old}});

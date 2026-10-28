import test from 'node:test';
import assert from 'node:assert/strict';
import {createFeatureGame5,deadline} from '../src/feature-games5.js';

test('Deadline Deck autoplay banks deliveries before the route ends',()=>{
  const previousRandom=Math.random;let seed=0x12345678,scheduled,id=0,score=0,delivered=0,firstScore=0;
  Math.random=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/0x100000000);
  const noop=()=>{};
  globalThis.window={devicePixelRatio:1};globalThis.ResizeObserver=class{observe(){} disconnect(){}};
  globalThis.requestAnimationFrame=fn=>(scheduled=fn,++id);globalThis.cancelAnimationFrame=()=>{scheduled=null};
  const context=new Proxy({fillText(text){let match=/^SCORE (\d+)/.exec(text);if(match){score=Number(match[1]);if(score&&!firstScore)firstScore=frame;}match=/DELIVERED (\d+)/.exec(text);if(match)delivered=Math.max(delivered,Number(match[1]));}}, {get:(o,k)=>k in o?o[k]:noop,set:(o,k,v)=>(o[k]=v,true)});
  const canvas={getContext:()=>context,getBoundingClientRect:()=>({width:320,height:720}),setAttribute:noop,addEventListener:noop,removeEventListener:noop};
  const game=createFeatureGame5(canvas,'deadline-deck');let frame=0;
  try {for(frame=1;frame<=3600;frame++)scheduled(frame*1000/60);
    assert.ok(delivered>=10,`only ${delivered} deliveries`);
    assert.ok(firstScore>0&&firstScore<1800,`first bank at frame ${firstScore}`);
    assert.ok(score>0,`no score banked despite ${delivered} deliveries`);
  } finally {game.destroy();Math.random=previousRandom;}
});

test('manual skater accelerates and coasts after releasing a turn',()=>{const g=deadline();g.input('ArrowRight',true);g.update(1/60,false);const first=g.snapshot().p;for(let i=0;i<4;i++)g.update(1/60,false);const fast=g.snapshot().p;assert.ok(fast.vx>first.vx);g.input('ArrowRight',false);g.update(1/60,false);const coast=g.snapshot().p;assert.ok(coast.x>fast.x);assert.ok(coast.vx>0&&coast.vx<fast.vx)});
test('AI uses momentum while navigating its route',()=>{const g=deadline();let moved=false;for(let i=0;i<3000;i++){const a=g.snapshot().p;g.update(1/60,true);const b=g.snapshot().p;if(Math.abs(b.vx)>1&&b.x!==a.x){moved=true;assert.ok(Math.abs(b.vx)<=360);break}}assert.ok(moved)});

import test from 'node:test';
import assert from 'node:assert/strict';
import {createFeatureGame9,haulValue,haulAttach,haulTetherStep,haulCargoCollision,haul} from '../src/feature-games9.js';

test('haul values reward longer material trains',()=>{
  assert.equal(haulValue([3,6]),9);
  assert.equal(haulValue([3,6,9]),23);
  assert.equal(haulValue([3,6,9,4]),34);
});

test('manual tug can fire and the shift reaches a quota result',t=>{
  const originals=Object.fromEntries(['window','ResizeObserver','requestAnimationFrame','cancelAnimationFrame'].map(k=>[k,globalThis[k]]));
  t.after(()=>Object.assign(globalThis,originals));
  globalThis.window={devicePixelRatio:1};globalThis.ResizeObserver=class{observe(){} disconnect(){}};
  let next,now=0,lines=[],arcs=0;globalThis.requestAnimationFrame=fn=>(next=fn,1);globalThis.cancelAnimationFrame=()=>{};
  const noop=()=>{},handlers={},ctx=new Proxy({fillText(s){lines.push(s)},arc(){arcs++}},{get:(o,k)=>o[k]??noop,set:(o,k,v)=>(o[k]=v,true)});
  const canvas={getContext:()=>ctx,getBoundingClientRect:()=>({width:240,height:540}),setAttribute:noop,addEventListener:(k,f)=>handlers[k]=f,removeEventListener:noop};
  const game=createFeatureGame9(canvas,'cosmic-haul',{interactive:true});
  function frame(){lines=[];arcs=0;now+=50;next(now)}
  frame();assert.ok(lines.includes('ARK 0/260'));
  handlers.keydown({key:'x',preventDefault:noop});frame();assert.ok(arcs>75,'manual fire renders a projectile');handlers.keyup({key:'x',preventDefault:noop});
  for(let i=0;i<18005;i++)frame();
  assert.ok(lines.includes('QUOTA MISSED'),'shift ends at the quota deadline');
  game.destroy();
});

test('preview tug breaks rocks and banks salvage',t=>{
  const originals=Object.fromEntries(['window','ResizeObserver','requestAnimationFrame','cancelAnimationFrame'].map(k=>[k,globalThis[k]])),random=Math.random;
  t.after(()=>{Object.assign(globalThis,originals);Math.random=random});
  let seed=42;Math.random=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296};
  globalThis.window={devicePixelRatio:1};globalThis.ResizeObserver=class{observe(){} disconnect(){}};
  let next,now=0,bank=0;globalThis.requestAnimationFrame=fn=>(next=fn,1);globalThis.cancelAnimationFrame=()=>{};
  const noop=()=>{},ctx=new Proxy({fillText(s){const m=/^ARK (\d+)\/260$/.exec(s);if(m)bank=Math.max(bank,+m[1])}},{get:(o,k)=>o[k]??noop,set:(o,k,v)=>(o[k]=v,true)});
  const canvas={getContext:()=>ctx,getBoundingClientRect:()=>({width:240,height:540}),setAttribute:noop,addEventListener:noop,removeEventListener:noop};
  const game=createFeatureGame9(canvas,'cosmic-haul');
  for(let i=0;i<12000&&!bank;i++){now+=50;next(now)}
  assert.ok(bank>0,'AI never banked salvage');game.destroy();
});

test('new tow cargo is inserted near the tug and train capacity is nine',()=>{const train=[{tied:true,order:0},{tied:true,order:1}],fresh={tied:false};assert.ok(haulAttach(train,fresh));assert.equal(fresh.order,0);assert.deepEqual(train.map(x=>x.order),[1,2]);assert.equal(haulAttach(Array.from({length:9},()=>({order:0})),{}),false);});
test('stretched links pull both cargo and tug, and a broken link releases its tail',()=>{const ship={x:0,y:0,vx:0,vy:0},a={x:30,y:0,vx:0,vy:0,kind:0,tied:true,order:0},b={x:50,y:0,vx:0,vy:0,kind:0,tied:true,order:1};let state=haulTetherStep(ship,[a,b],[1],1/60);assert.equal(state.snapped,0);assert.ok(ship.vx>0);assert.ok(a.vx<0);b.x=200;state=haulTetherStep(ship,[a,b],[1],1/60);assert.equal(state.snapped,1);assert.equal(a.tied,true);assert.equal(b.tied,false);});

test('manual takeover can release and reattach nearby cargo',()=>{const old=Math.random;let seed=42;Math.random=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296);try{const g=haul();let s;for(let i=0;i<15000;i++){g.update(1/60,true);s=g.snapshot();const t=s.frags.filter(f=>f.tied);if(t.length===1&&Math.hypot(t[0].x-s.ship.x,t[0].y-s.ship.y)<21)break}let tied=s.frags.filter(f=>f.tied);assert.equal(tied.length,1,'AI should obtain a close fragment');g.input('Shift',true);g.input('Shift',false);assert.equal(g.snapshot().frags.filter(f=>f.tied).length,0);const before=g.snapshot().sessionScore;g.input(' ',true);g.input(' ',false);s=g.snapshot();assert.equal(s.frags.filter(f=>f.tied).length,1);assert.equal(s.sessionScore,before+8);}finally{Math.random=old}});

test('hard rock contact rips only the struck rear segment and transfers momentum',()=>{const train=Array.from({length:4},(_,i)=>({x:i===2?14:80+i*20,y:0,vx:i===2?-220:0,vy:0,tied:true,order:i})),rock={x:0,y:0,r:10,vx:0,vy:0};assert.equal(haulCargoCollision(train,[rock],train),2);assert.deepEqual(train.map(f=>f.tied),[true,true,false,false]);assert.ok(train[2].vx>0,'cargo should rebound');assert.ok(rock.vx<0,'rock should receive an impulse');});
test('gentle impacts and hard impacts at the front do not rip the tail',()=>{for(const [index,speed] of [[2,-100],[0,-220]]){const train=Array.from({length:3},(_,i)=>({x:i===index?14:100+i*20,y:0,vx:i===index?speed:0,vy:0,tied:true,order:i})),rock={x:0,y:0,r:10,vx:0,vy:0};assert.equal(haulCargoCollision(train,[rock],train),0);assert.ok(train.every(f=>f.tied));}});

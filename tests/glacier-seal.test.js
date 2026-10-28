import test from 'node:test';
import assert from 'node:assert/strict';
import {createFeatureGame32} from '../src/feature-games32.js';

test('Glacier Glide seal patrol stays onscreen during accelerated preview', t=>{
  const names=['performance','window','ResizeObserver','requestAnimationFrame','cancelAnimationFrame'];
  const original=Object.fromEntries(names.map(name=>[name,globalThis[name]]));
  t.after(()=>Object.assign(globalThis,original));
  const noop=()=>{},frames=new Map(),positions=[];let id=0;
  globalThis.performance={now:()=>1400};
  globalThis.window={devicePixelRatio:1};
  globalThis.ResizeObserver=class{observe(){} disconnect(){}};
  globalThis.requestAnimationFrame=fn=>{frames.set(++id,fn);return id};
  globalThis.cancelAnimationFrame=id=>frames.delete(id);
  const ctx=new Proxy({arc(x,y,r){if(y===350&&r===16)positions.push(x)}},{get:(o,k)=>o[k]??noop,set:(o,k,v)=>(o[k]=v,true)});
  const canvas={getContext:()=>ctx,getBoundingClientRect:()=>({width:320,height:720}),setAttribute:noop,addEventListener:noop,removeEventListener:noop};
  const game=createFeatureGame32(canvas,'glacier-glide');
  for(let frame=1;frame<=7200;frame++){const callbacks=[...frames.values()];frames.clear();callbacks.forEach(fn=>fn(frame*1000/60));}
  game.destroy();
  assert.ok(positions.length>100);
  assert.ok(Math.min(...positions)>=260&&Math.max(...positions)<=300);
  assert.ok(Math.max(...positions)-Math.min(...positions)>35,'seal should patrol rather than stay still');
});

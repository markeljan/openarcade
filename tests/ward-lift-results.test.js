import test from 'node:test';
import assert from 'node:assert/strict';
import {createFeatureGame28} from '../src/feature-games28.js';
import {createFeatureGame26} from '../src/feature-games26.js';
function harness(make,id,interactive,seed=1){
  const oldRandom=Math.random;let scheduled,idSeq=0,frame=0,labels=[];const listeners=new Map(),noop=()=>{};
  Math.random=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/0x100000000);
  globalThis.window={devicePixelRatio:1};globalThis.ResizeObserver=class{observe(){} disconnect(){}};
  globalThis.requestAnimationFrame=fn=>(scheduled=fn,++idSeq);globalThis.cancelAnimationFrame=()=>{scheduled=null};
  const ctx=new Proxy({fillText(s){labels.push(s)}},{get:(o,k)=>k in o?o[k]:noop,set:(o,k,v)=>(o[k]=v,true)});
  const canvas={getContext:()=>ctx,getBoundingClientRect:()=>({width:320,height:720}),setAttribute:noop,addEventListener(k,v){listeners.set(k,v)},removeEventListener(k){listeners.delete(k)}};
  const game=make(canvas,id,{interactive}),step=()=>{labels=[];scheduled(++frame*1000/60);return labels;};
  const key=(k,d)=>listeners.get(d?'keydown':'keyup')({key:k,preventDefault:noop}),press=k=>{key(k,true);key(k,false)};
  return {game,step,key,press,close(){game.destroy();Math.random=oldRandom;}};
}
test('Starlight Ward shadow strikes remain nonfatal and explicit restart works',()=>{const h=harness(createFeatureGame28,'starlight-ward',true);try{let sawHud=false;for(let i=0;i<7200;i++){const labels=h.step();assert.ok(!labels.includes('WARD FALLEN'));sawHud||=labels.some(s=>s.startsWith('SHADOWS '))}assert.ok(sawHud);h.game.restart();assert.ok(h.step().includes('SEALED 0 SCORE 0'));}finally{h.close();}});
test('Starlight Ward preview continues through repeated shadow attacks',()=>{const h=harness(createFeatureGame28,'starlight-ward',false);try{let sawHud=false;for(let i=0;i<7200;i++){const labels=h.step();assert.ok(!labels.includes('WARD FALLEN'));sawHud||=labels.some(s=>s.startsWith('SHADOWS '))}assert.ok(sawHud);}finally{h.close();}});
test('Lantern Lift continues rescue work at minimum integrity',()=>{const h=harness(createFeatureGame26,'lantern-lift',true);let atMinimum=null,later=0,min=5;try{h.key('ArrowUp',true);h.press(' ');h.key('ArrowUp',false);for(let i=0;i<16;i++)h.step();h.key('ArrowDown',true);h.press(' ');h.key('ArrowDown',false);for(let i=0;i<54000;i++){const labels=h.step();for(const label of labels){const m=/^(?:SCORE \d+  )?RESCUED (\d+)  LIGHTS \d\/4  HULL (\d+)$/.exec(label);if(m){const delivered=Number(m[1]),integrity=Number(m[2]);min=Math.min(min,integrity);if(integrity===1&&atMinimum===null)atMinimum=delivered;if(atMinimum!==null)later=Math.max(later,delivered);}}}assert.equal(min,1,'did not exercise severe wind damage');assert.ok(later>atMinimum,`rescues stopped at ${atMinimum}`);}finally{h.close();}});

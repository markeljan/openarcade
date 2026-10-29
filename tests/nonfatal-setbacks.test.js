import test from 'node:test';
import assert from 'node:assert/strict';
import {createFeatureGame9} from '../src/feature-games9.js';
import {createFeatureGame20} from '../src/feature-games20.js';
function simulate(make,id,interactive){
 const oldRandom=Math.random;let seed=1,scheduled,idSeq=0,labels=[],distance=0,delivered=0,misses=0,bust=false,drop=false,afterBustProgress=false,completed=false,completedResets=0;
 Math.random=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/0x100000000);const noop=()=>{};
 globalThis.window={devicePixelRatio:1};globalThis.ResizeObserver=class{observe(){}disconnect(){}};globalThis.requestAnimationFrame=fn=>(scheduled=fn,++idSeq);globalThis.cancelAnimationFrame=()=>{scheduled=null};
 const ctx=new Proxy({fillText(s){labels.push(s)}},{get:(o,k)=>k in o?o[k]:noop,set:(o,k,v)=>(o[k]=v,true)}),canvas={getContext:()=>ctx,getBoundingClientRect:()=>({width:320,height:720}),setAttribute:noop,addEventListener:noop,removeEventListener:noop},game=make(canvas,id,{interactive,...(id==='midnight-pursuit'?{pursuitInitial:{damage:99,cops:[{x:120,y:410,kind:'cruiser',disabled:0}]}}:{})});
 try{for(let frame=1;frame<=9000;frame++){labels=[];scheduled(frame*1000/60);let m=labels.find(s=>/^DIST \d+m$/.test(s)),d=labels.find(s=>/^DELIVERED \d+(?:\s+SCORE \d+)?$/.test(s)),z=labels.find(s=>/^MISSES \d+$/.test(s));if(m){const n=Number(m.match(/\d+/)[0]);if(n<distance)drop=true;if(bust&&n>distance)afterBustProgress=true;distance=n;}if(d){const n=Number(d.match(/\d+/)[0]);if(n<delivered){if(!interactive&&delivered>=8&&completed)completedResets++;else drop=true;completed=false;}delivered=n;}if(z)misses=Number(z.match(/\d+/)[0]);if(labels.includes('JAMMER BURN · MOVE!'))bust=true;if(id==='railway-rush'&&game.getSessionState?.()==='result'){assert.ok(delivered>=8,'setback ended a shift before eight deliveries');completed=true;}}return{distance,delivered,misses,bust,drop,afterBustProgress,completedResets};}finally{game.destroy();Math.random=oldRandom;}
}
for(const interactive of [true,false]){
 test(`Midnight Pursuit ${interactive?'manual':'preview'} continues after a bust`,()=>{const r=simulate(createFeatureGame9,'midnight-pursuit',interactive);assert.ok(r.bust,'seeded run never incurred a bust');assert.equal(r.drop,false,'distance reset');assert.ok(r.afterBustProgress,'run did not progress after bust');});
 test(`Railway Rush ${interactive?'manual':'preview'} continues through setbacks and resets only a completed preview`,()=>{const r=simulate(createFeatureGame20,'railway-rush',interactive);assert.equal(r.drop,false,'deliveries reset');assert.ok(r.delivered>3||r.completedResets>0,'shift did not deliver trains');if(!interactive)assert.ok(r.completedResets>0,'preview did not restart after eight deliveries');if(interactive)assert.ok(r.misses>=3,'did not exercise repeated wrong depots');});
}

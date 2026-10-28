import test from 'node:test';
import assert from 'node:assert/strict';
import {createFeatureGame9} from '../src/feature-games9.js';

function simulate(make,id,interactive,seed,terminal,{frames=5400,step=1000/60}={}){
  const isTerminal=labels=>[].concat(terminal).some(label=>labels.includes(label));
  const oldRandom=Math.random;let scheduled,idSeq=0,labels=[],endedAt=0,resumed=false,endFrames=0;
  Math.random=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/0x100000000);
  const noop=()=>{};globalThis.window={devicePixelRatio:1};globalThis.ResizeObserver=class{observe(){} disconnect(){}};
  globalThis.requestAnimationFrame=fn=>(scheduled=fn,++idSeq);globalThis.cancelAnimationFrame=()=>{scheduled=null};
  const context=new Proxy({fillText(s){labels.push(s)}},{get:(o,k)=>k in o?o[k]:noop,set:(o,k,v)=>(o[k]=v,true)});
  const canvas={getContext:()=>context,getBoundingClientRect:()=>({width:320,height:720}),setAttribute:noop,addEventListener:noop,removeEventListener:noop};
  const game=make(canvas,id,{interactive});
  try{
    for(let frame=1;frame<=frames;frame++){labels=[];scheduled(frame*step);if(isTerminal(labels)){endFrames++;if(!endedAt)endedAt=frame;}else if(endedAt&&labels.length)resumed=true;}
    let restarted=false;if(interactive&&endedAt){game.restart();labels=[];scheduled((frames+1)*step);restarted=!isTerminal(labels);}
    return {endedAt,resumed,endFrames,restarted};
  }finally{game.destroy();Math.random=oldRandom;}
}
// Star Salvage rescues a wrecked tug; the run ends at the shift deadline.
test('Cosmic Haul manual quota result stays visible until restart',()=>{
  const result=simulate(createFeatureGame9,'cosmic-haul',true,28,'QUOTA MISSED',{frames:18300,step:50});
  assert.ok(result.endedAt,'manual shift never reached its deadline');
  assert.ok(result.endFrames>50,'quota result did not persist');
  assert.equal(result.resumed,false,'manual shift reset without a restart');
  assert.ok(result.restarted,'restart did not begin a fresh shift');
});
test('Cosmic Haul autoplay starts a new shift after the quota result',()=>{
  const result=simulate(createFeatureGame9,'cosmic-haul',false,1,['QUOTA MISSED','STAR ARK LAUNCHED'],{frames:18300,step:50});
  assert.ok(result.endedAt,'preview shift never reached its deadline');
  assert.ok(result.resumed,'preview did not start a new shift');
});




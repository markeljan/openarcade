import test from 'node:test';
import assert from 'node:assert/strict';
import {createFeatureGame17} from '../src/feature-games17.js';
import {createFeatureGame6} from '../src/feature-games6.js';

function simulate(make,id,interactive,isTerminal,seconds=240){
  const previousRandom=Math.random;let seed=7,scheduled,nextId=0,labels=[],endedAt=0,resumed=false,terminalFrames=0;
  Math.random=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/0x100000000);
  const noop=()=>{};globalThis.window={devicePixelRatio:1};globalThis.ResizeObserver=class{observe(){} disconnect(){}};
  globalThis.requestAnimationFrame=fn=>(scheduled=fn,++nextId);globalThis.cancelAnimationFrame=()=>{scheduled=null};
  const context=new Proxy({fillText(text){labels.push(text)}},{get:(o,k)=>k in o?o[k]:noop,set:(o,k,v)=>(o[k]=v,true)});
  const canvas={getContext:()=>context,getBoundingClientRect:()=>({width:320,height:720}),setAttribute:noop,addEventListener:noop,removeEventListener:noop};
  const game=make(canvas,id,{interactive});
  try {for(let frame=1;frame<=seconds*60;frame++){labels=[];scheduled(frame*1000/60);if(labels.some(isTerminal)){terminalFrames++;if(!endedAt)endedAt=frame;}else if(endedAt&&labels.length)resumed=true;}let restarted=false;if(interactive&&endedAt){game.restart();labels=[];scheduled((seconds*60+1)*1000/60);restarted=!labels.some(isTerminal);}return {endedAt,resumed,terminalFrames,restarted};}
  finally {game.destroy();Math.random=previousRandom;}
}
for(const [name,make,id,manualTerminal,autoTerminal] of [
  ['Ashen Rage',createFeatureGame17,'ashen-rage',s=>s.includes('RACE FINISHED'),s=>s.includes('RACE FINISHED')],
  ['Star Roller',createFeatureGame17,'star-roller',s=>s.includes('TIME UP')||s.includes('STAR FORMED'),s=>s.includes('TIME UP')||s.includes('STAR FORMED')],
  ['Scrap Arena',createFeatureGame6,'scrap-arena',s=>s==='ENTER TO PLAY AGAIN',s=>s==='NEXT ROUND...'],
]){
  test(`${name} manual result remains until restart`,()=>{const r=simulate(make,id,true,manualTerminal,name==='Star Roller'?360:240);assert.ok(r.endedAt,'run never reached a result');assert.ok(r.terminalFrames>180,'result did not remain visible');assert.equal(r.resumed,false,'manual result restarted by itself');assert.ok(r.restarted,'restart did not start a new run');});
  test(`${name} preview resumes after a result`,()=>{const r=simulate(make,id,false,autoTerminal,name==='Star Roller'?360:240);assert.ok(r.endedAt,'preview never reached a result');assert.ok(r.resumed,'preview failed to resume');});
}

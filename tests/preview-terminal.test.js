import test from 'node:test';
import assert from 'node:assert/strict';
import {createFeatureGame5} from '../src/feature-games5.js';

function run(make, id, interactive, terminal, seconds=240, resumeOnTerminal=false) {
  let seed=0x12345678, scheduled, nextId=0, labels=[], endFrame=-1, resumed=false, terminalFrames=0;
  const originalRandom=Math.random, noop=()=>{};
  Math.random=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/0x100000000);
  globalThis.window={devicePixelRatio:1};
  globalThis.ResizeObserver=class {observe(){} disconnect(){}};
  globalThis.requestAnimationFrame=callback=>(scheduled=callback,++nextId);
  globalThis.cancelAnimationFrame=()=>{scheduled=null};
  const context=new Proxy({fillText(text){labels.push(text)}},{get:(o,k)=>k in o?o[k]:noop,set:(o,k,v)=>(o[k]=v,true)});
  const canvas={getContext:()=>context,getBoundingClientRect:()=>({width:320,height:720}),setAttribute:noop,addEventListener:noop,removeEventListener:noop};
  const game=make(canvas,id,{interactive});
  try {
    for(let frame=1;frame<=seconds*60;frame++){
      labels=[];scheduled(frame*1000/60);
      if(labels.some(s=>s.includes(terminal))){terminalFrames++;if(endFrame<0){endFrame=frame;if(resumeOnTerminal)game.setInteractive(false);}}
      else if(endFrame>=0&&labels.length)resumed=true;
    }
    return {endFrame,resumed,terminalFrames};
  } finally {game.destroy();Math.random=originalRandom;}
}
for(const [name,make,id,terminal] of [['Web Slam',createFeatureGame5,'web-slam','MATCH OVER']]){
  test(`${name} autoplay resumes after a terminal screen`,()=>{
    const result=run(make,id,true,terminal,240,true);
    assert.ok(result.endFrame>0,'expected the match to end');
    assert.ok(result.resumed,'autoplay remained on its terminal screen');
  });
  test(`${name} manual game over remains visible`,()=>{
    const result=run(make,id,true,terminal);
    assert.ok(result.endFrame>0,'expected the match to end');
    assert.equal(result.resumed,false,'manual match restarted without player action');
    assert.ok(result.terminalFrames>180,'terminal screen should persist beyond the autoplay delay');
  });
}

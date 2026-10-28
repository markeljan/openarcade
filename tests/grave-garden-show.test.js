import test from 'node:test';
import assert from 'node:assert/strict';
import {createGardenShow,garden} from '../src/feature-games8.js';

test('presentation priority, coalescing, expiry and tier timing follow the reference',()=>{
 const show=createGardenShow();show.offer('shot',1,0);assert.equal(show.step(1).active,'shot');show.offer('shot',1,1);show.offer('wave-held',2,2);assert.equal(show.step(3).active,'wave-held');show.offer('garden-apex',3,3);assert.deepEqual(show.step(4),{hold:true,every:1,admire:true,active:'garden-apex',age:0});assert.equal(show.step(10).every,3);assert.equal(show.step(34).every,1);assert.equal(show.step(45).admire,true);assert.equal(show.step(46).admire,false);show.offer('barrow-save',2,50);assert.equal(show.step(88).active,null);assert.equal(show.step(200).active,null);
});

test('seed 7 chapter admiration delays the reference moon-cap rebuild',()=>{
 const old=Math.random;let state=7;Math.random=()=>{state|=0;state=state+0x6D2B79F5|0;let v=Math.imul(state^state>>>15,1|state);v=v+Math.imul(v^v>>>7,61|v)^v;return((v^v>>>14)>>>0)/4294967296};try{const g=garden(),checks=new Map([[30000,[34,34,200,0,6,16,4,6]],[40000,[45,6,177,27,1,18,4,15]],[53999,[60,21,31,177,2,25,7,18]]]);for(let frame=1;frame<=53999;frame++){g.update(1/60,true);const s=frame===21605||frame===21630||frame===21639||checks.has(frame)?g.snapshot():null;if(frame===21605)assert.equal(s.gardener.task,null);if(frame===21630){assert.equal(s.gardener.task.type,'moon');assert.equal(s.gardener.task.lane,2);assert.equal(s.gardener.task.col,2)}if(frame===21639)assert.ok(!s.plants.some(p=>p.lane===2&&p.col===2));if(checks.has(frame))assert.deepEqual([s.wave,s.sun,s.greenhouse,s.breaches,s.plants.length,s.zombies.length,s.skill.lapses,s.transplants],checks.get(frame))}}finally{Math.random=old}
});

test('real presentation clock holds and slows both manual and AI garden updates',()=>{
 for(const auto of [false,true]){const old=Math.random;let state=7;Math.random=()=>{state|=0;state=state+0x6D2B79F5|0;let v=Math.imul(state^state>>>15,1|state);v=v+Math.imul(v^v>>>7,61|v)^v;return((v^v>>>14)>>>0)/4294967296};try{const g=garden(()=>{},{},true);let steps=0;while(g.snapshot().wave<7&&steps++<7000)g.update(1/60,auto);assert.ok(steps<7000);for(let i=0;i<6;i++)g.update(1/60,auto);assert.equal(g.snapshot().waveTime,0);for(let i=0;i<24;i++)g.update(1/60,auto);assert.ok(Math.abs(g.snapshot().waveTime-8/60)<1e-9);g.update(1/60,auto);assert.ok(Math.abs(g.snapshot().waveTime-9/60)<1e-9)}finally{Math.random=old}}
});

test('seed 7 separate presentation clock reaches the reference frame at the reference show time',()=>{
 const old=Math.random;let state=7;Math.random=()=>{state|=0;state=state+0x6D2B79F5|0;let v=Math.imul(state^state>>>15,1|state);v=v+Math.imul(v^v>>>7,61|v)^v;return((v^v>>>14)>>>0)/4294967296};try{const g=garden(()=>{},{},true);for(let i=0;i<30110;i++)g.update(1/60,true);const s=g.snapshot();assert.equal((s.wave-1)*900+Math.round(s.waveTime*60),30000);assert.deepEqual([s.sun,s.greenhouse,s.breaches,s.plants.length,s.zombies.length,s.transplants],[34,200,0,6,16,6])}finally{Math.random=old}
});

test('seed 8 presentation and garden clocks stay aligned through late AI defense',()=>{
 const old=Math.random;let state=8;Math.random=()=>{state|=0;state=state+0x6D2B79F5|0;let v=Math.imul(state^state>>>15,1|state);v=v+Math.imul(v^v>>>7,61|v)^v;return((v^v>>>14)>>>0)/4294967296};try{const g=garden(()=>{},{},true),checks=new Map([[20066,[20000,124,200,0,12,9,2,0]],[30110,[30000,34,197,4,3,14,2,13]],[54197,[53999,25,0,240,1,20,5,28]]]);for(let show=1;show<=54197;show++){g.update(1/60,true);if(checks.has(show)){const s=g.snapshot();assert.deepEqual([(s.wave-1)*900+Math.round(s.waveTime*60),s.sun,s.greenhouse,s.breaches,s.plants.length,s.zombies.length,s.skill.lapses,s.transplants],checks.get(show))}}}finally{Math.random=old}
});

test('player and preview wrappers visibly hold the garden during a chapter cue',async t=>{
 const {createFeatureGame8}=await import('../src/feature-games8.js');const names=['window','ResizeObserver','requestAnimationFrame','cancelAnimationFrame'],saved=Object.fromEntries(names.map(k=>[k,globalThis[k]])),old=Math.random;t.after(()=>{Object.assign(globalThis,saved);Math.random=old});let state=7;Math.random=()=>{state|=0;state=state+0x6D2B79F5|0;let v=Math.imul(state^state>>>15,1|state);v=v+Math.imul(v^v>>>7,61|v)^v;return((v^v>>>14)>>>0)/4294967296};let scheduled,commands=[];const noop=()=>{};globalThis.window={devicePixelRatio:1};globalThis.ResizeObserver=class{observe(){}disconnect(){}};globalThis.requestAnimationFrame=fn=>(scheduled=fn,1);globalThis.cancelAnimationFrame=noop;const ctx=new Proxy({},{get:(_,k)=>(...args)=>commands.push([k,...args]),set:(_,k,v)=>(commands.push([k,v]),true)}),canvas={getContext:()=>ctx,getBoundingClientRect:()=>({width:320,height:720}),setAttribute:noop,addEventListener:noop,removeEventListener:noop};for(const interactive of [true,false]){state=7;const game=createFeatureGame8(canvas,'grave-garden',{interactive});let frame=0;for(;frame<7000;frame++){commands=[];scheduled((frame+1)*1000/60);if(commands.some(c=>c[0]==='fillText'&&c[1]==='WAVE 07/60'))break}assert.ok(frame<7000);const stable=ops=>JSON.stringify(ops.filter(op=>!['globalAlpha','moveTo','lineTo'].includes(op[0])));const held=stable(commands);let renders=0;for(let i=0;i<(interactive?6:4);i++){commands=[];scheduled((++frame+1)*1000/60);if(commands.length){renders++;assert.equal(stable(commands),held)}}assert.ok(renders>0);game.destroy()}
});

test('active manual planting preserves reference elapsed presentation time',()=>{
 const old=Math.random;let state=1;Math.random=()=>{state|=0;state=state+0x6D2B79F5|0;let v=Math.imul(state^state>>>15,1|state);v=v+Math.imul(v^v>>>7,61|v)^v;return((v^v>>>14)>>>0)/4294967296};try{const g=garden(()=>{},{},true),actions=new Map([[1,'ArrowDown'],[2,'ArrowRight'],[3,' '],[184,'ArrowDown'],[185,'ArrowRight'],[186,'x'],[367,'ArrowUp'],[368,'ArrowUp'],[369,'z']]),checks=new Map([[20066,[20000,300,180,22,4,13]],[30110,[30000,300,115,91,0,16]],[54197,[53999,300,0,362,0,25]]]);let frame=0;for(let show=1;show<=54197;show++){const k=actions.get(frame+1);if(k){g.input(k,true);g.input(k,false);actions.delete(frame+1)}g.update(1/60,false);if(checks.has(show)||actions.size){const s=g.snapshot();frame=(s.wave-1)*900+Math.round(s.waveTime*60);if(checks.has(show))assert.deepEqual([frame,s.sun,s.greenhouse,s.breaches,s.plants.length,s.zombies.length],checks.get(show))}}}finally{Math.random=old}
});

test('manual taps wait through the chapter hold, coalesce and follow reference priority',()=>{
 const g=garden(()=>{},{},true);for(let i=0;i<7000&&g.snapshot().wave<7;i++)g.update(1/60,false);assert.equal(g.snapshot().wave,7);g.input('ArrowDown',true);g.input('s',true);g.input('s',false);g.input('ArrowDown',true);g.input('ArrowDown',false);g.input('ArrowRight',true);g.input('ArrowRight',false);g.input(' ',true);g.input(' ',false);g.input('x',true);g.input('x',false);assert.deepEqual(g.snapshot().bed,{lane:0,col:0});for(let i=0;i<6;i++)g.update(1/60,false);assert.deepEqual(g.snapshot().bed,{lane:0,col:0});for(let i=0;i<3&&g.snapshot().bed.lane===0;i++)g.update(1/60,false);const s=g.snapshot();assert.deepEqual(s.bed,{lane:1,col:1});assert.equal(s.gardener.task.type,'pea');
});

test('queued taps survive AI ticks and are consumed on manual takeover',()=>{
 const g=garden(()=>{},{},true);g.input('ArrowDown',true);g.input('ArrowDown',false);g.input('ArrowDown',true);g.input('ArrowDown',false);g.update(1/60,true);const before=g.snapshot().bed.lane;g.update(1/60,false);assert.equal(g.snapshot().bed.lane,Math.min(3,before+1));g.update(1/60,false);assert.equal(g.snapshot().bed.lane,Math.min(3,before+1));
});

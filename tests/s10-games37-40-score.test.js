import test from 'node:test';
import assert from 'node:assert/strict';
import {phase,createHearthGame,createFeatureGame37} from '../src/feature-games37.js';
import {gloam,createReefGame} from '../src/feature-games38.js';
import {duel,createRoadsGame} from '../src/feature-games39.js';
import {stamp,createWashWonder} from '../src/feature-games40.js';

for(const [name,make,limit] of [['phase',phase,20000],['hearth',createHearthGame,20000],['gloam',gloam,60000],['reef',createReefGame,60000],['neon',duel,30000],['street',createRoadsGame,30000],['stamp',stamp,50000],['wash',createWashWonder,60000]]){
 test(`${name} reports its actual AI terminal once before reset`,()=>{let result;let calls=0;const game=make(()=>{},r=>{result=r;calls++});for(let i=0;i<limit&&!result;i++)game.update(1/60,true);assert.ok(result,`${name} did not reach terminal`);assert.ok(Number.isFinite(result.score));assert.ok(result.result);assert.equal(calls,1)});
}

test('wrapper binds preview and takeover runs, pauses and reports result once',t=>{
 const names=['window','ResizeObserver','requestAnimationFrame','cancelAnimationFrame'];const old=Object.fromEntries(names.map(k=>[k,globalThis[k]]));t.after(()=>Object.assign(globalThis,old));
 globalThis.window={devicePixelRatio:1};globalThis.ResizeObserver=class{observe(){}disconnect(){}};let frame;globalThis.requestAnimationFrame=f=>(frame=f,1);globalThis.cancelAnimationFrame=()=>{};
 const noop=()=>{},handlers=new Map(),ctx=new Proxy({},{get:()=>noop,set:()=>true}),canvas={getContext:()=>ctx,getBoundingClientRect:()=>({width:320,height:720}),setAttribute:noop,addEventListener:(k,f)=>handlers.set(k,f),removeEventListener:k=>handlers.delete(k)};
 const records=[],game=createFeatureGame37(canvas,'phase-foundry',{interactive:false,onResult:r=>records.push(r)});let now=0;const tick=()=>frame(now+=1000/30);
 for(let i=0;i<20000&&!records.length;i++)tick();assert.equal(records.length,1);assert.equal(records[0].actor,'ai');assert.equal(records[0].context,'gallery-preview');assert.equal(records[0].submissionEligible,false);assert.equal(game.getSessionState(),'result');game.beginRun({interactive:true,context:'manual-player'});assert.equal(game.getSessionState(),'playing');game.pause();game.resume();game.beginRun({interactive:false,context:'watch-player'});for(let i=0;i<20000&&records.length<2;i++)tick();assert.equal(records.length,2);assert.equal(records[1].context,'watch-player');assert.equal(records[1].submissionEligible,true);assert.notEqual(records[0].runId,records[1].runId);game.destroy();assert.equal(handlers.size,0);
});
import {readFile} from 'node:fs/promises';
const fixtures=[
 ['phase',37,'phase','return {input,update(dt,auto){','return {input,update(dt,auto){stage=2;relay=true;p.x=281;p.y=390;p.vy=0;p.ground=true;cube.x=260;cube.y=390;cube.ground=true;gateLift=48;'],
 ['hearth',37,'createHearthGame','return {input(k,d){keys[k]=d},update(dt,auto){if(ended','return {input(k,d){keys[k]=d},update(dt,auto){people.forEach(p=>p.hp=0);if(ended'],
 ['gloam',38,'gloam',"return{input,update(dt,auto){phase+=dt;","return{input,update(dt,auto){stage=3;tackle=light=3;boat.x=160;boat.y=595;boat.vx=boat.vy=0;cool=0;keys[' ']=true;phase+=dt;"],
 ['reef',38,'createReefGame',"return{input,update(dt,auto){const workingAtStart", "return{input,update(dt,auto){phase='service';tier=3;roundServed=3;diners=[{state:'happy',wants:3,dishId:'d'}];dishes=[{id:'d',fishId:'f'}];serving=null;work=null;const workingAtStart"],
 ['neon',39,'duel','return {input,update(dt,auto){','return {input,update(dt,auto){complete=\'boarding\';phaseTime=0;bullets=[];'],
 ['street',39,'createRoadsGame','function update(dt,auto){if(complete)', 'function update(dt,auto){elapsed=11646/60;if(complete)'],
 ['stamp',40,'stamp','update(dt,auto){accumulator+=dt;','update(dt,auto){phase=\'sailing\';ferryTravel=162;accumulator+=dt;'],
 ['wash',40,'createWashWonder','function update(dt,auto){accumulator+=','function update(dt,auto){phase=\'ribbon\';job=2;player={...gate};keys[\' \']=true;accumulator+=']
];
for(const [name,n,exportName,anchor,replacement] of fixtures)test(`${name} reports a manual terminal at its real transition`,async()=>{let source=await readFile(new URL(`../src/feature-games${n}.js`,import.meta.url),'utf8');source=source.replace("'./scores/run.js'",JSON.stringify(new URL('../src/scores/run.js',import.meta.url).href)).replace("'./audio.js'",JSON.stringify(new URL('../src/audio.js',import.meta.url).href));assert.ok(source.includes(anchor));source=source.replace(anchor,replacement);const mod=await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));let result;const game=mod[exportName](()=>{},r=>result=r);game.update(1/30,false);assert.ok(result,`${name} manual transition did not report`);assert.ok(Number.isFinite(result.score));});
test('synchronous result callback can start a new run',t=>{
 const names=['window','ResizeObserver','requestAnimationFrame','cancelAnimationFrame'],old=Object.fromEntries(names.map(k=>[k,globalThis[k]]));t.after(()=>Object.assign(globalThis,old));globalThis.window={devicePixelRatio:1};globalThis.ResizeObserver=class{observe(){}disconnect(){}};let frame;globalThis.requestAnimationFrame=f=>(frame=f,1);globalThis.cancelAnimationFrame=()=>{};const noop=()=>{},ctx=new Proxy({},{get:()=>noop,set:()=>true}),canvas={getContext:()=>ctx,getBoundingClientRect:()=>({width:320,height:720}),setAttribute:noop,addEventListener:noop,removeEventListener:noop};let game,count=0,now=0;game=createFeatureGame37(canvas,'phase-foundry',{onResult(){count++;game.beginRun({interactive:true,context:'manual-player'})}});for(let i=0;i<20000&&!count;i++)frame(now+=1000/30);assert.equal(count,1);assert.equal(game.getSessionState(),'playing');game.destroy();
});

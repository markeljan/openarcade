import test from 'node:test';
import assert from 'node:assert/strict';

test('Rooftop Post player audio follows enabled and pause lifecycle',async t=>{
 const saved=Object.fromEntries(['window','localStorage','ResizeObserver','requestAnimationFrame','cancelAnimationFrame'].map(k=>[k,globalThis[k]]));t.after(()=>Object.assign(globalThis,saved));
 let played=0,closed=0; class Context{constructor(){this.state='running';this.currentTime=0;this.destination={}}createOscillator(){return{frequency:{setValueAtTime(){}},connect(){},start(){played++},stop(){}}}createGain(){return{gain:{setValueAtTime(){},exponentialRampToValueAtTime(){}},connect(){}}}close(){this.state='closed';closed++;return Promise.resolve()}}
 globalThis.window={devicePixelRatio:1,AudioContext:Context};globalThis.localStorage={getItem:k=>k==='miniarcade-sound'?'on':null,setItem(){}};globalThis.ResizeObserver=class{observe(){}disconnect(){}};globalThis.requestAnimationFrame=()=>1;globalThis.cancelAnimationFrame=()=>{};
 const {createFeatureGame28}=await import('../src/feature-games28.js');
 const noop=()=>{},ctx=new Proxy({},{get:()=>noop,set:()=>true}),handlers=new Map(),canvas={getContext:()=>ctx,getBoundingClientRect:()=>({width:240,height:540}),setAttribute:noop,addEventListener:(k,f)=>handlers.set(k,f),removeEventListener:k=>handlers.delete(k)};
 const player=createFeatureGame28(canvas,'rooftop-post',{interactive:true,audioEnabled:true});
 const key=(key,trusted=true)=>handlers.get('keydown')({key,isTrusted:trusted,repeat:false,preventDefault:noop});key('ArrowLeft',false);assert.equal(played,0);key('x');assert.ok(played>0);player.pause();assert.equal(closed,1);player.resume();player.destroy();assert.equal(closed,2);
 const preview=createFeatureGame28(canvas,'rooftop-post',{interactive:true,audioEnabled:false});const count=played;key('x');assert.equal(played,count);preview.destroy();
});


test('Rooftop Post emits cues only on meaningful manual and AI transitions',async()=>{
 const {mail}=await import('../src/feature-games28.js');
 const events=[],g=mail(e=>events.push(e));
 g.input('x',true); g.input('x',false);
 assert.deepEqual(events,['pickup']);
 g.input(' ',true); g.input(' ',false);
 assert.deepEqual(events,['pickup','dodge']);
 g.input(' ',true); g.input(' ',false);
 assert.equal(events.filter(e=>e==='dodge').length,1);
 const aiEvents=[],ai=mail(e=>aiEvents.push(e));
 for(let i=0;i<12000 && !aiEvents.includes('fired');i++)ai.update(1/60,true);
 assert.ok(aiEvents.includes('pickup')); assert.ok(aiEvents.includes('shape')); assert.ok(aiEvents.includes('fired'));
});


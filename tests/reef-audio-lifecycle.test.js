import test from 'node:test';
import assert from 'node:assert/strict';
test('Reef first play and restart retain the opt-in audio sink',async t=>{
 const names=['window','localStorage','ResizeObserver','requestAnimationFrame','cancelAnimationFrame'],old=Object.fromEntries(names.map(k=>[k,globalThis[k]]));t.after(()=>Object.assign(globalThis,old));let played=0,closed=0,scheduled;
 class Context{constructor(){this.state='running';this.currentTime=0;this.destination={}}createOscillator(){return{frequency:{setValueAtTime(){}},connect(){},start(){played++},stop(){}}}createGain(){return{gain:{setValueAtTime(){},exponentialRampToValueAtTime(){}},connect(){}}}close(){closed++;this.state='closed';return Promise.resolve()}}
 globalThis.window={devicePixelRatio:1,AudioContext:Context};globalThis.localStorage={getItem:k=>k==='miniarcade-sound'?'on':null,setItem(){}};globalThis.ResizeObserver=class{observe(){}disconnect(){}};globalThis.requestAnimationFrame=f=>(scheduled=f,1);globalThis.cancelAnimationFrame=()=>{};
 const {createFeatureGame38}=await import('../src/feature-games38.js?reef-audio-life');const noop=()=>{},handlers=new Map(),ctx=new Proxy({},{get:()=>noop,set:()=>true});const canvas={getContext:()=>ctx,getBoundingClientRect:()=>({width:320,height:720}),setAttribute:noop,addEventListener:(k,v)=>handlers.set(k,v),removeEventListener:k=>handlers.delete(k)};
 const game=createFeatureGame38(canvas,'reef-to-rice',{interactive:false,audioEnabled:true});const press=k=>{handlers.get('keydown')({key:k,isTrusted:true,preventDefault:noop});handlers.get('keyup')({key:k,isTrusted:true,preventDefault:noop})};
 game.restart();game.setInteractive(true);press(' ');assert.equal(played,1,'first Play must emit a shot');
 game.restart();press(' ');assert.equal(played,2,'restart must keep the sink');game.pause();assert.equal(closed,1);game.resume();game.restart();press(' ');assert.equal(played,3,'resume unlocks the session');game.destroy();assert.equal(closed,2);assert.equal(handlers.size,0);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import { createCanvasGame } from '../src/custom/canvas-game.js';

function harness(options={}) {
  const callbacks=new Map(), listeners=new Map(), events=[], updates=[];
  let nextId=0, creations=0, draws=0, disposals=0, disconnected=false;
  globalThis.window={devicePixelRatio:1};
  globalThis.ResizeObserver=class { observe(){} disconnect(){disconnected=true} };
  globalThis.requestAnimationFrame=fn=>{const id=++nextId;callbacks.set(id,fn);return id};
  globalThis.cancelAnimationFrame=id=>callbacks.delete(id);
  const ctx={setTransform(){},fillRect(){}};
  const canvas={width:0,height:0,tabIndex:0,getContext:()=>ctx,getBoundingClientRect:()=>({left:10,top:20,width:400,height:720}),setAttribute(){},focus(){},addEventListener:(name,fn)=>listeners.set(name,fn),removeEventListener:(name,fn)=>{if(listeners.get(name)===fn)listeners.delete(name)}};
  const game=createCanvasGame(canvas,{id:'fixture',name:'Fixture'},()=>{creations++;return {input:(key,down)=>events.push([key,down]),pointer:(x,y)=>events.push(['pointer',x,y]),update:(dt,auto)=>updates.push([dt,auto]),draw:()=>draws++,destroy:()=>disposals++}},options);
  return {game,canvas,listeners,callbacks,events,updates,get creations(){return creations},get draws(){return draws},get disposals(){return disposals},get disconnected(){return disconnected},tick(time){const next=[...callbacks.values()];callbacks.clear();for(const fn of next)fn(time)}};
}
function key(name,extra={}) { let prevented=false;return {key:name,preventDefault(){prevented=true},get prevented(){return prevented},...extra}; }

test('custom runtime renders a paused still and schedules only while active',()=>{
  const h=harness({paused:true});
  assert.equal(h.draws,1);assert.equal(h.callbacks.size,0);
  h.game.resize();assert.equal(h.draws,2);
  h.game.resume();h.tick(100);h.tick(134);
  assert.equal(h.updates.length,2);assert.equal(h.updates[1][1],true);
  h.game.pause();assert.equal(h.callbacks.size,0);
  const previousDraws=h.draws;h.game.restart();assert.equal(h.creations,2);assert.equal(h.disposals,1);assert.equal(h.draws,previousDraws+1);
  h.game.destroy();assert.equal(h.disposals,2);h.game.destroy();assert.equal(h.disposals,2);assert.equal(h.listeners.size,0);assert.equal(h.disconnected,true);
});

test('custom games receive printable keys while shortcuts and navigation stay available',()=>{
  const h=harness({interactive:true,paused:true});
  const b=key('B');h.listeners.get('keydown')(b);assert.equal(b.prevented,true);
  const modifiedRelease=key('B',{ctrlKey:true});h.listeners.get('keyup')(modifiedRelease);
  assert.deepEqual(h.events,[['b',true],['b',false]]);
  const shortcut=key('x',{ctrlKey:true});h.listeners.get('keydown')(shortcut);assert.equal(shortcut.prevented,false);
  const tab=key('Tab');h.listeners.get('keydown')(tab);assert.equal(tab.prevented,false);
  h.listeners.get('keydown')(key('q'));h.listeners.get('blur')();
  assert.deepEqual(h.events.slice(-2),[['q',true],['q',false]]);
  h.game.destroy();
});

test('pointer coordinates account for letterboxing and ignore taps in the margins',()=>{
  const h=harness({interactive:true,paused:true});
  h.listeners.get('pointerdown')({clientX:50,clientY:380});
  assert.deepEqual(h.events,[['pointer',0,360]]);
  h.listeners.get('pointerdown')({clientX:20,clientY:380});
  assert.equal(h.events.length,1);
  h.game.destroy();
});

test('declared touch action keys reach games and release on pause',()=>{
 const h=harness({interactive:true,paused:false});
 for(const name of [' ','b','Enter'])h.listeners.get('keydown')(key(name));
 h.game.pause();
 assert.deepEqual(h.events,[[' ',true],['b',true],['Enter',true],[' ',false],['b',false],['Enter',false]]);
 assert.equal(h.callbacks.size,0);h.game.destroy();
});

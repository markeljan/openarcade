import test from 'node:test';
import assert from 'node:assert/strict';
import {createGame, factories} from '../src/games.js';

function harness(t, factory, options) {
  const names=['window','ResizeObserver','requestAnimationFrame','cancelAnimationFrame','localStorage'];
  const previous=Object.fromEntries(names.map(name=>[name,globalThis[name]]));
  const original=factories.snake;
  t.after(()=>{Object.assign(globalThis,previous);factories.snake=original;});
  const frames=new Map(), listeners=new Map(), data=new Map(); let sequence=0;
  const noop=()=>{};
  globalThis.window={devicePixelRatio:1};
  globalThis.localStorage={getItem:key=>data.get(key),setItem:(key,value)=>data.set(key,value)};
  globalThis.ResizeObserver=class{observe(){}disconnect(){}};
  globalThis.requestAnimationFrame=callback=>(frames.set(++sequence,callback),sequence);
  globalThis.cancelAnimationFrame=id=>frames.delete(id);
  factories.snake=factory;
  const ctx=new Proxy({}, {get:()=>noop,set:()=>true});
  const canvas={getContext:()=>ctx,getBoundingClientRect:()=>({left:0,top:0,width:320,height:240}),setAttribute:noop,focus:noop,addEventListener:(name,fn)=>listeners.set(name,fn),removeEventListener:name=>listeners.delete(name)};
  const player=createGame(canvas,'snake',options);
  return {player,data,frames,listeners,step(){const callbacks=[...frames.values()];frames.clear();callbacks.forEach(fn=>fn(17));}};
}

for(const action of ['restart','destroy'])test(`accepted human best survives synchronous callback ${action}`,t=>{
  let h;
  h=harness(t,end=>({input(){},draw(){},update(){end('GAME OVER',5);}}),{interactive:true,onResult(record){
    assert.equal(record.score,5);
    assert.equal(h.data.get('tiny-arcade.best.snake'),'5','best persisted before external callback');
    h.player[action]();
  }});
  h.step();
  assert.equal(h.data.get('tiny-arcade.best.snake'),'5');
  h.player.destroy();
  assert.equal(h.frames.size,0);
});

test('pause releases held input and suppresses new keyboard and pointer actions',t=>{
  const events=[];
  const h=harness(t,()=>({draw(){},update(){},input:(key,down)=>events.push(['key',key,down]),pointer:()=>events.push(['pointer']),pointerMove:()=>events.push(['move'])}),{interactive:true});
  const key={key:'ArrowRight',preventDefault(){}};
  h.listeners.get('keydown')(key);
  h.player.pause();
  assert.ok(events.some(event=>event[0]==='key'&&event[1]==='ArrowRight'&&event[2]===false));
  events.length=0;
  h.listeners.get('keydown')(key);
  const point={clientX:160,clientY:120,pointerType:'mouse',buttons:1};
  h.listeners.get('pointerdown')(point);
  h.listeners.get('pointermove')(point);
  assert.deepEqual(events,[]);
  assert.equal(h.frames.size,0);
  h.player.resume();
  h.listeners.get('keydown')(key);
  assert.deepEqual(events,[['key','ArrowRight',true]]);
  h.player.destroy();
  assert.equal(h.frames.size,0);
});

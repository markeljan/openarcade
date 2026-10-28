import test from 'node:test';
import assert from 'node:assert/strict';
import { createFeatureGame } from '../src/feature-games.js';

for (const initialSeed of [1, 2, 3, 42, 0x12345678, 0xdeadbeef]) test(`Meat Lad autoplay climbs generated sections (seed ${initialSeed})`, () => {
  const originalRandom = Math.random;
  let seed = initialSeed;
  Math.random = () => ((seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 0x100000000);
  let scheduled, nextId = 0, maxLevel = 0;
  const noop = () => {};
  globalThis.window = {devicePixelRatio: 1};
  globalThis.ResizeObserver = class { observe() {} disconnect() {} };
  globalThis.requestAnimationFrame = callback => { scheduled = callback; return ++nextId; };
  globalThis.cancelAnimationFrame = () => { scheduled = null; };
  const context = new Proxy({fillText(text) {
    const match = /^LVL (\d+)  SCORE/.exec(text);
    if (match) maxLevel = Math.max(maxLevel, Number(match[1]));
  }}, {get: (target, key) => key in target ? target[key] : noop, set: (target, key, value) => (target[key] = value, true)});
  const canvas = {getContext: () => context, getBoundingClientRect: () => ({width: 320, height: 720}), setAttribute: noop, addEventListener: noop, removeEventListener: noop};
  const game = createFeatureGame(canvas, 'meat-lad');
  try {
    for (let frame = 1; frame <= 3600; frame++) scheduled(frame * 1000 / 60);
    assert.ok(maxLevel >= 4, `autoplay reached only level ${maxLevel}`);
  } finally {
    game.destroy();
    Math.random = originalRandom;
  }
});

test('Meat Lad manual jump responds to press and release', () => {
  function jumpHeight(hold) {
    const oldRandom=Math.random;let seed=42,scheduled,id=0,playerY=0,minY=Infinity,frame=0;
    Math.random=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/0x100000000);
    const noop=()=>{},listeners=new Map();globalThis.window={devicePixelRatio:1};globalThis.ResizeObserver=class{observe(){} disconnect(){}};
    globalThis.requestAnimationFrame=fn=>(scheduled=fn,++id);globalThis.cancelAnimationFrame=()=>{scheduled=null};
    const context=new Proxy({fillRect(x,y,w,h){if(w===18&&h===20&&this.fillStyle==='#d96761')playerY=y;}},{get:(o,k)=>k in o?o[k]:noop,set:(o,k,v)=>(o[k]=v,true)});
    const canvas={getContext:()=>context,getBoundingClientRect:()=>({width:320,height:720}),setAttribute:noop,addEventListener(k,v){listeners.set(k,v)},removeEventListener(k){listeners.delete(k)}};
    const game=createFeatureGame(canvas,'meat-lad',{interactive:true}),step=()=>scheduled(++frame*1000/60),event={key:' ',preventDefault:noop};
    try{for(let i=0;i<45;i++)step();const base=playerY;listeners.get('keydown')(event);if(!hold){for(let i=0;i<3;i++)step();listeners.get('keyup')(event);}for(let i=0;i<45;i++){step();minY=Math.min(minY,playerY);}return base-minY;}
    finally{game.destroy();Math.random=oldRandom;}
  }
  const short=jumpHeight(false),full=jumpHeight(true);
  assert.ok(short>10,'jump press did not lift the player');
  assert.ok(full>short+15,`jump release did not shorten jump: ${short} vs ${full}`);
});

test('generated spring launches autoplay through normal collision', () => {
  const oldRandom=Math.random;let seed=42,scheduled,id=0,frame=0,hero,spring,previousHero,landed=false,launched=false;
  Math.random=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/0x100000000);
  const noop=()=>{};globalThis.window={devicePixelRatio:1};globalThis.ResizeObserver=class{observe(){} disconnect(){}};
  globalThis.requestAnimationFrame=fn=>(scheduled=fn,++id);globalThis.cancelAnimationFrame=()=>{scheduled=null};
  const context=new Proxy({fillRect(x,y,w,h){if(w===18&&h===20&&this.fillStyle==='#d96761')hero={x:x+9,y:y+10};if(w===36&&h===8&&this.fillStyle==='#6bd386')spring={x:x+18,y:y+4};}},{get:(o,k)=>k in o?o[k]:noop,set:(o,k,v)=>(o[k]=v,true)});
  const canvas={getContext:()=>context,getBoundingClientRect:()=>({width:320,height:720}),setAttribute:noop,addEventListener:noop,removeEventListener:noop};
  const game=createFeatureGame(canvas,'meat-lad');
  try {for(frame=1;frame<=3600&&!launched;frame++){hero=null;spring=null;scheduled(frame*1000/60);if(hero&&spring&&previousHero){if(landed&&hero.y<previousHero.y-3)launched=true;landed=Math.abs(hero.x-spring.x)<18&&Math.abs(hero.y+10-spring.y)<2&&hero.y>=previousHero.y;previousHero=hero;}else if(hero)previousHero=hero;}
    assert.ok(launched,'autoplay never contacted and bounced from a generated spring');
  } finally {game.destroy();Math.random=oldRandom;}
});

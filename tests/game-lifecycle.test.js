import test from 'node:test';
import assert from 'node:assert/strict';
import { readdir } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
import { games, createGame } from '../src/games.js';
import { moreGames, createMoreGame } from '../src/more-games.js';
import { extraGames, createExtraGame } from '../src/extra-games.js';

const featureFiles = (await readdir(resolve('src'))).filter(file=>/^feature-games\d*\.js$/.test(file));
const featureModules = await Promise.all(featureFiles.map(file=>import(pathToFileURL(resolve('src',file)).href)));
const featureGroups = featureModules.map(module=>[
  Object.entries(module).find(([key])=>/^featureGames\d*$/.test(key))?.[1],
  Object.entries(module).find(([key])=>/^createFeatureGame\d*$/.test(key))?.[1],
]);
const groups = [[games,createGame],[moreGames,createMoreGame],[extraGames,createExtraGame],...featureGroups];
const all = groups.flatMap(([list])=>list);
test('catalog has unique IDs and control descriptions',()=>{
  assert.equal(new Set(all.map(game=>game.id)).size,all.length);
  for(const game of all){assert.ok(game.name && game.controls && game.description,game.id)}
});

test('every game renders, accepts input, and releases its resources',()=>{
  let sequence=0, scheduled=new Map();
  globalThis.window={devicePixelRatio:1};
  globalThis.ResizeObserver=class {observe(){} disconnect(){}};
  globalThis.requestAnimationFrame=callback=>{const id=++sequence;scheduled.set(id,callback);return id};
  globalThis.cancelAnimationFrame=id=>scheduled.delete(id);
  const noop=()=>{};
  const context=new Proxy({}, {get(object,key){if(key in object)return object[key];return noop},set(object,key,value){object[key]=value;return true}});
  for(const [list,make] of groups) for(const game of list){
    const listeners=new Map();
    const canvas={width:320,height:720,tabIndex:-1,getContext:()=>context,getBoundingClientRect:()=>({left:0,top:0,width:320,height:720}),setAttribute:noop,focus:noop,addEventListener(name,fn){listeners.set(name,fn)},removeEventListener(name,fn){if(listeners.get(name)===fn)listeners.delete(name)}};
    const instance=make(canvas,game.id,{interactive:false});
    for(let frame=1;frame<=1800;frame++){const pending=[...scheduled.values()];scheduled.clear();for(const callback of pending)callback(frame*16.667)}
    instance.setInteractive(true);
    for(const key of ['ArrowRight','ArrowUp',' ','x','Shift']){const event={key,preventDefault:noop};listeners.get('keydown')?.(event);listeners.get('keyup')?.(event)}
    listeners.get('pointerdown')?.({clientX:160,clientY:360,pointerType:'mouse',buttons:1});
    instance.restart();instance.pause();instance.resume();instance.destroy();
    assert.equal(scheduled.size,0,`${game.id} left a frame scheduled`);
    assert.equal(listeners.size,0,`${game.id} left input listeners attached`);
  }
});





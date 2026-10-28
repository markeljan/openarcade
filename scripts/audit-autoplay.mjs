// Sample the observable canvas output of each built-in autoplay, with a seeded
// clock and RNG. This is an investigative tool, not a proof of game correctness.
import { readdir } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
import { games, createGame } from '../src/games.js';
import { moreGames, createMoreGame } from '../src/more-games.js';
import { extraGames, createExtraGame } from '../src/extra-games.js';

const files = (await readdir(resolve('src'))).filter(file => /^feature-games\d*\.js$/.test(file));
const modules = await Promise.all(files.map(file => import(pathToFileURL(resolve('src', file)).href)));
const feature = modules.map(module => [
  Object.entries(module).find(([name]) => /^featureGames\d*$/.test(name))?.[1],
  Object.entries(module).find(([name]) => /^createFeatureGame\d*$/.test(name))?.[1],
]);
const groups = [...feature, [games, createGame], [moreGames, createMoreGame], [extraGames, createExtraGame]];
const args = process.argv.slice(2);
const seedOption = args.find(arg => arg.startsWith('--seed='));
const seedOffset = seedOption ? Number(seedOption.slice('--seed='.length)) : 0;
if (!Number.isInteger(seedOffset) || seedOffset < 0 || seedOffset > 0xffffffff) {
  throw new Error('Use --seed=<integer> between 0 and 4294967295');
}
const requested = new Set(args.filter(arg => !arg.startsWith('--seed=')));
let sequence = 0, queue = new Map();
globalThis.window = { devicePixelRatio: 1 };
globalThis.ResizeObserver = class { observe() {} disconnect() {} };
globalThis.requestAnimationFrame = callback => { const id = ++sequence; queue.set(id, callback); return id; };
globalThis.cancelAnimationFrame = id => queue.delete(id);
const originalRandom = Math.random;
const noop = () => {};
for (const [list, make] of groups) for (const item of list) {
  if (requested.size && !requested.has(item.id)) continue;
  let seed = ([...item.id].reduce((value, char) => (Math.imul(value, 31) + char.charCodeAt(0)) >>> 0, 0x12345678) ^ seedOffset) >>> 0;
  Math.random = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 0x100000000; };
  let texts = [], signature = 2166136261;
  function hash(value) { const str=String(value); for(let i=0;i<str.length;i++) signature=Math.imul(signature ^ str.charCodeAt(i), 16777619) >>> 0; }
  const context = new Proxy({}, { get(object, key) {
    if (key in object) return object[key];
    if (key === 'fillText' || key === 'strokeText') return (text, ...rest) => { texts.push(String(text)); hash(key); hash(text); rest.forEach(hash); };
    if (['fillRect','strokeRect','arc','moveTo','lineTo','translate','rotate'].includes(key)) return (...args) => { hash(key); args.forEach(value => hash(typeof value === 'number' ? Math.round(value * 10) / 10 : value)); };
    return noop;
  }, set(object, key, value) { object[key]=value; return true; } });
  const listeners = new Map();
  const canvas = { width:320,height:720,tabIndex:-1,getContext:()=>context,getBoundingClientRect:()=>({left:0,top:0,width:320,height:720}),setAttribute:noop,focus:noop,addEventListener:(key,fn)=>listeners.set(key,fn),removeEventListener:(key,fn)=>{if(listeners.get(key)===fn)listeners.delete(key)} };
  let instance;
  try {
    instance = make(canvas, item.id, {interactive:false});
    const samples = []; let latest = {hud:[], signature:"unrendered"};
    for (let frame=1; frame<=3600; frame++) {
      texts=[]; signature=2166136261;
      const pending=[...queue.values()]; queue.clear();
      for (const callback of pending) callback(frame * 1000 / 60);
      // Retain the most recent drawing when a 30fps preview skips a tick.
      if (signature !== 2166136261 || texts.length) latest={hud:[...texts],signature:signature.toString(16)};
      if ([2, 600, 1800, 3600].includes(frame)) samples.push({seconds:frame/60, ...latest});
    }
    instance.destroy();
    if (queue.size) throw new Error('Animation frame remained after destroy');
    process.stdout.write(JSON.stringify({id:item.id, name:item.name, seedOffset, samples})+'\n');
  } catch (error) {
    instance?.destroy(); queue.clear();
    process.stdout.write(JSON.stringify({id:item.id, name:item.name, error:String(error)})+'\n');
  }
}
Math.random=originalRandom;


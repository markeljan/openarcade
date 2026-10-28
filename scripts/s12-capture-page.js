import { games, createGame } from '../src/games.js';
import { moreGames, createMoreGame } from '../src/more-games.js';
import { extraGames, createExtraGame } from '../src/extra-games.js';
import { customGames, createCustomGame } from '../src/custom/runtime.js';
import { featureRegistry } from '../src/feature-registry.js';

const loaders = import.meta.glob('../src/feature-games*.js');
const entries = [
  ...featureRegistry.flatMap(group => group.games.map(game => ({ game, path: group.path.replace('./', '../src/'), portrait: true }))),
  ...games.map(game => ({game, make: createGame})),
  ...moreGames.map(game => ({game, make: createMoreGame})),
  ...extraGames.map(game => ({game, make: createExtraGame})),
  ...customGames.map(game => ({game, make: createCustomGame, portrait: true})),
];
if (new Set(entries.map(e => e.game.id)).size !== entries.length) throw Error('Duplicate catalog IDs');
export function catalog() { return entries.map(({game, path, portrait}) => ({...game, source: path || (games.includes(game) ? '../src/games.js' : moreGames.includes(game) ? '../src/more-games.js' : extraGames.includes(game) ? '../src/extra-games.js' : '../src/custom/runtime.js'), portrait: !!portrait})); }

// Drive the same wrappers and update/draw calls as the player with a seeded
// clock, while isolating storage and suppressing audio and network writes.
export async function capture(id, frames = 240) {
  const entry = entries.find(e => e.game.id === id);
  if (!entry) throw Error(`Unknown game ${id}`);
  if (!Number.isInteger(frames) || frames < 2 || frames > 3600) throw Error('Invalid frame count');
  const canvas = document.createElement('canvas');
  canvas.style.cssText = `display:block;width:320px;height:${entry.portrait ? 720 : 240}px`;
  document.body.replaceChildren(canvas);
  let make = entry.make;
  if (entry.path) {
    const load = loaders[entry.path];
    if (!load) throw Error(`Missing module ${entry.path}`);
    const module = await load();
    make = Object.entries(module).find(([key]) => /^createFeatureGame\d*$/.test(key))?.[1];
  }
  if (typeof make !== 'function') throw Error(`Missing factory for ${id}`);
  const oldRandom = Math.random, oldRAF = window.requestAnimationFrame, oldCancel = window.cancelAnimationFrame;
  const oldSet = Storage.prototype.setItem;
  let seed = [...id].reduce((n, c) => (Math.imul(n,31) + c.charCodeAt(0)) >>> 0, 0x12345678);
  let next = 0, queue = new Map(), instance, labels = [], currentFrame = 0, lastDrawFrame = 0;
  const context = canvas.getContext('2d');
  const originalTransform = context.setTransform;
  context.setTransform = function(...args) {
    if (lastDrawFrame !== currentFrame) { labels = []; lastDrawFrame = currentFrame; }
    return originalTransform.apply(this,args);
  };
  const originalFillText = context.fillText;
  context.fillText = function(text, ...args) {
    if (labels.length < 80) labels.push(String(text).slice(0, 160));
    return originalFillText.call(this, text, ...args);
  };
  const snapshots = [];
  const sample = frame => {
    const data = context.getImageData(0,0,canvas.width,canvas.height).data;
    let signature = 2166136261;
    for (let i=0;i<data.length;i+=16) signature = Math.imul(signature ^ data[i] ^ (data[i+1]<<8) ^ (data[i+2]<<16) ^ (data[i+3]<<24),16777619) >>> 0;
    const copy = document.createElement('canvas'); copy.width = canvas.width; copy.height = canvas.height;
    copy.getContext('2d').drawImage(canvas,0,0);
    snapshots.push({frame, lastDrawFrame, signature:signature.toString(16).padStart(8,'0'), labels:[...labels], canvas:copy});
  };
  Math.random = () => { seed = (Math.imul(seed,1664525) + 1013904223) >>> 0; return seed / 0x100000000; };
  window.requestAnimationFrame = cb => { const n = ++next; queue.set(n,cb); return n; };
  window.cancelAnimationFrame = n => queue.delete(n);
  Storage.prototype.setItem = () => {};
  try {
    instance = make(canvas, id, {interactive:false, audioEnabled:false});
    for (let frame = 1; frame <= frames; frame++) {
      currentFrame = frame;
      const pending = [...queue.values()]; queue.clear();
      if (!pending.length) throw Error(`No animation frame for ${id} at ${frame}`);
      for (const fn of pending) fn(frame * (1000 / 60));
      if ([Math.floor(frames/2), Math.floor(frames*3/4), frames].includes(frame)) sample(frame);
    }
    const bad = labels => labels.some(text => /(?:\bgame over\b|\byou (?:win|lose|died)\b|\b(?:victory|defeat|loading|unable to load|how to play|press (?:enter|space) to (?:start|play|restart))\b)/i.test(text));
    const selected = [...snapshots].reverse().find(snapshot => !bad(snapshot.labels));
    if (!selected) throw Error(`Only result/loading/instruction frames for ${id}: ${snapshots.map(s => `${s.frame}: ${s.labels.join(' | ')}`).join('; ')}`);
    const gameplay = selected.canvas;
    const pixels = gameplay.getContext('2d').getImageData(0,0,gameplay.width,gameplay.height).data;
    const colors = new Set();
    for (let i = 0; i < pixels.length; i += 64) colors.add(`${pixels[i]},${pixels[i+1]},${pixels[i+2]},${pixels[i+3]}`);
    if (colors.size < 4) throw Error(`Blank or near-uniform canvas for ${id}`);
    const card = document.createElement('canvas'); card.width = 1200; card.height = 630;
    const ctx = card.getContext('2d');
    ctx.fillStyle = '#10191c'; ctx.fillRect(0,0,1200,630);
    ctx.fillStyle = '#1d2b2a'; ctx.fillRect(0,0,1200,12);
    ctx.fillStyle = '#b5f36f'; ctx.font = '700 26px system-ui, sans-serif'; ctx.fillText('OPENARCADE', 62, 90);
    ctx.fillStyle = '#eff7e8';
    let size = 54; do {ctx.font = `700 ${size}px system-ui, sans-serif`; size -= 2;} while(ctx.measureText(entry.game.name).width > 470 && size > 22);
    ctx.fillText(entry.game.name, 62, 190);
    ctx.fillStyle = '#aac0b5'; ctx.font = '22px system-ui, sans-serif'; ctx.fillText('WATCH AI / PLAY FREE', 62, 237);
    const width = gameplay.width, height = gameplay.height;
    const scale = Math.min(590 / width, 548 / height), w = width * scale, h = height * scale;
    ctx.drawImage(gameplay, 870 - w/2, 315 - h/2, w, h);
    return {png: card.toDataURL('image/png'), canvasWidth: width, canvasHeight: height, colors: colors.size, frames, selectedFrame:selected.frame, samples:snapshots.map(({frame,lastDrawFrame,signature,labels}) => ({frame,lastDrawFrame,signature,labels}))};
  } finally {
    try { instance?.destroy(); }
    finally {
      Math.random = oldRandom; window.requestAnimationFrame = oldRAF;
      window.cancelAnimationFrame = oldCancel; Storage.prototype.setItem = oldSet;
    }
  }
}

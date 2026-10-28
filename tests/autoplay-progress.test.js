import { test } from 'node:test';
import assert from 'node:assert/strict';
import { factories } from '../src/games.js';
import { additionFactories } from '../src/extra-additions.js';

function simulate(factory, prefix, seed) {
  const originalRandom = Math.random;
  Math.random = () => ((seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 2**32);
  try {
    const game = factory();
    let peak = 0;
    const context = new Proxy({fillText(s) { if (s.startsWith(prefix)) peak = Math.max(peak, Number(s.match(/\d+/)?.[0] || 0)); }}, {get(target, key) { return target[key] ?? (() => {}); }, set(target,key,value) {target[key]=value;return true;}});
    for (let i=0;i<60*60;i++) { game.update(1/60, true); if (i%60===0) game.draw(context); }
    return peak;
  } finally { Math.random = originalRandom; }
}

test('seeded Snake previews collect food', () => {
  for (const seed of [1, 42, 98765]) assert.ok(simulate(factories.snake, 'SCORE', seed) >= 3, `seed ${seed}`);
});
test('seeded Sky Steps previews complete crossings', () => {
  for (const seed of [1, 42, 98765]) assert.ok(simulate(additionFactories.platform, 'CROSSINGS', seed) >= 1, `seed ${seed}`);
});

function trace(factory, seed, seconds=90) {
  const originalRandom = Math.random;
  Math.random = () => ((seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 2**32);
  try {
    const game = factory(), labels=[];
    let label='';
    const context = new Proxy({fillText(s) { label=s; }}, {get(target,key) { return target[key] ?? (()=>{}); }, set(target,key,value) { target[key]=value; return true; }});
    for (let i=0;i<seconds*60;i++) { game.update(1/60,true); if (i%15===0) {game.draw(context);labels.push(label);} }
    return labels;
  } finally { Math.random=originalRandom; }
}

test('Invaders clears and restarts waves in preview', () => {
  for (const seed of [1,42,98765]) {
    const values=trace(additionFactories.invaders,seed).map(s=>Number(s.match(/\d+/)?.[0]||0));
    assert.ok(Math.max(...values)>=20, `seed ${seed} reaches late wave`);
    assert.ok(values.some((n,i)=>i>0&&n<values[i-1]-10), `seed ${seed} starts another wave`);
  }
});
test('Road Trip preview avoids traffic long enough to progress', () => {
  for (const seed of [1,42,98765]) {
    const values=trace(additionFactories.racer,seed,60).map(s=>Number(s.match(/\d+/)?.[0]||0));
    assert.ok(Math.max(...values)>=12, `seed ${seed} passes cars`);
  }
});
test('Slide Puzzle leaves its solved screen and starts another puzzle', () => {
  for (const seed of [1,42,98765]) {
    const labels=trace(additionFactories.puzzle,seed);
    const solved=labels.indexOf('SOLVED!');
    assert.ok(solved>=0, `seed ${seed} solves the puzzle`);
    assert.ok(labels.slice(solved+1).includes('SLIDE THE TILES'), `seed ${seed} starts another puzzle`);
  }
});


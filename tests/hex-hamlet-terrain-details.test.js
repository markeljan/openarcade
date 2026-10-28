import test from 'node:test';
import assert from 'node:assert/strict';
import { createHexHamlet } from '../src/feature-games35.js';

for (const auto of [false, true]) test(`${auto ? 'AI' : 'manual'} settlements show stations and meadow flowers`, () => {
  const oldRandom = Math.random;
  let seed = 1;
  Math.random = () => ((seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 2 ** 32);
  try {
    const game = createHexHamlet();
    const tap = key => { game.input(key, true); game.input(key, false); };
    for (let i = 0; i < 60 && game.snapshot().phase === 'build'; i++) {
      const types = Object.values(game.snapshot().map).map(tile => tile.type);
      if (types.includes('T') && types.includes('M')) break;
      if (auto) game.update(1.27, true);
      else {
        const plan = game.previewPlan();
        if (!plan) { tap('z'); continue; }
        for (let j = 0; j < 50 && game.snapshot().selected !== plan.key; j++) tap('ArrowRight');
        for (let j = 0; j < 6 && game.snapshot().rot !== plan.rot; j++) tap('x');
        tap(' ');
      }
    }
    game.update(12 / 60, auto);
    const before = game.snapshot();
    assert.ok(Object.values(before.map).some(tile => tile.type === 'T'));
    assert.ok(Object.values(before.map).some(tile => tile.type === 'M'));
    const rects = [], noop = () => {};
    const context = new Proxy({ fillRect(x, y, w, h) { rects.push({ w, h, color: context.fillStyle }); } }, {
      get: (object, key) => object[key] ?? noop,
      set: (object, key, value) => (object[key] = value, true),
    });
    game.draw(context);
    assert.ok(rects.some(r => r.w === 18 && r.h === 10 && r.color === '#f4dcad'));
    assert.ok(rects.filter(r => r.w === 2 && r.h === 4 && r.color === '#6a984e').length >= 5);
    assert.deepEqual(game.snapshot(), before);
  } finally { Math.random = oldRandom; }
});

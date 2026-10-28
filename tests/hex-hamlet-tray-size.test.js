import test from 'node:test';
import assert from 'node:assert/strict';
import { createHexHamlet } from '../src/feature-games35.js';

for (const auto of [false, true]) test(`${auto ? 'AI' : 'manual'} tray emphasizes the active tile over the two upcoming tiles`, () => {
  const game = createHexHamlet();
  if (auto) for (let i = 0; i < 80; i++) game.update(1 / 60, true);
  else { game.input('x', true); game.input('x', false); }
  const before = game.snapshot(), scales = [], noop = () => {};
  const c = new Proxy({ scale(x,y) { scales.push([x,y]); } }, {
    get: (object, key) => object[key] ?? noop,
    set: (object, key, value) => (object[key] = value, true),
  });
  game.draw(c);
  assert.deepEqual(scales, [[34/29,34/29],[25/29,25/29],[25/29,25/29]]);
  assert.deepEqual(game.snapshot(), before);
});

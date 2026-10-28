import test from 'node:test';
import assert from 'node:assert/strict';
import { createHexHamlet } from '../src/feature-games35.js';

for (const auto of [false, true]) test(`${auto ? 'AI' : 'manual'} placement preview is translucent and restores canvas opacity`, () => {
  const game = createHexHamlet();
  if (auto) for (let i = 0; i < 80; i++) game.update(1 / 60, true);
  else { game.input('ArrowRight', true); game.input('ArrowRight', false); }
  const before = game.snapshot(), alpha = [], noop = () => {};
  const context = new Proxy({ globalAlpha: 1, fill() { alpha.push(context.globalAlpha); } }, {
    get: (object, key) => object[key] ?? noop,
    set: (object, key, value) => (object[key] = value, true),
  });
  game.draw(context);
  assert.ok(alpha.includes(.86));
  assert.equal(context.globalAlpha, 1);
  assert.deepEqual(game.snapshot(), before);
});

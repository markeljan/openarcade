import test from 'node:test';
import assert from 'node:assert/strict';
import { createHexHamlet } from '../src/feature-games35.js';

for (const auto of [false, true]) test(`${auto ? 'AI' : 'manual'} valley has layered hills and a tree line`, () => {
  const game = createHexHamlet();
  if (auto) for (let i = 0; i < 80; i++) game.update(1 / 60, true);
  else { game.input('ArrowRight', true); game.input('ArrowRight', false); }
  const before = game.snapshot(), fills = [], rects = [], noop = () => {};
  const c = new Proxy({ fill() { fills.push(c.fillStyle); }, fillRect(x,y,w,h) { rects.push({x,y,w,h,color:c.fillStyle}); } }, {
    get: (object, key) => object[key] ?? noop,
    set: (object, key, value) => (object[key] = value, true),
  });
  game.draw(c);
  assert.ok(fills.includes('#87a87c'));
  assert.equal(rects.filter(r => r.color === '#758958' && r.w === 10 && r.h === 2).length, 12);
  assert.deepEqual(game.snapshot(), before);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import { createHexHamlet } from '../src/feature-games35.js';

function label(game) {
  const labels = [], noop = () => {};
  const c = new Proxy({ fillText(text,x,y) { if (y === 628) labels.push([text,c.fillStyle]); } }, {
    get: (object,key) => object[key] ?? noop,
    set: (object,key,value) => (object[key] = value,true),
  });
  game.draw(c);
  return labels[0];
}

for (const auto of [false, true]) test(`${auto ? 'AI' : 'manual'} fit guidance reflects placement legality`, () => {
  const oldRandom = Math.random;
  let seed = 1;
  Math.random = () => ((seed = (Math.imul(seed,1664525)+1013904223) >>> 0) / 2**32);
  try {
  const game = createHexHamlet();
  let legal = false, illegal = false;
  for (let i = 0; i < 120 && !(legal && illegal); i++) {
    if (auto) game.update(1/60, true);
    else { const key = i % 6 === 0 ? 'ArrowRight' : 'x'; game.input(key,true); game.input(key,false); }
    const fit = game.snapshot().fit, [text,color] = label(game);
    if (fit.legal) {
      legal = true;
      assert.equal(color,'#147d69');
      assert.equal(text,fit.mismatch ? 'ROUGH FIT' : `${fit.matches} EDGE JOIN${fit.matches > 1 ? 'S' : ''}`);
    } else {
      illegal = true;
      assert.equal(text,'ROTATE TO FIT');
      assert.equal(color,'#c64a37');
    }
  }
  assert.ok(legal && illegal);
  } finally { Math.random = oldRandom; }
});

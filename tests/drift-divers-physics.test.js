import test from 'node:test';
import assert from 'node:assert/strict';
import { createDiverGame } from '../src/feature-games26.js';

test('submarine accelerates and coasts after manual thrust is released', () => {
  const game = createDiverGame();
  game.input('ArrowRight', true);
  game.update(1 / 60, false);
  const first = game.snapshot().sub;
  for (let i = 0; i < 20; i++) game.update(1 / 60, false);
  const powered = game.snapshot().sub;
  assert.ok(powered.vx > first.vx * 3, 'thrust builds speed');
  game.input('ArrowRight', false);
  game.update(1 / 60, false);
  const coast = game.snapshot().sub;
  assert.ok(coast.x > powered.x, 'submarine keeps moving after release');
  assert.ok(coast.vx > 0 && coast.vx < powered.vx, 'water drag slows the coast');
  game.input('ArrowLeft', true);
  for (let i = 0; i < 60; i++) game.update(1 / 60, false);
  assert.ok(game.snapshot().sub.vx < 0, 'opposite thrust reverses direction');
});

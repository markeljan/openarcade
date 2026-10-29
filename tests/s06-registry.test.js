import test from 'node:test';
import assert from 'node:assert/strict';
import rules from '../src/scores/rules/s06.js';
import coverage from '../src/scores/coverage/s06.js';
import {createScoreRegistry} from '../src/scores/registry.js';
import {games} from '../src/games.js';
import {moreGames} from '../src/more-games.js';
import {extraGames} from '../src/extra-games.js';

test('S06 enables only matching, unique rules from its owned 32-game catalog', () => {
  const ids = [...games, ...moreGames, ...extraGames].map(game => game.id);
  assert.equal(ids.length, 32);
  assert.equal(new Set(ids).size, 32);
  const registry = createScoreRegistry(rules, coverage);
  assert.deepEqual(registry.checkCatalog(ids), []);
  for (const rule of rules) {
    assert.ok(registry.getRule(rule.gameId), rule.gameId);
    assert.equal(rule.bounds.integer, true, rule.gameId);
  }
  const snake = registry.getRule('snake');
  assert.equal(snake.bounds.maxScore, 24 * 16 - 3);
  assert.equal(snake.units, 'food');
  assert.equal(snake.order, 'desc');
});

test('S06 has complete matching terminal evidence for all 32 owned games', () => {
  const ids = [...games, ...moreGames, ...extraGames].map(game => game.id);
  assert.equal(rules.length, 32);
  assert.equal(coverage.length, 32);
  const registry = createScoreRegistry(rules, coverage);
  assert.deepEqual(registry.checkCatalog(ids, {complete: true}), []);
  for (const id of ['coin-maze','maze','puzzle']) {
    assert.equal(registry.getRule(id).order, 'asc');
    assert.equal(registry.getRule(id).units, 'milliseconds');
  }
  assert.equal(registry.getRule('invaders').bounds.maxScore, 24);
  assert.equal(registry.getRule('breakout').bounds.maxScore, 36);
  assert.equal(registry.getRule('balance-box').bounds.maxScore, 60);
  assert.ok(registry.getRule('parcel-sort').bounds.minScore < 0);
  assert.ok(registry.getRule('harvest-catch').bounds.minScore < 0);
});

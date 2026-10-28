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

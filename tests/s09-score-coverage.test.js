import test from 'node:test';
import assert from 'node:assert/strict';
import rules from '../src/scores/rules/s09.js';
import coverage from '../src/scores/coverage/s09.js';
import {createScoreRegistry} from '../src/scores/registry.js';

test('S09 enables complete two-game modules with matching versioned evidence', async () => {
  const registry = createScoreRegistry(rules, coverage);
  const catalog = [];
  for (const source of new Set(rules.map(rule => rule.source))) {
    const module = await import(`../${source}`);
    const games = Object.entries(module).find(([name]) => /^featureGames\d+$/.test(name))[1];
    assert.equal(games.length, 2);
    catalog.push(...games.map(game => game.id));
  }
  assert.deepEqual(registry.checkCatalog(catalog, {complete: true}), []);
  assert.equal(coverage.length, rules.length);
  for (const id of catalog) {
    const rule = registry.getRule(id);
    assert.equal(rule.version, 1);
    assert.equal(rule.order, 'desc');
    assert.match(rule.metric, /120 active seconds/);
    assert.equal(rule.bounds.minDurationMs, 120000);
    assert.equal(rule.bounds.maxDurationMs, 120000);
  }
});

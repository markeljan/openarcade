import test from 'node:test';
import assert from 'node:assert/strict';
import {createScoreRegistry, scoreRegistry} from '../src/scores/registry.js';
const rule = {schemaVersion: 1, gameId: 'fixture', source: 'tests/fixture', metric: 'collected', units: 'items', order: 'desc', version: 1, status: 'complete', bounds: {minScore: 0, maxScore: 10, integer: true, minDurationMs: 0, maxDurationMs: 10000}};
const proof = {schemaVersion: 1, gameId: 'fixture', source: 'tests/fixture', ruleVersion: 1, status: 'complete', human: {terminal: 'collision', provenance: 'fresh manual factory', tests: ['tests/scores-run.test.js']}, ai: {terminal: 'collision', provenance: 'same update rules', tests: ['tests/scores-run.test.js']}};
test('empty rollout entries do not enable games', () => {
  assert.deepEqual(createScoreRegistry().checkCatalog(['fixture']), []);
  assert.equal(createScoreRegistry([rule]).getRule('fixture'), null);
  assert.deepEqual(createScoreRegistry().checkCatalog(['fixture'], {complete: true}), ['Incomplete score ID: fixture']);
  assert.equal(scoreRegistry.getRule('not-a-game'), null);
});
test('complete matching rule and evidence enable one catalog ID', () => {
  const registry = createScoreRegistry([rule], [proof]);
  assert.equal(registry.getRule('fixture').version, 1);
  assert.deepEqual(registry.checkCatalog(['fixture'], {complete: true}), []);
  assert.deepEqual(registry.checkCatalog([]), ['Extra score ID: fixture']);
  assert.equal(createScoreRegistry([rule], [{...proof, ruleVersion: 2}]).getRule('fixture'), null);
  assert.throws(() => createScoreRegistry([rule, rule]));
  assert.throws(() => createScoreRegistry([{...rule, bounds: {...rule.bounds, maxScore: Infinity}}]));
});

import test from 'node:test';
import assert from 'node:assert/strict';
import {existsSync} from 'node:fs';
import rules from '../src/scores/rules/s08.js';
import coverage from '../src/scores/coverage/s08.js';
import {createScoreRegistry,validateRule,validateCoverage} from '../src/scores/registry.js';

test('S08 manifest covers both siblings of exactly modules 11–20', async () => {
  const catalog=[];
  for(let n=11;n<=20;n++){
    const module=await import(`../src/feature-games${n}.js`);
    catalog.push(...module[`featureGames${n}`].map(game=>game.id));
  }
  assert.equal(rules.length,20);
  assert.equal(coverage.length,20);
  assert.deepEqual(rules.map(rule=>rule.gameId).sort(),catalog.sort());
  assert.ok(rules.every(validateRule));
  assert.ok(coverage.every(validateCoverage));
  const registry=createScoreRegistry(rules,coverage);
  assert.deepEqual(registry.checkCatalog(catalog),[]);
  for(const evidence of coverage){
    assert.match(evidence.browser.status,/^(not-run|passed|limited)$/);
    if(evidence.status!=='complete')continue;
    assert.ok(registry.getRule(evidence.gameId));
    for(const actor of ['human','ai'])for(const path of evidence[actor].tests){
      assert.ok(existsSync(new URL(`../${path}`,import.meta.url)),`Missing ${path}`);
    }
  }
});

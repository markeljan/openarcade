import test from 'node:test';
import assert from 'node:assert/strict';
import rules from '../src/scores/rules/s07.js';
import coverage from '../src/scores/coverage/s07.js';
import {createScoreRegistry} from '../src/scores/registry.js';

test('S07 score shard owns exactly the twenty feature 1–10 IDs',async()=>{
  const catalog = [];
  for(let n=1;n<=10;n++) {
    const source=`src/feature-games${n===1?'':n}.js`;
    const module=await import(`../${source}`);
    const games=module[`featureGames${n===1?'':n}`];
    assert.equal(games.length,2);
    for(const game of games) {
      catalog.push(game.id);
      assert.equal(rules.find(rule=>rule.gameId===game.id)?.source,source);
    }
  }
  assert.equal(rules.length,20);
  assert.equal(coverage.length,20);
  const registry=createScoreRegistry(rules,coverage);
  assert.deepEqual(registry.checkCatalog(catalog),[]);
  assert.deepEqual(registry.checkCatalog(catalog,{complete:true}).sort(),
    rules.filter(rule=>rule.status==='pending').map(rule=>`Incomplete score ID: ${rule.gameId}`).sort());
  assert.equal(registry.getRule('turbo-arena')?.bounds.maxScore??7,7);
});

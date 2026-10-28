import test from 'node:test';
import assert from 'node:assert/strict';
import {existsSync} from 'node:fs';
import rules from '../src/scores/rules/s10.js';
import coverage from '../src/scores/coverage/s10.js';
import {createScoreRegistry} from '../src/scores/registry.js';

test('S10 complete rules match the owned modules and both actor evidence files',async()=>{
  const registry=createScoreRegistry(rules,coverage),ids=[];
  for(let n=31;n<=40;n++){
    const module=await import(`../src/feature-games${n}.js`);
    for(const {id} of module[`featureGames${n}`])ids.push(id);
  }
  assert.equal(ids.length,20);
  assert.deepEqual(registry.checkCatalog(ids),[]);
  for(const rule of rules){
    assert.ok(ids.includes(rule.gameId));
    assert.ok(registry.getRule(rule.gameId),rule.gameId);
    const evidence=coverage.find(entry=>entry.gameId===rule.gameId);
    for(const actor of ['human','ai'])for(const file of evidence[actor].tests){
      assert.ok(existsSync(new URL('../'+file,import.meta.url)),`${rule.gameId} ${actor}: ${file}`);
    }
    assert.equal(rule.order,rule.units==='milliseconds'?'asc':'desc',rule.gameId);
  }
});

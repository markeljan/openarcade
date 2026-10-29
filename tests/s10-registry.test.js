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
  assert.equal(rules.length,20);
  assert.equal(coverage.length,20);
  assert.deepEqual(registry.checkCatalog(ids),[]);
  assert.deepEqual(registry.checkCatalog(ids,{complete:true}),[]);
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

test('every S10 watch run reaches a real terminal with a score inside its registered bounds',async t=>{
  const names=['window','ResizeObserver','requestAnimationFrame','cancelAnimationFrame'];
  const old=Object.fromEntries(names.map(name=>[name,globalThis[name]])),random=Math.random;
  t.after(()=>{Object.assign(globalThis,old);Math.random=random});
  const noop=()=>{};
  globalThis.window={devicePixelRatio:1};
  globalThis.ResizeObserver=class{observe(){} disconnect(){}};
  for(const rule of rules){
    let seed=1,scheduled,now=0;
    Math.random=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/2**32);
    globalThis.requestAnimationFrame=f=>(scheduled=f,1);
    globalThis.cancelAnimationFrame=()=>{scheduled=null};
    const module=await import('../'+rule.source),number=Number(rule.source.match(/games(\d+)/)[1]);
    const ctx=new Proxy({},{get:(o,k)=>o[k]??noop,set:(o,k,v)=>(o[k]=v,true)});
    const canvas={getContext:()=>ctx,getBoundingClientRect:()=>({width:320,height:720}),setAttribute:noop,addEventListener:noop,removeEventListener:noop};
    const records=[],game=module[`createFeatureGame${number}`](canvas,rule.gameId,{context:'watch-player',onResult:r=>records.push(r)});
    try{
      for(let frame=0;frame<120000&&!records.length;frame++)scheduled(now+=1000/30);
      assert.equal(records.length,1,rule.gameId+' did not reach a terminal');
      const record=records[0],b=rule.bounds;
      assert.equal(record.actor,'ai');assert.equal(record.context,'watch-player');assert.equal(record.submissionEligible,true);
      assert.ok(record.score>=b.minScore&&record.score<=b.maxScore,`${rule.gameId} score ${record.score}`);
      assert.ok(record.durationMs>=b.minDurationMs&&record.durationMs<=b.maxDurationMs,`${rule.gameId} active duration ${record.durationMs}`);
      if(b.integer)assert.ok(Number.isInteger(record.score),rule.gameId);
      if(rule.units==='milliseconds')assert.equal(record.score,record.durationMs,rule.gameId);
    }finally{game.destroy()}
  }
});

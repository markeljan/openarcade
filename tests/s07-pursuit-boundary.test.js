import test from 'node:test';
import assert from 'node:assert/strict';
import {createFeatureGame9, pursuit} from '../src/feature-games9.js';
import {createHarness} from './s07-harness.js';

const initial = {damage:99,cops:[{x:120,y:410,kind:'cruiser',disabled:0}]};

test('scored pursuit freezes on first bust until Enter starts a new run',()=>{
  const h=createHarness(createFeatureGame9,'midnight-pursuit',{interactive:true,pursuitInitial:initial});
  try {
    const shapes=[]; h.ctx.fillRect=(...args)=>shapes.push(args);
    h.key('ArrowUp');
    for(let i=0;i<20&&!h.results.length;i++)h.step();
    assert.equal(h.results.length,1);
    assert.equal(h.game.getSessionState(),'result');
    shapes.length=0; h.step(); const frozen=JSON.stringify(shapes), labels=[...h.labels];
    assert.ok(labels.includes('BUSTED')); assert.ok(labels.includes('RESTART TO PLAY'));
    h.key('ArrowRight'); h.key('ArrowUp');
    for(let i=0;i<30;i++){shapes.length=0;h.step();assert.equal(JSON.stringify(shapes),frozen);}
    assert.equal(h.results.length,1);
    h.press('Enter'); assert.equal(h.game.getSessionState(),'playing');
    for(let i=0;i<20&&h.results.length<2;i++)h.step();
    assert.equal(h.results.length,2); assert.notEqual(h.results[0].runId,h.results[1].runId);
  } finally {h.cleanup();}
});

test('direct pursuit factory retains recovery and progress after bust',()=>{
  const results=[], game=pursuit(()=>{},initial,{finish:r=>results.push(r)});
  game.input('ArrowUp',true); game.update(1/60,false);
  assert.equal(results.length,1); const first=game.snapshot();
  for(let i=0;i<120;i++)game.update(1/60,false);
  assert.ok(game.snapshot().distance>first.distance); assert.equal(results.length,1);
});

for(const action of ['restart','pause','destroy']) test(`pursuit result callback can ${action} safely`,()=>{
  let h; h=createHarness(createFeatureGame9,'midnight-pursuit',{interactive:true,pursuitInitial:initial,onResult(){h.game[action]();}});
  try {
    for(let i=0;i<20&&!h.results.length;i++)h.step();
    assert.equal(h.results.length,1); assert.equal(h.pendingFrames,action==='restart'?1:0);
    if(action==='restart'){assert.equal(h.game.getSessionState(),'playing');for(let i=0;i<20&&h.results.length<2;i++)h.step();assert.equal(h.results.length,2);assert.notEqual(h.results[0].runId,h.results[1].runId);}
  } finally {h.cleanup();}
});

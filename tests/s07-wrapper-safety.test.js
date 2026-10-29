import test from 'node:test';
import assert from 'node:assert/strict';
import {createHarness} from './s07-harness.js';
import {featureGames,createFeatureGame} from '../src/feature-games.js';
import {featureGames2,createFeatureGame2} from '../src/feature-games2.js';
import {featureGames3,createFeatureGame3} from '../src/feature-games3.js';
import {featureGames4,createFeatureGame4} from '../src/feature-games4.js';
import {featureGames5,createFeatureGame5} from '../src/feature-games5.js';
import {featureGames6,createFeatureGame6} from '../src/feature-games6.js';
import {featureGames7,createFeatureGame7} from '../src/feature-games7.js';
import {featureGames8,createFeatureGame8} from '../src/feature-games8.js';
import {featureGames9,createFeatureGame9} from '../src/feature-games9.js';
import {featureGames10,createFeatureGame10} from '../src/feature-games10.js';

const groups = [[featureGames,createFeatureGame],[featureGames2,createFeatureGame2],
  [featureGames3,createFeatureGame3],[featureGames4,createFeatureGame4],
  [featureGames5,createFeatureGame5],[featureGames6,createFeatureGame6],
  [featureGames7,createFeatureGame7],[featureGames8,createFeatureGame8],
  [featureGames9,createFeatureGame9],[featureGames10,createFeatureGame10]];

for (const [games, factory] of groups) for (const {id} of games) {
  test(`${id}: transitions keep one frame loop and disposal stays final`, () => {
    const h = createHarness(factory,id);
    try {
      assert.equal(h.pendingFrames,1);
      h.step(20);
      h.game.beginRun({interactive:true,context:'manual-player'});
      h.key('ArrowRight');h.key(' ');
      h.game.setInteractive(false);
      h.game.beginRun({interactive:true,context:'embed'});
      h.game.restart();h.step(2);
      assert.equal(h.pendingFrames,1);
      h.game.pause();h.game.pause();h.step(20);
      assert.equal(h.pendingFrames,0);
      h.game.restart();
      assert.equal(h.pendingFrames,0,'paused restart must stay paused');
      h.game.resume();h.game.resume();h.step(2);
      assert.equal(h.pendingFrames,1);
      h.game.destroy();h.game.destroy();
      h.game.restart();h.game.setInteractive(true);h.game.resume();
      assert.equal(h.pendingFrames,0,'disposed wrapper cannot resume');
      assert.equal(h.handlers.size,0);
    } finally {h.cleanup();}
  });
}

for (const action of ['restart','pause','destroy']) {
  test(`terminal callback can ${action} Side Surfers without a stale frame`, () => {
    let h;
    h = createHarness(createFeatureGame3,'side-surfers',{
      interactive:true,onResult() {h.game[action]();},
    });
    try {
      for(let i=0;i<18000&&!h.results.length;i++)h.step();
      assert.equal(h.results.length,1,'real crash must report');
      assert.equal(h.results[0].actor,'human');
      assert.equal(h.results[0].context,'manual-player');
      assert.equal(h.pendingFrames,action==='restart'?1:0);
      if(action==='restart') {
        for(let i=0;i<18000&&h.results.length<2;i++)h.step();
        assert.equal(h.results.length,2);
        assert.notEqual(h.results[0].runId,h.results[1].runId);
        assert.equal(h.pendingFrames,1);
      }
    } finally {h.cleanup();}
  });
}

for (const [factory,id] of [[createFeatureGame6,'gridiron-rush'],
  [createFeatureGame8,'grave-garden'],[createFeatureGame10,'frog-convoy']]) {
  for(const action of ['destroy','pause','restart']) test(`${id}: result timeout can ${action} the wrapper safely`,()=>{
    let h;
    h=createHarness(factory,id,{interactive:true,onAttract(){h.game[action]();}});
    try {
      for(let i=0;i<120000&&!h.attract.length;i++)h.step(1,1000/30);
      assert.equal(h.attract.length,1,'real result timeout must return to AI');
      assert.equal(h.results.length,1,'completed human run reports once');
      assert.equal(h.pendingFrames,action==='restart'?1:0,'callback must leave only its own frame');
      if(action==='destroy')assert.equal(h.handlers.size,0);
      if(action==='pause'){
        h.game.resume();h.step(2);assert.equal(h.pendingFrames,1);
      }
    } finally {h.cleanup();}
  });
}

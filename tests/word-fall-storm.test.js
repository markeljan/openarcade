import test from 'node:test';
import assert from 'node:assert/strict';
import {wordfall} from '../src/feature-games3.js';
function seeded(seed,fn){const old=Math.random;Math.random=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/2**32);try{fn()}finally{Math.random=old}}
test('Word Fall enemies enter and pursue across tower heights',()=>seeded(42,()=>{
 const game=wordfall(),kinds=new Set(),heights=new Set();
 for(let i=0;i<60*20;i++){game.update(1/60,true);for(const e of game.snapshot().enemies){kinds.add(e.kind);heights.add(Math.floor(e.y/160));}}
 assert.deepEqual([...kinds].sort(),['bat','mage','wisp']);assert.ok(heights.has(0)&&heights.has(1)&&heights.has(2)&&heights.has(3),'flying enemies should occupy multiple heights');
}));
test('storm warns, strikes and clears while preview dodges its threatened lanes',()=>seeded(42,()=>{
 const game=wordfall(),phases=new Set();let evaded=0;
 for(let i=0;i<60*55;i++){const before=game.snapshot();game.update(1/60,true);const after=game.snapshot();phases.add(after.stormPhase);
  if(before.stormPhase==='warn'&&!before.dead){const nearest=before.stormX.map(x=>{let d=before.player.x-x;if(d>160)d-=320;if(d< -160)d+=320;return d}).sort((a,b)=>Math.abs(a)-Math.abs(b))[0],move=after.player.x-before.player.x;if(Math.abs(nearest)<40&&nearest*move>0)evaded++;}
 }
 assert.ok(phases.has('warn')&&phases.has('live'));assert.equal(game.snapshot().stormPhase,'calm');assert.ok(evaded>0,'preview should move away from a warned lane');
}));

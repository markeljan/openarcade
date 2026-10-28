import test from 'node:test';
import assert from 'node:assert/strict';
import {machineHunt,machineHuntRetreatCover} from '../src/feature-games.js';

test('retreat chooses safer cover over nearer cover next to an alerted threat',()=>{
 const hero={x:100,y:100},near={x:120,y:100},safe={x:0,y:100},threat={x:130,y:100,detect:100};assert.equal(machineHuntRetreatCover([near],[safe],hero,[threat]),safe);assert.equal(machineHuntRetreatCover([near],[safe],hero,[]),near);
});

test('a manually wounded hunter selects a retreat after AI takeover',()=>{
 let seed=1;const old=Math.random;Math.random=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/2**32);
 try{const game=machineHunt();game.input('ArrowUp',true);let wounded=null;for(let i=0;i<60*90;i++){game.update(1/60,false);const s=game.snapshot();if(s.hero.hp<=2&&s.hero.hp>0){wounded=s;break}}assert.ok(wounded,'manual travel encounters damaging machines');game.input('ArrowUp',false);game.update(1/60,true);const retreat=game.snapshot();assert.equal(retreat.aiState,'retreat');assert.ok(retreat.aiGoal,'the AI selected a physical cover target');
 }finally{Math.random=old}
});

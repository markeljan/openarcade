import test from 'node:test';
import assert from 'node:assert/strict';
import {createKitchen} from '../src/feature-games23.js';

test('oven follows reference stage and orbital timing while AI serves orders',()=>{
 const old=Math.random; Math.random=()=>.5;
 try { const g=createKitchen(); let prior=0, loads=0, late=false;
  for(let i=0;i<50000;i++){g.update(1/60,true);const s=g.snapshot();if(s.stage===2&&prior!==2){loads++;const frames=Math.max(68,112-Math.min(3,Math.floor(s.served/3))*8)-(s.orbitalStock.some(Boolean)?11:0);assert.equal(s.bakeDuration,frames/60);if(s.served>=3)late=true;}prior=s.stage;if(late&&s.served>=4)break;}
  assert.ok(loads>=4);assert.ok(late);assert.ok(g.snapshot().served>=4);
 } finally {Math.random=old;}
});

test('manual chef sees an oven ready after the reference bake interval',()=>{
 const old=Math.random; Math.random=()=>.5;
 try { const cues=[],g=createKitchen(c=>cues.push(c));let s;
  for(let i=0;i<15000;i++){g.update(1/60,true);s=g.snapshot();if(s.stage===2)break;}
  assert.equal(s.stage,2);const frames=Math.round(s.bakeDuration*60);
  for(let i=0;i<frames-2;i++)g.update(1/60,false);
  assert.equal(g.snapshot().stage,2);
  for(let i=0;i<3&&g.snapshot().stage===2;i++)g.update(1/60,false);
  assert.equal(g.snapshot().stage,3);assert.ok(cues.includes('kitchen-ready'));
 } finally {Math.random=old;}
});

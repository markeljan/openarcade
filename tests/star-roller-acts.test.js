import test from 'node:test';
import assert from 'node:assert/strict';
import {createStarRoller} from '../src/feature-games17.js';
const opts={firstAct:.1,warningDuration:.25,magnetDuration:1,actInterval:.2,kingDuration:6};
function run(auto){const old=Math.random;Math.random=()=>.5;try{const g=createStarRoller({},opts),states=new Set();let bonus=false,seenRain=false,lastScore=0;for(let i=0;i<1300;i++){g.update(.02,auto);let s=g.snapshot();states.add(s.act);seenRain ||= s.items.some(o=>o.rain);if(s.act==='king'&&s.kingBonuses>0&&s.score>lastScore)bonus=true;lastScore=s.score;if(bonus&&s.actIndex>=2)break}return {s:g.snapshot(),states,seenRain,bonus}}finally{Math.random=old}}
test('manual run witnesses magnet rain and earns royal triple scoring',()=>{const r=run(false);for(const phase of ['magnet-warning','magnet','king-warning','king'])assert.ok(r.states.has(phase),`missing ${phase}`);assert.ok(r.seenRain);assert.ok(r.s.rainSpawned>=27);assert.ok(r.bonus);assert.ok(r.s.kingBonuses>0);assert.equal(r.s.lastKingBonus.gain,r.s.lastKingBonus.base*3)});
test('autoplay collects during the same timed acts',()=>{const r=run(true);assert.ok(r.states.has('magnet')&&r.states.has('king'));assert.ok(r.seenRain);assert.ok(r.bonus);assert.equal(r.s.lastKingBonus.gain,r.s.lastKingBonus.base*3);assert.ok(r.s.score>0)});

test('default manual and autoplay runs can reach both scheduled acts',()=>{
 const old=Math.random;try{for(const auto of [false,true]){let seed=42;Math.random=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/2**32);const g=createStarRoller(),seen=new Set();for(let i=0;i<9000;i++){g.update(1/60,auto);const s=g.snapshot();seen.add(s.act);if(s.dead)break}assert.ok(seen.has('magnet'),`${auto?'AI':'manual'} missed magnet rain`);assert.ok(seen.has('king'),`${auto?'AI':'manual'} missed royal visit`)}}finally{Math.random=old}
});

test('manual countdown lasts 300 seconds unless a star forms early',()=>{
 const old=Math.random;let seed=42;Math.random=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/2**32);try{const g=createStarRoller();g.input('ArrowLeft',true);for(let i=0;i<14950;i++)g.update(.02,false);let s=g.snapshot();assert.equal(s.dead,0);assert.ok(s.time>.9&&s.time<1.1);for(let i=0;i<60;i++)g.update(.02,false);s=g.snapshot();assert.equal(s.result,'TIME UP');assert.ok(s.dead>0)}finally{Math.random=old}
});
test('autoplay can form a star before the full countdown',()=>{
 const old=Math.random;let seed=42;Math.random=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/2**32);try{const g=createStarRoller();for(let i=0;i<18000&&!g.snapshot().dead;i++)g.update(1/60,true);const s=g.snapshot();assert.equal(s.result,'STAR FORMED!');assert.ok(s.time>0);assert.ok(s.elapsed<300)}finally{Math.random=old}
});

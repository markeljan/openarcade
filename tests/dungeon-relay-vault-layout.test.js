import test from 'node:test';import assert from 'node:assert/strict';import {dungeon} from '../src/feature-games15.js';
const seeded=(seed,fn)=>{const old=Math.random;Math.random=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/2**32);try{fn()}finally{Math.random=old}};
function check(s){const pool=[0,2,3,5],a=(s.worldSeed+s.level*3)%4,b=(a+1+((s.worldSeed>>>4)%3))%4;assert.equal(s.puzzles.find(p=>p.kind==='boot').room,pool[a]);assert.equal(s.puzzles.find(p=>p.kind==='key').room,pool[b]);assert.notEqual(a,b)}
for(const auto of [false,true])test(`${auto?'AI':'manual'} vault rooms follow floor seed and never coincide`,()=>{for(let seed=1;seed<=30;seed++)seeded(seed,()=>{const g=dungeon();g.update(1/60,auto);check(g.snapshot())})});
test('AI later floor derives a fresh vault pair from the new floor seed',()=>seeded(42,()=>{const g=dungeon();for(let i=0;i<12000&&g.snapshot().level<2;i++)g.update(.033,true);const s=g.snapshot();assert.equal(s.level,2);check(s)}));

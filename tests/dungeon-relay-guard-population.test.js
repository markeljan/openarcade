import test from 'node:test';
import assert from 'node:assert/strict';
import {dungeon} from '../src/feature-games15.js';
function seeded(fn){const old=Math.random;let seed=42;Math.random=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/2**32);try{fn()}finally{Math.random=old}}
test('manual floor starts with guards in both puzzle rooms',()=>seeded(()=>{const g=dungeon(),s=g.snapshot();for(const p of s.puzzles){const foe=s.enemies.find(e=>e.room===p.room);assert.ok(foe);assert.equal(foe.kind,'guard')}}));
test('AI clears first floor and next floor warden gains health',()=>seeded(()=>{const g=dungeon();for(let i=0;i<30000&&g.snapshot().level<2;i++)g.update(1/60,true);const s=g.snapshot();assert.equal(s.level,2);assert.equal(s.enemies.find(e=>e.kind==='warden').hp,4);for(const p of s.puzzles)assert.equal(s.enemies.find(e=>e.room===p.room)?.kind,'guard')}));

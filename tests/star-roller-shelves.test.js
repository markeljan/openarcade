import test from 'node:test';
import assert from 'node:assert/strict';
import {createStarRoller,rollerShelfClearance} from '../src/feature-games17.js';

test('shelf clearance shrinks with size and position',()=>{const s={gapX:100,gapW:80};assert.ok(rollerShelfClearance(s,100,14)>0);assert.ok(rollerShelfClearance(s,140,14)<0);assert.ok(rollerShelfClearance(s,100,14)>rollerShelfClearance(s,100,85))});

test('manual roller hits a shelf while AI steers through its gap',()=>{const old=Math.random;try{for(const auto of [false,true]){let seed=42;Math.random=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/2**32);const g=createStarRoller({}, {firstShelf:0,shelfGapX:80,shelfGapW:90,shelfInterval:1e9});let s;for(let i=0;i<600;i++){g.update(1/60,auto);s=g.snapshot();if(s.shelfHits||s.shelfThreads)break}if(auto){assert.equal(s.shelfHits,0);assert.equal(s.shelfThreads,1)}else{assert.equal(s.shelfHits,1);assert.ok(s.ball.wobble>0)}}}finally{Math.random=old}});

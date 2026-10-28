import test from 'node:test';import assert from 'node:assert/strict';import {createHeistGame} from '../src/feature-games31.js';
test('AI waits out the teeth and clears the first floor unharmed by them',()=>{const g=createHeistGame();for(let i=0;i<8000&&g.snapshot().floor===0;i++)g.update(1/60,true);const s=g.snapshot();assert.ok(s.floor>=1);assert.equal(s.gearHits,0);assert.ok(s.gearOpen)});

import test from 'node:test';import assert from 'node:assert/strict';import {createRoadsGame,streetTravelIncrement} from '../src/feature-games39.js';
test('worn roads slow travel above threshold',()=>{assert.equal(streetTravelIncrement(1,16),1.5);assert.ok(streetTravelIncrement(1,17)<1.5)});
test('AI traffic wears physical graph edges',()=>{const g=createRoadsGame();for(let i=0;i<16000&&g.snapshot().totalDelivered<4;i++)g.update(1/60,true);const s=g.snapshot();assert.ok(s.totalDelivered>=4);assert.ok(s.edges.some(e=>e.wear>0))});

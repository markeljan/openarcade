import test from 'node:test';
import assert from 'node:assert/strict';
import {createStormSlot} from '../src/feature-games31.js';
function step(g,n,auto=false){for(let i=0;i<n;i++)g.update(1/60,auto)}
test('overdriving a bend can spin the car and Z speeds recovery',()=>{const g=createStormSlot();g.input(' ',true);for(let i=0;i<400&&!g.snapshot().spin;i++)g.update(1/60,false);let s=g.snapshot();assert.ok(s.spin>0);assert.equal(s.notice,'BEND SPIN');g.input(' ',false);g.input('z',true);step(g,30);g.input('z',false);assert.ok(g.snapshot().spin<.25)});
test('rail strike warns before resolving',()=>{const g=createStormSlot();let warning=false,resolved=false;for(let i=0;i<600;i++){g.update(1/60,false);const s=g.snapshot();warning ||= s.hazard.state==='warning';resolved ||= s.hazard.state==='strike';if(resolved)break}assert.ok(warning);assert.ok(resolved)});
test('junction switch works only in the crossover window',()=>{const g=createStormSlot();g.input('ArrowRight',true);g.input('ArrowRight',false);assert.equal(g.snapshot().cars[0].lane,0);for(let i=0;i<400;i++){g.update(1/60,false);const p=g.snapshot().cars[0].p%1;if(Math.abs(p-.18)<.025)break}g.input('ArrowRight',true);g.input('ArrowRight',false);assert.equal(g.snapshot().cars[0].lane,1)});
test('AI completes two-lap cups, changes circuits and increases battery capacity',()=>{const g=createStormSlot();step(g,6000,true);const s=g.snapshot();assert.ok(s.trophies>=2);assert.equal(s.circuit,s.trophies);assert.equal(s.batteryMax,Math.min(120,72+s.trophies*6));assert.ok(s.dodges>0);assert.ok(s.draftCharges>0);assert.equal(s.wetRail.lane,s.circuit%2);assert.ok(s.score>=s.trophies*240)});

test('countersteer reduces accumulated bend grip and prevents the same spin',()=>{const g=createStormSlot();g.input(' ',true);for(let i=0;i<400;i++){g.update(1/60,false);if(g.snapshot().grip>5)break}assert.ok(g.snapshot().grip>0);g.input('z',true);step(g,5);let s=g.snapshot();assert.ok(s.driftSaves>0);assert.equal(s.spin,0)});


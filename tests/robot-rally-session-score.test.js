import test from 'node:test';
import assert from 'node:assert/strict';
import {robots} from '../src/feature-games12.js';
const advance=(g,auto)=>{for(let i=0;i<16000;i++)g.update(.05,auto)};
const flags=s=>s.bots.reduce((n,b)=>n+b.score,0);
test('manual gates and course changes add to the session score',()=>{
 const g=robots();advance(g,false);const s=g.snapshot();assert.ok(flags(s)>0);assert.equal(s.sessionScore,flags(s)*40+s.stageSerial*100);g.reset();assert.equal(g.snapshot().sessionScore,0);
});
test('preview points are excluded after takeover',()=>{
 const g=robots();advance(g,true);const before=g.snapshot();assert.ok(flags(before)>0);assert.equal(before.sessionScore,0);advance(g,false);const after=g.snapshot();assert.equal(after.sessionScore,(flags(after)-flags(before))*40+(after.stageSerial-before.stageSerial)*100);
});

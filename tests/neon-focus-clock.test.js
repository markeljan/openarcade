import test from 'node:test';import assert from 'node:assert/strict';import {duel} from '../src/feature-games39.js';
function countCuts(focus){let cues=[],g=duel(c=>cues.push(c));if(focus)g.input('z',true);g.input(' ',true);for(let i=0;i<27;i++)g.update(1/60,false);g.input(' ',false);return cues.filter(c=>c==='neon-cut').length}
test('focus slows the held-cut cooldown with the rest of combat',()=>{assert.equal(countCuts(false),2);assert.equal(countCuts(true),1)});

import test from 'node:test';
import assert from 'node:assert/strict';
import {dragon} from '../src/feature-games18.js';
const advance=(g,seconds,auto)=>{for(let i=0;i<Math.round(seconds*60);i++)g.update(1/60,auto)};
test('manual flight holds its finale before saving and Enter restarts',()=>{const saves=[],g=dragon({runSeconds:1,records:{finish:s=>saves.push(s)}});advance(g,1,false);let s=g.snapshot();assert.ok(s.finale>0);assert.equal(s.sessionScore,410);advance(g,6.9,false);assert.deepEqual(saves,[]);advance(g,.2,false);assert.equal(saves.length,1);assert.equal(saves[0],410);g.input('Enter',true);s=g.snapshot();assert.equal(s.ended,0);assert.equal(s.sessionScore,0)});
test('manual result returns to attract and preview never records',()=>{const saves=[],g=dragon({runSeconds:1,records:{finish:s=>saves.push(s)}});advance(g,8.1,false);advance(g,11.9,false);assert.equal(g.isAttract(),false);advance(g,.2,false);assert.equal(g.isAttract(),true);advance(g,9,true);assert.equal(saves.length,1)});

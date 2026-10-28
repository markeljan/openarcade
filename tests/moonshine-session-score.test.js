import test from 'node:test';
import assert from 'node:assert/strict';
import {createMoonGame} from '../src/feature-games14.js';
test('manual planting and dawn award source points while preview does not',()=>{
 const g=createMoonGame();g.input(' ',true);g.update(.02,false);g.input(' ',false);assert.equal(g.snapshot().score,7);
 g.reset();for(let i=0;i<2000;i++)g.update(.033,true);assert.equal(g.snapshot().score,0);const before=g.snapshot();assert.ok(before.day>=2);for(let i=0;i<2000;i++)g.update(.033,false);assert.ok(g.snapshot().score>=73);
});

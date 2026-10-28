import test from 'node:test';
import assert from 'node:assert/strict';
import {createDiverGame} from '../src/feature-games26.js';
test('preview recovery is excluded while a manually completed tow earns its reference score',()=>{const g=createDiverGame();for(let i=0;i<20000&&g.snapshot().recoveries<1;i++)g.update(.033,true);assert.equal(g.snapshot().score,145);assert.equal(g.snapshot().manualScore,0);g.reset();for(let i=0;i<20000;i++){g.update(.033,true);const s=g.snapshot();if(s.tethered&&s.sub.y<170)break}assert.ok(g.snapshot().tethered);g.input('ArrowUp',true);for(let i=0;i<1000&&g.snapshot().recoveries<1;i++)g.update(.02,false);g.input('ArrowUp',false);assert.equal(g.snapshot().recoveries,1);assert.equal(g.snapshot().manualScore,145)});

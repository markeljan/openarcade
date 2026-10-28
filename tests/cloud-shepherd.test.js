import test from 'node:test';
import assert from 'node:assert/strict';
import {createShepherdGame} from '../src/feature-games32.js';
const tick=(g,n,auto=false)=>{for(let i=0;i<n;i++)g.update(1/60,auto)};
test('manual stitch is local, consumes fiber and persists',()=>{const g=createShepherdGame();g.input('z',true);tick(g,60);let s=g.snapshot();assert.ok(s.bridges.every(b=>!b.repaired));assert.equal(s.fiber,3);g.input('ArrowUp',true);tick(g,80);g.input('ArrowUp',false);g.input('ArrowLeft',true);tick(g,25);g.input('ArrowLeft',false);tick(g,50);g.input('z',false);s=g.snapshot();assert.ok(s.bridges[0].repaired);assert.equal(s.fiber,2);tick(g,600);assert.ok(g.snapshot().bridges[0].repaired)});
test('whistle only calls nearby sheep',()=>{const g=createShepherdGame();g.input('ArrowLeft',true);tick(g,65);g.input('ArrowLeft',false);g.input(' ',true);tick(g,1);const s=g.snapshot();assert.ok(s.sheep.some(x=>x.called>0));assert.ok(s.sheep.some(x=>x.called===0));});
test('preview repairs both bridges and shelters flock',()=>{const g=createShepherdGame();let repaired=false;for(let i=0;i<18000;i++){g.update(1/60,true);const s=g.snapshot();if(s.bridges.every(b=>b.repaired))repaired=true;if(s.stage>1){assert.ok(repaired);return}}assert.fail('preview did not complete first pasture')});


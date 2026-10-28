import test from 'node:test';
import assert from 'node:assert/strict';
import {createAshenRage,createStarRoller} from '../src/feature-games17.js';
test('Ashen swing and whiff emit only when their phases occur',()=>{
 const sounds=[],g=createAshenRage(s=>sounds.push(s));g.input('x',true);g.input('x',false);assert.deepEqual(sounds,[]);g.update(11/60,false);assert.ok(!sounds.includes('ashen-swing'));g.update(2/60,false);assert.ok(sounds.includes('ashen-swing'));g.update(8/60,false);assert.ok(sounds.includes('ashen-whiff'));
});
test('Star Roller emits dash and act cues once on transitions',()=>{
 const sounds=[],g=createStarRoller({}, {onSound:s=>sounds.push(s),firstAct:0,warningDuration:.1});g.input(' ',true);g.update(.05,false);assert.deepEqual(sounds.slice(0,2),['roller-act-warning','roller-dash']);for(let i=0;i<4;i++)g.update(.05,false);assert.equal(sounds.filter(s=>s==='roller-act-start').length,1);assert.equal(sounds.filter(s=>s==='roller-dash').length,1);
});
test('sweeper warning, lunge and contact produce distinct cues',()=>{
 const old=Math.random;Math.random=()=>0;try{const sounds=[],g=createStarRoller({}, {onSound:s=>sounds.push(s)});for(let i=0;i<3600&&!sounds.includes('roller-sweeper-hit');i++)g.update(1/60,false);for(const s of ['roller-sweeper-warning','roller-sweeper-lunge','roller-sweeper-hit'])assert.ok(sounds.includes(s),s)}finally{Math.random=old}
});

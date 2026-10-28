import test from 'node:test';import assert from 'node:assert/strict';import {createMoonGame} from '../src/feature-games14.js';
function advance(g,seconds,auto=false){for(let i=0;i<Math.round(seconds*60);i++)g.update(1/60,auto)}
test('manual day has dusk, timed night spawns and a restorative dawn before day two',()=>{
 const events=[],g=createMoonGame(e=>events.push(e));g.input(' ',true);g.update(1/60,false);g.input(' ',false);assert.equal(g.snapshot().seeds,13);
 advance(g,35);assert.equal(g.snapshot().actPhase,'warn');assert.equal(g.snapshot().creatures.length,0);
 advance(g,4.1);let s=g.snapshot();assert.equal(s.actPhase,'night');assert.equal(events.filter(e=>e==='moon-spawn').length,1);
 advance(g,4);assert.equal(events.filter(e=>e==='moon-spawn').length,3);
 advance(g,13);s=g.snapshot();assert.equal(s.actPhase,'dawn');assert.equal(s.day,1);assert.equal(s.seeds,18);assert.equal(s.coins,8+(s.dawnLosses===0?5:2));assert.equal(s.score,80);assert.ok(s.creatures.every(m=>m.flee));
 advance(g,4);s=g.snapshot();assert.equal(s.day,2);assert.equal(s.actPhase,'day');assert.ok(s.crops.filter(p=>p.growth>=0).every(p=>p.hp===3&&!p.watered));assert.equal(s.creatures.length,0);
});
test('night creatures do not vanish merely by touching the farmer',()=>{
 const random=Math.random;Math.random=()=>40/280;try{const g=createMoonGame();g.input(' ',true);g.update(1/60,false);g.input(' ',false);g.input('ArrowUp',true);advance(g,1.7);g.input('ArrowUp',false);let contact=false;
 for(let i=0;i<3200;i++){g.update(1/60,false);const s=g.snapshot();if(s.creatures.some(m=>Math.hypot(m.x-s.hero.x,m.y-s.hero.y)<15)){contact=true;break}}
 assert.ok(contact,'creature should remain present when reaching the farmer');
 }finally{Math.random=random}
});

test('surviving night creatures retreat visibly at dawn and cannot damage crops',()=>{
 const g=createMoonGame();advance(g,55.99);let before=g.snapshot();assert.ok(before.creatures.length>0);const loss=before.dawnLosses;advance(g,.05);let dawn=g.snapshot();assert.equal(dawn.actPhase,'dawn');assert.ok(dawn.creatures.length>0);assert.ok(dawn.creatures.every(c=>c.flee));const ys=dawn.creatures.map(c=>c.y);advance(g,.2);let next=g.snapshot();assert.equal(next.dawnLosses,loss);assert.ok(next.creatures.every((c,i)=>c.y<ys[i]));
});

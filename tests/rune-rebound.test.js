import test from 'node:test';
import assert from 'node:assert/strict';
import {createRuneRebound,stepRuneRitual} from '../src/feature-games24.js';
test('nudge consumes mana once during its cooldown and active relaunch does not teleport',()=>{
 const g=createRuneRebound();const before=g.snapshot();g.input('z',true);assert.deepEqual(g.snapshot().ball,before.ball);g.input('ArrowUp',true);let s=g.snapshot();assert.equal(s.mana,2);assert.ok(s.nudgeCooldown>0);g.input('ArrowUp',true);assert.equal(g.snapshot().mana,2);g.input('ArrowDown',true);g.input('ArrowDown',true);assert.equal(g.snapshot().mana,1);assert.ok(g.snapshot().ward>0);
});
test('spell gate cycles through warning and sealed phases',()=>{
 const g=createRuneRebound();for(let i=0;i<41;i++)g.update(.05,false);assert.equal(g.snapshot().gate,'warning');for(let i=0;i<9;i++)g.update(.05,false);assert.equal(g.snapshot().gate,'sealed');for(let i=0;i<26;i++)g.update(.05,false);assert.equal(g.snapshot().gate,'open');
});
test('AI earns crests from rune sockets',()=>{
 const old=Math.random;let seed=42;Math.random=()=>((seed=(seed*1664525+1013904223)>>>0)/4294967296);try{const g=createRuneRebound();for(let i=0;i<5000&&g.snapshot().crests<2;i++)g.update(.05,true);const s=g.snapshot();assert.ok(s.crests>=2);assert.equal(s.stage,s.crests+1)}finally{Math.random=old}
});
test('manual play survives a drain and automatically relaunches',()=>{
 const g=createRuneRebound();for(let i=0;i<6000&&!g.snapshot().drains;i++)g.update(.05,false);let s=g.snapshot();assert.equal(s.drains,1);assert.equal(s.ball.active,false);for(let i=0;i<20;i++)g.update(.05,false);assert.equal(g.snapshot().ball.active,true);
});

test('ritual orb follows gravity, rebounds off a closed gate, and seals only on target contact',()=>{
 let b={x:160,y:250,vx:0,vy:-200,age:0,target:{x:160,y:145}};
 assert.equal(stepRuneRitual(b,'sealed',.1),'ritual');assert.ok(b.y>238);assert.ok(b.vy>0);
 b={x:50,y:150,vx:200,vy:0,age:0,target:{x:100,y:150}};
 assert.equal(stepRuneRitual(b,'open',.2),'sealed');
 b={x:160,y:500,vx:0,vy:10,age:1.59,target:{x:160,y:145}};
 assert.equal(stepRuneRitual(b,'open',.05),'lost');
});
test('autoplay produces a physical ritual orb',()=>{
 const old=Math.random;let seed=42;Math.random=()=>((seed=(seed*1664525+1013904223)>>>0)/4294967296);
 try{const g=createRuneRebound();let found=false;for(let i=0;i<5000;i++){g.update(.02,true);const r=g.snapshot().ritual;if(r){assert.ok(Number.isFinite(r.vx)&&Number.isFinite(r.vy));found=true;break}}assert.ok(found)}finally{Math.random=old}
});


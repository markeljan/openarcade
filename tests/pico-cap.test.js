import test from 'node:test';
import assert from 'node:assert/strict';
import {pico} from '../src/feature-games10.js';
const advance=(g,s,auto=false)=>{for(let i=0;i<Math.ceil(s*60);i++)g.update(1/60,auto)};
const step=(g,key)=>{g.input(key,true);g.input(key,false);advance(g,.45)};
test('crack requires pico form and the first key opens its gate',()=>{
 const g=pico();step(g,'ArrowDown');step(g,'ArrowLeft');step(g,'ArrowDown');step(g,'ArrowLeft');
 step(g,'ArrowLeft');assert.equal(g.snapshot().hero.x,3,'big form cannot enter a crack');
 step(g,'ArrowRight');step(g,'ArrowUp');step(g,'ArrowRight');step(g,' ');assert.ok(g.snapshot().hero.small);
 step(g,'ArrowLeft');step(g,'ArrowDown');step(g,'ArrowLeft');step(g,'ArrowLeft');step(g,'ArrowLeft');
 const s=g.snapshot();assert.ok(s.shards.some(q=>q.kind==='crack'&&q.taken));assert.equal(s.gates[0].open,true);assert.equal(s.gates[1].open,false);assert.ok(s.score>=40);
});
test('big form chops a briar to reach the alternate key',()=>{
 const g=pico();step(g,'ArrowDown');step(g,'ArrowRight');step(g,'ArrowRight');step(g,'ArrowDown');
 let s=g.snapshot();assert.deepEqual([s.hero.x,s.hero.y],[7,4]);step(g,'ArrowRight');s=g.snapshot();assert.equal(s.grid[4][8],0);assert.equal(s.hero.x,7);step(g,'ArrowRight');step(g,'ArrowRight');
 s=g.snapshot();assert.ok(s.shards.some(q=>q.kind==='briar'&&q.taken));assert.equal(s.gates[0].open,true);
});
test('AI solves successive chambers and channels the shrine to restore glades',()=>{
 const g=pico();let opened=false,channel=false;for(let i=0;i<60*60;i++){g.update(1/60,true);const s=g.snapshot();opened ||= s.shrine.open;channel ||= s.channel>0;if(s.glades>1)break}
 assert.ok(opened);assert.ok(channel);assert.ok(g.snapshot().glades>1);assert.ok(g.snapshot().score>=420);
});


test('a briar stays solid while the large hero completes the cut',()=>{
 const g=pico();step(g,'ArrowDown');step(g,'ArrowRight');step(g,'ArrowRight');step(g,'ArrowDown');g.input('ArrowRight',true);g.input('ArrowRight',false);let s=g.snapshot();assert.equal(s.grid[4][8],3);assert.equal(s.chop?.x,8);advance(g,.2);assert.equal(g.snapshot().grid[4][8],3);g.input('ArrowLeft',true);g.input('ArrowLeft',false);assert.equal(g.snapshot().hero.x,7);advance(g,.25);s=g.snapshot();assert.equal(s.chop,null);assert.equal(s.grid[4][8],0);
});

test('a beetle warns before its committed charge and the large hero can parry',()=>{
 const g=pico();for(let i=0;i<120&&!g.snapshot().gnawers.some(e=>e.mode==='windup');i++)g.update(1/60,false);let s=g.snapshot(),beetle=s.gnawers.find(e=>e.mode==='windup');assert.ok(beetle);const before={x:beetle.x,y:beetle.y};advance(g,.1);s=g.snapshot();beetle=s.gnawers.find(e=>e.mode==='windup');assert.ok(beetle);assert.deepEqual({x:beetle.x,y:beetle.y},before);for(let i=0;i<100&&!g.snapshot().parries;i++)g.update(1/60,false);s=g.snapshot();assert.ok(s.charges>0);assert.ok(s.parries>0);assert.ok(s.gnawers.some(e=>e.dead>0));
});

test('storm warns first and soaks exposed small form while large form stays dry',()=>{
 const small=pico();for(const k of ['ArrowDown',' ','ArrowLeft','ArrowDown','ArrowLeft','ArrowLeft'])step(small,k);assert.ok(small.snapshot().hero.small);for(let i=0;i<1800&&small.snapshot().storm.phase==='calm';i++)small.update(1/60,false);assert.equal(small.snapshot().storm.phase,'warning');for(let i=0;i<300&&small.snapshot().storm.phase==='warning';i++)small.update(1/60,false);assert.equal(small.snapshot().storm.phase,'live');advance(small,6);assert.ok(small.snapshot().storm.soaks>0);
 const big=pico();advance(big,35);assert.equal(big.snapshot().storm.phase,'live');assert.equal(big.snapshot().storm.soaks,0);
});

test('AI grows at a mushroom ring during the storm warning',()=>{
 const g=pico();step(g,'ArrowDown');step(g,' ');assert.ok(g.snapshot().hero.small);for(let i=0;i<1800&&g.snapshot().storm.phase==='calm';i++)g.update(1/60,false);assert.equal(g.snapshot().storm.phase,'warning');advance(g,2,true);assert.equal(g.snapshot().hero.small,false);
});

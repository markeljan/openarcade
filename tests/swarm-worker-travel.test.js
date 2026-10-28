import test from 'node:test';import assert from 'node:assert/strict';import {createSwarmKeeper} from '../src/feature-games8.js';
for(const auto of [false,true])test(`${auto?'AI':'manual'} workers travel to a job before advancing it`,()=>{
 const old=Math.random;Math.random=()=>0;try{const g=createSwarmKeeper();let s;for(let i=0;i<1000;i++){g.update(1/60,auto);s=g.snapshot();if(s.challenges[0].active)break}assert.ok(s.challenges[0].active);assert.equal(s.challenges[0].progress,0);assert.ok(s.members.some(m=>m.job===s.challenges[0].kind));
 let worked=false;for(let i=0;i<180;i++){g.update(1/60,auto);s=g.snapshot();if(s.challenges[0].progress>0){worked=true;break}}assert.ok(worked,'assigned workers should reach the job and contribute');
 }finally{Math.random=old}
});
test('rescuers travel to a downed friend before rescue progress begins',()=>{
 const old=Math.random;Math.random=()=>0;try{const g=createSwarmKeeper();let s;for(let i=0;i<1500;i++){g.update(1/60,false);s=g.snapshot();if(s.members.some(m=>m.state==='down'))break}assert.ok(s.members.some(m=>m.state==='down'));g.input('x',true);g.update(1/60,false);s=g.snapshot();assert.equal(s.members.find(m=>m.state==='down').rescue,0);let rescued=false;for(let i=0;i<180;i++){g.update(1/60,false);if(g.snapshot().rescues){rescued=true;break}}assert.ok(rescued);
 }finally{Math.random=old}
});

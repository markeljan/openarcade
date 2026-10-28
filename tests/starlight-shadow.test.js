import test from 'node:test';
import assert from 'node:assert/strict';
import {prism} from '../src/feature-games28.js';
const step=(g,n,auto=false)=>{for(let i=0;i<n;i++)g.update(1/60,auto)};const tap=(g,k)=>{g.input(k,true);g.input(k,false)};
function moveTo(g,target){for(let i=0;i<500;i++){const p=g.snapshot().p,dx=target.x-p.x,dy=target.y-p.y;if(Math.hypot(dx,dy)<5)break;for(const [key,on] of [['ArrowRight',dx>3],['ArrowLeft',dx< -3],['ArrowDown',dy>3],['ArrowUp',dy< -3]])g.input(key,on);g.update(1/60,false)}for(const k of ['ArrowRight','ArrowLeft','ArrowDown','ArrowUp'])g.input(k,false)}
function chargeFirst(g){moveTo(g,g.snapshot().rooms[0].prism);tap(g,'x');step(g,15)}
test('a shadow investigates, warns, lunges and drains a charged lens nonfatally',()=>{
 const g=prism();chargeFirst(g);let phases=new Set(),prior=0,drained=false;for(let i=0;i<300;i++){g.update(1/60,false);const s=g.snapshot(),enemy=s.enemy;if(enemy){phases.add(enemy.state);if(enemy.state==='windup')prior=s.rooms[enemy.room].emitters[enemy.kind].charge;if(enemy.state==='retreat'&&s.rooms[enemy.room].emitters[enemy.kind].charge<prior){drained=true;break}}}assert.ok(phases.has('investigate')&&phases.has('windup')&&phases.has('lunge'));assert.ok(drained);const s=g.snapshot();assert.equal('hp' in s,false);assert.equal('over' in s,false);step(g,50);assert.ok(g.snapshot().rooms[0].emitters[0].charge>0);
});
test('manual shield requires a charged nearby emitter and has a cooldown',()=>{
 const g=prism();tap(g,'z');assert.equal(g.snapshot().pulse,0);chargeFirst(g);step(g,20);moveTo(g,g.snapshot().rooms[0].emitters[0]);tap(g,'z');const s=g.snapshot();assert.ok(s.pulse>0);assert.ok(s.shieldCooldown>0);
});
test('AI counters shadows and continues restoring rooms',()=>{
 let n=42,old=Math.random;Math.random=()=>((n=(Math.imul(n,1664525)+1013904223)>>>0)/2**32);try{const g=prism();step(g,60*70,true);const s=g.snapshot();assert.ok(s.counters.shadowCounters>0);assert.ok(s.counters.restorations>0);assert.equal('hp' in s,false)}finally{Math.random=old}
});

test('AI moves to a charged threatened emitter and activates a shield',()=>{
 let n=42,old=Math.random;Math.random=()=>((n=(Math.imul(n,1664525)+1013904223)>>>0)/2**32);try{const events=[],g=prism(e=>events.push(e));let shield=false;for(let i=0;i<4200&&!shield;i++){g.update(1/60,true);if(events.includes('prism-shield')){const s=g.snapshot();assert.ok(s.shieldCooldown>0);assert.ok(s.rooms.some(r=>r.emitters.some(e=>e.charge>10&&Math.hypot(e.x-s.p.x,e.y-s.p.y)<36)));shield=true}}assert.ok(shield)}finally{Math.random=old}
});
test('a lens strike briefly slows manual movement before normal speed returns',()=>{const g=prism();chargeFirst(g);for(let i=0;i<400&&!g.snapshot().p.hurt;i++)g.update(1/60,false);let s=g.snapshot();assert.ok(s.p.hurt>0,'a charged lens was struck');const x=s.p.x;g.input('ArrowRight',true);step(g,1);s=g.snapshot();assert.ok(Math.abs(s.p.x-x-70.2/60)<1e-6);step(g,20);const recovered=g.snapshot().p;assert.equal(recovered.hurt,0);step(g,1);assert.ok(Math.abs(g.snapshot().p.x-recovered.x-101.7/60)<1e-6);g.input('ArrowRight',false)});
test('shadow enters at its authored height, leaves the floor after its strike, and waits before respawning',()=>{const old=Math.random;Math.random=()=>.5;try{const g=prism();chargeFirst(g);let first;for(let i=0;i<300&&!first;i++){g.update(1/60,false);const s=g.snapshot();if(s.enemy?.state==='investigate')first=s}assert.ok(first);const room=first.rooms[first.enemy.room],lens=room.emitters[first.enemy.kind];assert.equal(first.enemy.y,Math.max(429,Math.min(466.5,lens.y)));for(let i=0;i<300&&g.snapshot().enemy?.state!=='retreat';i++)g.update(1/60,false);let s=g.snapshot();assert.equal(s.enemy.state,'retreat');const start=s.enemy.x,dir=s.enemy.facing;step(g,5);s=g.snapshot();assert.ok((s.enemy.x-start)*dir>3);while(g.snapshot().enemy)g.update(1/60,false);step(g,80);assert.equal(g.snapshot().enemy,null);step(g,20);assert.ok(g.snapshot().enemy)}finally{Math.random=old}});

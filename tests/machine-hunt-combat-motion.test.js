import test from 'node:test';
import assert from 'node:assert/strict';
import {machineHunt, machineHuntLeadAngle} from '../src/feature-games.js';

test('arrow aim leads a moving target and does not lead a stationary one',()=>{
  const hero={x:100,y:100},target={x:200,y:100,prevX:200,prevY:98,stepDt:1/60};
  assert.ok(machineHuntLeadAngle(hero,target)>0, 'aim tracks the target movement');
  target.prevY=100;
  assert.equal(machineHuntLeadAngle(hero,target),0);
});
test('manual dodge slows over its roll and repeated keydown does not retrigger it',()=>{
  const sounds=[],game=machineHunt({sound:n=>sounds.push(n)});
  game.input('ArrowRight',true);game.input(' ',true);
  const start=game.snapshot().hero.x;
  game.update(1/60,false);const first=game.snapshot().hero.x;
  for(let i=0;i<10;i++)game.update(1/60,false);
  const before=game.snapshot().hero.x;game.update(1/60,false);const last=game.snapshot().hero.x;
  assert.ok(first-start>(last-before)*2,'roll speed decays');
  for(let i=0;i<30;i++)game.update(1/60,false);
  game.input(' ',true);assert.equal(sounds.filter(s=>s==='dodge').length,1);
  game.input(' ',false);game.input(' ',true);assert.equal(sounds.filter(s=>s==='dodge').length,2);
});


test('seeded AI kites directly away from a nearby alerted machine',()=>{
 let seed=1;const original=Math.random;Math.random=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/2**32);
 try{const game=machineHunt();let retreated=false;for(let i=0;i<60*120;i++){const before=game.snapshot(),danger=before.robots.filter(r=>!r.dead&&(r.detect>=100||['windup','lunge','stampede'].includes(r.mode))).sort((a,b)=>Math.hypot(a.x-before.hero.x,a.y-before.hero.y)-Math.hypot(b.x-before.hero.x,b.y-before.hero.y))[0];game.update(1/60,true);const after=game.snapshot();if(!danger||before.roll>0||Math.hypot(danger.x-before.hero.x,danger.y-before.hero.y)<=75||Math.hypot(danger.x-before.hero.x,danger.y-before.hero.y)>=104||before.reticles.some(r=>Math.hypot(r.x-before.hero.x,r.y-before.hero.y)<48))continue;const dx=after.hero.x-before.hero.x,dy=after.hero.y-before.hero.y-(after.scroll-before.scroll);if(dx*(before.hero.x-danger.x)+dy*(before.hero.y-danger.y)>0){retreated=true;break}}assert.ok(retreated,'AI retreats from an actual nearby threat');
 }finally{Math.random=original}
});


test('manual dodge remembers a recently released vertical direction then falls back to facing',()=>{
 const game=machineHunt();game.input('ArrowUp',true);game.update(1/60,false);game.input('ArrowUp',false);
 for(let i=0;i<4;i++)game.update(1/60,false);
 const before=game.snapshot();game.input(' ',true);game.update(1/60,false);const after=game.snapshot();
 assert.ok(after.scroll>before.scroll,'the roll continues up after a short release');
 assert.equal(after.hero.x,before.hero.x,'a vertical roll must not turn sideways');
 game.input(' ',false);for(let i=0;i<30;i++)game.update(1/60,false);
 const idle=game.snapshot();game.input(' ',true);game.update(1/60,false);const fallback=game.snapshot();
 assert.ok(fallback.hero.x>idle.hero.x,'after the memory expires an idle roll uses facing');
});


test('preview aims before shooting an unaware machine',()=>{
 let seed=1;const original=Math.random;Math.random=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/2**32);
 try{let shots=0;const game=machineHunt({sound:n=>{if(n==='shoot')shots++}});let candidateAt=null,shotAt=null;
  for(let frame=0;frame<60*120;frame++){const before=game.snapshot(),prior=shots;
   if(candidateAt===null&&before.robots.some(r=>!r.dead&&r.detect<100&&Math.hypot(r.x-before.hero.x,r.y-before.hero.y)<190&&r.y<before.hero.y+70))candidateAt=frame;
   game.update(1/60,true);
   if(shots>prior&&!before.robots.some(r=>!r.dead&&r.detect>=100&&Math.hypot(r.x-before.hero.x,r.y-before.hero.y)<260)){shotAt=frame;break}
  }
  assert.notEqual(candidateAt,null,'AI should encounter an unaware machine');assert.notEqual(shotAt,null,'AI should shoot without first being detected');
  assert.ok(shotAt-candidateAt>=38,'the opening shot waits for the reference aim period');
 }finally{Math.random=original}
});


test('preview dodges a real Thunderjaw projectile perpendicular to its flight',()=>{
 let seed=1;const original=Math.random;Math.random=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/2**32);
 try{let dodges=0;const game=machineHunt({sound:n=>{if(n==='dodge')dodges++}});let observed=false;
  for(let frame=0;frame<60*120;frame++){
   const before=game.snapshot(),shot=before.shots.find(s=>Math.hypot(s.x-before.hero.x,s.y-before.hero.y)<44),prior=dodges;
   const close=before.robots.some(r=>!r.dead&&(r.detect>=100||['windup','lunge','stampede'].includes(r.mode))&&Math.hypot(r.x-before.hero.x,r.y-before.hero.y)<(r.mode==='stampede'?72:45));
   game.update(1/60,true);const after=game.snapshot();
   if(shot&&!close&&before.roll<=0&&dodges>prior){const dx=after.hero.x-before.hero.x,dy=after.hero.y-before.hero.y-(after.scroll-before.scroll);
    assert.ok(Math.hypot(dx,dy)>3,'a dodge physically moves the hunter');if(before.shots.some(q=>Math.hypot(q.x-before.hero.x,q.y-before.hero.y)<44&&Math.abs(dx*q.vx+dy*q.vy)<1e-6)){observed=true;break}}
  }
  assert.ok(observed,'the seeded encounter should trigger a projectile dodge');
 }finally{Math.random=original}
});


test('a manual hunter recoils away from a real machine lunge',()=>{
 let seed=1;const original=Math.random;Math.random=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/2**32);
 try{let hits=0;const game=machineHunt({sound:n=>{if(n==='damage')hits++}});game.input('ArrowUp',true);
  for(let frame=0;frame<1200&&!hits;frame++)game.update(1/60,false);
  assert.equal(hits,1,'manual route should encounter a damaging machine');game.input('ArrowUp',false);
  const before=game.snapshot(),machine=before.robots.filter(r=>r.mode==='lunge').sort((a,b)=>Math.hypot(a.x-before.hero.x,a.y-before.hero.y)-Math.hypot(b.x-before.hero.x,b.y-before.hero.y))[0];assert.ok(machine);
  const source={x:machine.x-machine.vx*3/60,y:machine.y-machine.vy*3/60};game.update(1/60,false);const after=game.snapshot();
  const dx=after.hero.x-before.hero.x,dy=after.hero.y-before.hero.y-(after.scroll-before.scroll);
  assert.ok(dx*(before.hero.x-source.x)+dy*(before.hero.y-source.y)>0,'recoil moves away from the impact');
 }finally{Math.random=original}
});


test('preview moves between cover, hiding and aiming without getting stuck on departed targets',()=>{
 let seed=2;const original=Math.random;Math.random=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/2**32);
 try{const game=machineHunt(),states=new Set();let still=false;for(let frame=0;frame<60*180;frame++){
  const before=game.snapshot();game.update(1/60,true);const after=game.snapshot();states.add(after.aiState);
  if(before.aiState==='hide'&&after.aiState==='hide'&&!before.roll&&!before.robots.some(r=>r.detect>=100&&Math.hypot(r.x-before.hero.x,r.y-before.hero.y)<104)){
   const dx=after.hero.x-before.hero.x,dy=after.hero.y-before.hero.y-(after.scroll-before.scroll);if(Math.hypot(dx,dy)<1e-6)still=true;
  }
 }for(const state of ['trek','hide','aim'])assert.ok(states.has(state),`missing ${state} state`);assert.ok(still,'hunter pauses in cover');assert.ok(game.snapshot().lastMeters>=100,'departed targets must not trap the hunter');
 }finally{Math.random=original}
});


test('preview spends stamina running through open ground and recovers at cover',()=>{
 let seed=2;const original=Math.random;Math.random=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/2**32);
 try{const game=machineHunt();let lowest=100,recovered=false;for(let i=0;i<60*60;i++){game.update(1/60,true);const state=game.snapshot();lowest=Math.min(lowest,state.stamina);if(lowest<95&&state.aiState==='hide'&&state.stamina>lowest+3){recovered=true;break}}assert.ok(lowest<95,'running should spend stamina');assert.ok(recovered,'stamina recovers during cover');
 }finally{Math.random=original}
});


test('manual Shift blocks shooting only while the hunter is actually sprinting',()=>{
 let seed=42;const old=Math.random;Math.random=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/2**32);
 try{let shots=0;const game=machineHunt({sound:n=>{if(n==='shoot')shots++}});game.input('ArrowUp',true);let target=false;for(let i=0;i<60*30;i++){game.update(1/60,false);const s=game.snapshot();if(s.robots.some(r=>!r.dead&&Math.hypot(r.x-s.hero.x,r.y-s.hero.y)<240)){target=true;break}}assert.ok(target,'manual route reaches a machine');game.input('Shift',true);game.input('x',true);game.update(1/60,false);assert.equal(shots,0,'moving with Shift is a sprint, so no shot fires');game.input('ArrowUp',false);game.update(1/60,false);assert.equal(shots,1,'holding Shift while stationary does not suppress the shot');
 }finally{Math.random=old}
});

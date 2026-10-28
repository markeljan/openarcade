import test from 'node:test';
import assert from 'node:assert/strict';
import { createFeatureGame6, scrapClosingSpeed, scrapOvertimeTied, scrapBlastDamage, scrapWreckScore, scrapMatchWinner, scrapPickupUseful, scrapRecentAttacker, scrapSpecialIntent, scrapCollisionImpulse, scrapVelocity, scrap } from '../src/feature-games6.js';

test('Scrap Arena autoplay can eliminate rigs and finish a round', t=>{
  const originalRandom=Math.random;
  const originals=Object.fromEntries(['window','ResizeObserver','requestAnimationFrame','cancelAnimationFrame'].map(key=>[key,globalThis[key]]));
  t.after(()=>{Math.random=originalRandom;Object.assign(globalThis,originals)});
  let seed=7, sequence=0, now=0, lowest=4, finished=false;
  Math.random=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296};
  globalThis.window={devicePixelRatio:1};globalThis.ResizeObserver=class {observe(){} disconnect(){}};
  const scheduled=new Map(),noop=()=>{};
  globalThis.requestAnimationFrame=fn=>{const id=++sequence;scheduled.set(id,fn);return id};
  globalThis.cancelAnimationFrame=id=>scheduled.delete(id);
  const ctx=new Proxy({fillText(value){const m=/^RIGS (\d)\/4$/.exec(value);if(m)lowest=Math.min(lowest,Number(m[1]));if(value==='NEXT ROUND...')finished=true}}, {get:(o,k)=>o[k]??noop,set:(o,k,v)=>(o[k]=v,true)});
  const canvas={getContext:()=>ctx,getBoundingClientRect:()=>({width:240,height:540}),setAttribute:noop,addEventListener:noop,removeEventListener:noop};
  const game=createFeatureGame6(canvas,'scrap-arena');
  for(let i=0;i<9000;i++){now+=1000/60;const callbacks=[...scheduled.values()];scheduled.clear();callbacks.forEach(fn=>fn(now))}
  assert.ok(lowest<4,`autoplay never eliminated a rig`);
  assert.ok(finished,'autoplay never completed a round');
  game.destroy();
});

test('Scrap Arena gives the player three disc charges and consumes one per special', t=>{
  const originals=Object.fromEntries(['window','ResizeObserver','requestAnimationFrame','cancelAnimationFrame'].map(key=>[key,globalThis[key]]));
  t.after(()=>Object.assign(globalThis,originals));
  globalThis.window={devicePixelRatio:1};globalThis.ResizeObserver=class {observe(){} disconnect(){}};
  let callback,now=0,lines=[];globalThis.requestAnimationFrame=fn=>(callback=fn,1);globalThis.cancelAnimationFrame=()=>{};
  const noop=()=>{},handlers={};
  const ctx=new Proxy({fillText(value){lines.push(value)}},{get:(o,k)=>o[k]??noop,set:(o,k,v)=>(o[k]=v,true)});
  const canvas={getContext:()=>ctx,getBoundingClientRect:()=>({width:240,height:540}),setAttribute:noop,addEventListener:(k,fn)=>handlers[k]=fn,removeEventListener:noop};
  const game=createFeatureGame6(canvas,'scrap-arena',{interactive:true});
  const frame=()=>{lines=[];now+=17;callback(now)};
  frame();assert.ok(lines.some(s=>/L3 DISC 3/.test(s)));assert.ok(lines.some(s=>s.startsWith('OPEN SHIFT')));
  handlers.keydown({key:'x',preventDefault:noop});frame();assert.ok(lines.some(s=>/L3 DISC 2/.test(s)));
  handlers.keyup({key:'x',preventDefault:noop});handlers.keydown({key:'x',preventDefault:noop});frame();assert.ok(lines.some(s=>/L3 DISC 2/.test(s)));
  for(let i=0;i<55;i++)frame();handlers.keyup({key:'x',preventDefault:noop});handlers.keydown({key:'x',preventDefault:noop});frame();assert.ok(lines.some(s=>/L3 DISC 1/.test(s)));
  game.destroy();
});


test('ram damage uses closing speed and overtime compares kills and lives', ()=>{
  const left={a:0,speed:80,kills:1,lives:2},right={a:Math.PI,speed:50,kills:1,lives:2};
  assert.ok(scrapClosingSpeed(left,right,1,0)>100,'head-on rigs close quickly');
  right.a=0;right.speed=100;
  assert.ok(scrapClosingSpeed(left,right,1,0)<0,'rigs moving apart do not ram');
  assert.equal(scrapOvertimeTied(left,right),true);
  right.lives=1;assert.equal(scrapOvertimeTied(left,right),false);
  right.lives=2;right.kills=2;assert.equal(scrapOvertimeTied(left,right),false);
});

test('disc turns toward opponents and blast damage falls with distance',()=>{
  assert.equal(scrapBlastDamage(0,50,40),40);assert.equal(scrapBlastDamage(25,50,40),20);assert.equal(scrapBlastDamage(50,50,40),0);
  const game=scrap();game.input('x',true);let first=game.snapshot().bullets.find(b=>b.kind==='disc');assert.ok(first);
  game.update(.05,false);let next=game.snapshot().bullets.find(b=>b.kind==='disc');assert.ok(next);assert.notEqual(next.a,first.a,'disc did not steer toward a target');
});

test('manual rig stops and rebounds from a wall',t=>{
  const random=Math.random;t.after(()=>{Math.random=random});Math.random=()=>.7617993878;
  const game=scrap();game.input('ArrowUp',true);for(let i=0;i<50;i++)game.update(.02,false);
  const state=game.snapshot();assert.ok(state.cars[0].y<=136.01,'rig passed through the first wall');
});
test('AI shots can detonate a barrel',t=>{
  const random=Math.random;t.after(()=>{Math.random=random});let seed=7;Math.random=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296};
  const game=scrap();let exploded=false;for(let i=0;i<6000&&!exploded;i++){game.update(.05,true);exploded=game.snapshot().barrels.some(b=>b.dead>0)}
  assert.ok(exploded,'preview never detonated a barrel');
});


test('collision impulse exchanges normal momentum and preserves tangential motion',()=>{
  const a={a:0,speed:80,driftX:0,driftY:12},b={a:Math.PI,speed:40,driftX:0,driftY:-8};
  assert.equal(scrapCollisionImpulse(a,b,1,0),120);
  assert.ok(scrapVelocity(a).x<80);assert.ok(scrapVelocity(b).x>-40);
  assert.equal(a.driftY,12);assert.equal(b.driftY,-8);
  const before={...a};assert.equal(scrapCollisionImpulse(a,b,1,0),0);assert.deepEqual(a,before);
});

test('manual steering reverses while backing and nitro consumes fuel',t=>{
  const random=Math.random;t.after(()=>{Math.random=random});Math.random=()=>.5;
  const forward=scrap();forward.input('ArrowRight',true);forward.input('ArrowUp',true);forward.input('z',true);forward.update(.05,false);const a=forward.snapshot().cars[0];
  const reverse=scrap();reverse.input('ArrowRight',true);reverse.input('ArrowDown',true);reverse.update(.05,false);const b=reverse.snapshot().cars[0];
  assert.ok(a.a>0);assert.ok(b.a<0);assert.ok(a.nitro<72);assert.ok(Math.hypot(a.vx,a.vy)>0);
});


test('AI uses each special in its intended range and respects cover and invulnerability',()=>{
 const rig={x:0,y:0,a:0,weapon:'DISC',special:3,specialCd:0},foe={x:100,y:0,inv:0};
 assert.equal(scrapSpecialIntent(rig,foe,true),true);assert.equal(scrapSpecialIntent(rig,foe,false),false);
 foe.inv=1;assert.equal(scrapSpecialIntent(rig,foe,true),false);foe.inv=0;
 rig.weapon='MINE';foe.x=-50;assert.equal(scrapSpecialIntent(rig,foe,true),true);foe.x=50;assert.equal(scrapSpecialIntent(rig,foe,true),false);
 rig.weapon='FLUX';assert.equal(scrapSpecialIntent(rig,foe,true),true);foe.x=100;assert.equal(scrapSpecialIntent(rig,foe,true),false);
});


test('repair stays available at full health and old hits do not earn wreck credit',()=>{
 const pickup={type:'repair'},attacker={id:0},victim={hp:100,lastAttacker:attacker,lastHitTime:4};
 assert.equal(scrapPickupUseful(victim,pickup),false);victim.hp=99;assert.equal(scrapPickupUseful(victim,pickup),true);
 assert.equal(scrapRecentAttacker(victim),attacker);victim.lastHitTime=0;assert.equal(scrapRecentAttacker(victim),null);
});


test('sudden wreck awards the credited attacker and wreck score follows total kills',()=>{
 const leader={id:0},attacker={id:1},survivor={id:2};
 assert.equal(scrapMatchWinner([leader,attacker,survivor],[survivor],true,attacker),attacker);
 assert.equal(scrapMatchWinner([leader,attacker],[survivor],true,null),leader);
 assert.equal(scrapMatchWinner([leader,attacker],[survivor],false,null),survivor);
 assert.equal(scrapWreckScore(1),100);assert.equal(scrapWreckScore(3),120);
});

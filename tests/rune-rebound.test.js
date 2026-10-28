import test from 'node:test';
import assert from 'node:assert/strict';
import {createRuneRebound,stepRuneRitual,reboundRuneRail,hitRuneFlipper} from '../src/feature-games24.js';
test('nudge consumes mana once during its cooldown and active relaunch does not teleport',()=>{
 const g=createRuneRebound();const before=g.snapshot();g.input('z',true);assert.deepEqual(g.snapshot().ball,before.ball);g.input('ArrowUp',true);let s=g.snapshot();assert.equal(s.mana,2);assert.ok(s.nudgeCooldown>0);g.input('ArrowUp',true);assert.equal(g.snapshot().mana,2);g.input('ArrowDown',true);g.input('ArrowDown',true);assert.equal(g.snapshot().mana,1);assert.ok(g.snapshot().ward>0);
});
test('spell gate cycles through warning and sealed phases',()=>{
 const g=createRuneRebound();for(let i=0;i<41;i++)g.update(.05,false);assert.equal(g.snapshot().gate,'warning');for(let i=0;i<9;i++)g.update(.05,false);assert.equal(g.snapshot().gate,'sealed');for(let i=0;i<26;i++)g.update(.05,false);assert.equal(g.snapshot().gate,'open');
});
test('AI earns crests from rune sockets',()=>{
 const old=Math.random;let seed=42;Math.random=()=>((seed=(seed*1664525+1013904223)>>>0)/4294967296);try{const g=createRuneRebound();for(let i=0;i<5000&&g.snapshot().crests<2;i++)g.update(.05,true);const s=g.snapshot();assert.ok(s.crests>=2);assert.equal(s.stage,s.crests+1)}finally{Math.random=old}
});
test('manual resting flippers can physically rebound the ball without a strike',()=>{const g=createRuneRebound();for(let i=0;i<6000&&!g.snapshot().passiveFlipperRebounds;i++)g.update(.05,false);const s=g.snapshot();assert.ok(s.passiveFlipperRebounds>0);assert.equal(s.flipperStrikes,0)});

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

test('manual ward counters a telegraphed physical hex while an unprotected hex lands',()=>{for(const ward of [false,true]){const g=createRuneRebound();let warned=false;for(let i=0;i<1000;i++){const s=g.snapshot();if(s.imp.state==='windup'&&s.imp.t<.1){warned=true;if(ward)g.input('ArrowDown',true);break}g.update(1/60,false)}assert.ok(warned);let projectile=false;for(let i=0;i<200;i++){g.update(1/60,false);const s=g.snapshot();projectile ||= !!s.hex;if(s.hexCountered||s.hexHits)break}const s=g.snapshot();assert.ok(projectile);assert.equal(s.hexCountered,ward?1:0);assert.equal(s.hexHits,ward?0:1);if(!ward)assert.equal(s.mult,1)}});
test('AI responds to the imp and physically counters a hex',()=>{const g=createRuneRebound();let warned=false;for(let i=0;i<3000&&!g.snapshot().hexCountered;i++){g.update(1/60,true);warned ||= g.snapshot().imp.state==='windup'}assert.ok(warned);assert.ok(g.snapshot().hexCountered>0)});

test('manual and AI scoring use the current multiplier for bumpers and runes',()=>{
 for(const auto of [false,true]){const g=createRuneRebound();let bumper=false,rune=false;for(let i=0;i<1500&&!rune;i++){const a=g.snapshot();g.update(1/60,auto);const b=g.snapshot();if(!bumper&&b.mult===2&&b.score!==a.score){assert.equal(b.score-a.score,30);bumper=true}if(b.sockets.filter(s=>s.lit).length>a.sockets.filter(s=>s.lit).length){assert.equal(b.score-a.score,90*a.mult);rune=true}}assert.ok(bumper&&rune)}
});
test('AI rift and crest awards use reference multiplier and fixed completion bonus',()=>{
 const old=Math.random;let seed=42;Math.random=()=>((seed=(seed*1664525+1013904223)>>>0)/4294967296);try{const g=createRuneRebound();let seal=false,crest=false;for(let i=0;i<10000&&!(seal&&crest);i++){const a=g.snapshot();g.update(1/60,true);const b=g.snapshot();if(b.sealed>a.sealed&&b.crests===a.crests&&b.mult===a.mult&&b.bankConversions===a.bankConversions){const newlyLit=b.sockets.filter(s=>s.lit).length-a.sockets.filter(s=>s.lit).length;assert.equal(b.score-a.score,(210+90*newlyLit)*a.mult);seal=true}if(b.crests>a.crests){assert.equal(b.mult,1);const m=b.bankConversions>a.bankConversions?Math.min(8,a.mult+2):a.mult;if(b.score-a.score===(b.bankConversions>a.bankConversions?225:90)*m+600)crest=true}}assert.ok(seal&&crest)}finally{Math.random=old}
});

test('manual and AI can bank from a bumper into the called rune for a multiplied conversion',()=>{
 for(const auto of [false,true]){const old=Math.random;let seed=42;Math.random=()=>((seed=(seed*1664525+1013904223)>>>0)/4294967296);try{const g=createRuneRebound();let banked=false,converted=false;for(let i=0;i<30000&&!converted;i++){const a=g.snapshot();if(!auto){g.input('ArrowLeft',a.ball.y>525&&a.ball.x<165&&a.ball.vy>0);g.input('ArrowRight',a.ball.y>525&&a.ball.x>=155&&a.ball.vy>0)}g.update(1/60,auto);const b=g.snapshot();if(b.bank.phase==='banked'){banked=true;assert.ok(b.bank.bumper>=0);assert.ok(b.bank.target)}if(b.bankConversions>a.bankConversions&&b.crests===a.crests&&b.sealed===a.sealed){assert.equal(b.bank.phase,'woven');assert.ok(b.bank.inlays.some(Boolean));assert.equal(b.score-a.score,225*b.mult);converted=true}}assert.ok(banked&&converted)}finally{Math.random=old}}
});

test('sloped rail reflects approaching balls and leaves departing balls alone',()=>{const rail={x1:32,y1:488,x2:86,y2:550},approaching={x:55,y:522,vx:150,vy:-170},before=approaching.vx*(-62)+approaching.vy*54;assert.equal(reboundRuneRail(approaching,rail),true);const after=approaching.vx*(-62)+approaching.vy*54;assert.ok(before<0&&after>0);const leaving={x:55,y:522,vx:-150,vy:170};assert.equal(reboundRuneRail(leaving,rail),false)});
test('manual and AI games physically rebound from the sloped rails',()=>{const old=Math.random;try{for(const auto of [false,true]){let seed=42;Math.random=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296);const g=createRuneRebound();if(!auto)g.input(' ',true);for(let i=0;i<4000&&!g.snapshot().railRebounds;i++)g.update(.02,auto);assert.ok(g.snapshot().railRebounds>0)}}finally{Math.random=old}});

test('swept rail detects a fast crossing between endpoints',()=>{const b={x:56,y:590,vx:0,vy:3000};assert.equal(reboundRuneRail(b,{x1:32,y1:488,x2:86,y2:550},{x:56,y:460}),true);assert.ok(b.vy<3000)});
test('rotating flippers distinguish passive deflection from an active strike',()=>{const passive={x:112,y:568,vx:0,vy:150},f={side:'left',angle:.34,old:.34,on:false};assert.equal(hitRuneFlipper(passive,f), 'passive');assert.ok(passive.vy<150);const active={x:112,y:545,vx:0,vy:200};assert.equal(hitRuneFlipper(active,{side:'left',angle:-.56,old:-.3,on:true}), 'strike');assert.ok(active.vy<0)});
test('manual and AI flippers move and strike the orb',()=>{const old=Math.random;try{for(const auto of [false,true]){let seed=42;Math.random=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296);const g=createRuneRebound();for(let i=0;i<12000&&!g.snapshot().flipperStrikes;i++){const b=g.snapshot().ball;if(!auto){g.input('ArrowLeft',b.y>525&&b.x<165&&b.vy>0);g.input('ArrowRight',b.y>525&&b.x>=155&&b.vy>0)}g.update(1/60,auto)}assert.ok(g.snapshot().flipperStrikes>0)}}finally{Math.random=old}});
test('swept moving flipper detects a ball crossing between frames',()=>{const ball={x:112,y:610,vx:0,vy:1800},flipper={side:'left',angle:.34,old:.34,on:false};assert.equal(hitRuneFlipper(ball,flipper,{x:112,y:530}),'passive');assert.ok(ball.vy<1800)});
test('orb launches immediately while manual flippers animate independently',()=>{const g=createRuneRebound(),s=g.snapshot();assert.equal(s.delay,0);assert.equal(s.ball.vx,-132);assert.equal(s.ball.vy,-552);g.input('ArrowLeft',true);g.update(1/60,false);let after=g.snapshot();assert.ok(after.ball.y<s.ball.y);assert.ok(after.flippers[0].angle<s.flippers[0].angle);assert.equal(after.flippers[1].angle,s.flippers[1].angle);g.input('ArrowLeft',false);g.update(1/60,false);assert.ok(g.snapshot().flippers[0].angle>after.flippers[0].angle)});
test('a swinging flipper can strike a stationary ball between its endpoint angles',()=>{const ball={x:140,y:560,vx:0,vy:0};const f={side:'left',old:.34,angle:-.56,on:true};assert.equal(hitRuneFlipper(ball,f),'strike');assert.ok(ball.vy<0)});

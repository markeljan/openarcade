import test from 'node:test';
import assert from 'node:assert/strict';
import {mail} from '../src/feature-games28.js';
function step(game,n,auto=false){for(let i=0;i<n;i++)game.update(1/60,auto)}
function press(game,key){game.input(key,true);game.input(key,false)}
function walkToTray(game){game.input('ArrowRight',true);for(let i=0;i<200;i++){let s=game.snapshot();if(s.p.x>60&&s.p.x<72&&!s.jumping)press(game,' ');if(s.p.x>=115)break;game.update(1/60,false)}game.input('ArrowRight',false);game.input('z',true);step(game,50);game.input('z',false)}
function walkTo(game,target){for(let i=0;i<1200;i++){const s=game.snapshot(),dx=target-s.p.x;if(Math.abs(dx)<3&&!s.jumping){game.input('ArrowRight',false);game.input('ArrowLeft',false);return}const right=dx>0;game.input('ArrowRight',right);game.input('ArrowLeft',!right);if(!s.jumping&&((right&&(s.p.x>60&&s.p.x<72||s.p.x>140&&s.p.x<151))||(!right&&(s.p.x>85&&s.p.x<98||s.p.x>165&&s.p.x<178))))press(game,' ');game.update(1/60,false)}throw Error('could not reach '+target)}
test('manual sorting takes time and movement interrupts the contact',()=>{
 const old=Math.random;Math.random=()=>.5;try{const game=mail();press(game,'x');assert.ok(!game.snapshot().sorted);walkToTray(game);assert.ok(Math.abs(game.snapshot().p.x-120)<18);press(game,'x');assert.equal(game.snapshot().work?.kind,'sort');step(game,5);assert.ok(!game.snapshot().sorted);game.input('ArrowRight',true);step(game,1);game.input('ArrowRight',false);assert.equal(game.snapshot().work,null);assert.ok(!game.snapshot().sorted);for(let i=0;i<3&&!game.snapshot().sorted;i++){press(game,'x');step(game,13)}assert.ok(game.snapshot().sorted)}finally{Math.random=old}
});
test('AI sorts and delivers a six-address manifest',()=>{
 const old=Math.random;let seed=42;Math.random=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/2**32);try{const game=mail();step(game,6000,true);const state=game.snapshot();assert.ok(state.completed>=1);assert.ok(state.score>=6);assert.ok(state.score>=state.completed*6)}finally{Math.random=old}
});
test('a manually sorted letter reaches its matching address',()=>{
 const old=Math.random;Math.random=()=>.5;try{const game=mail();press(game,'x');walkToTray(game);for(let i=0;i<3&&!game.snapshot().sorted;i++){press(game,'x');step(game,13)}assert.ok(game.snapshot().sorted);press(game,'ArrowUp');assert.equal(game.snapshot().p.floor,0,'unpowered escapes are locked');walkTo(game,210);assert.equal(game.snapshot().rooflineReady,true,'sorted letter is secured by the running gap landing');press(game,'x');assert.ok(game.snapshot().power);walkTo(game,120);press(game,'ArrowUp');assert.equal(game.snapshot().p.floor,1);game.input('ArrowRight',true);for(let i=0;i<500;i++){const s=game.snapshot();if(((s.p.x>60&&s.p.x<72)||(s.p.x>140&&s.p.x<151))&&!s.jumping)press(game,' ');if(s.p.x>=182){game.input('ArrowRight',false);game.input('z',true);if(!s.jumping)break}else {game.input('z',false);game.input('ArrowRight',true)}game.update(1/60,false)}game.input('ArrowRight',false);game.input('z',true);assert.ok(Math.abs(game.snapshot().p.x-190)<18);press(game,'x');step(game,13);game.input('z',false);assert.equal(game.snapshot().score,1);assert.equal(game.snapshot().rooflineDeliveries,1)}finally{Math.random=old}
});

test('manual lantern delivery opens a usable shortcut after a first letter',()=>{
 const old=Math.random;let seed=42;Math.random=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/2**32);try{
  const events=[],game=mail(e=>events.push(e));for(let i=0;i<6000&&game.snapshot().score===0;i++)game.update(1/60,true);
  assert.equal(game.snapshot().score,1);assert.equal(game.snapshot().rooflineDeliveries,1);assert.equal(game.snapshot().relay.fuel,'depot');
  while(game.snapshot().p.floor>0){walkTo(game,45);press(game,'ArrowDown')}
  walkTo(game,60);press(game,'x');assert.equal(game.snapshot().relay.fuel,'carried');
  walkTo(game,45);press(game,'ArrowUp');assert.equal(game.snapshot().p.floor,1);
  walkTo(game,65);press(game,'x');let s=game.snapshot();assert.equal(s.relay.lit,true);assert.equal(s.relay.routeOpen,true);assert.equal(s.score,181);assert.equal(s.manualScore,180);assert.ok(events.includes('fired'));
  press(game,'ArrowDown');s=game.snapshot();assert.equal(s.p.floor,0);assert.equal(s.relay.routeUses,1);
 }finally{Math.random=old}
});
test('AI powers the escapes and restores the lantern once',()=>{
 const old=Math.random;let seed=42;Math.random=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/2**32);try{const game=mail();for(let i=0;i<6000;i++)game.update(1/60,true);const s=game.snapshot();assert.equal(s.power,true);assert.equal(s.relay.fuel,'spent');assert.equal(s.relay.routeOpen,true);assert.ok(s.relay.routeUses>0);assert.ok(s.completed>=1)}finally{Math.random=old}
});

test('ordinary delivery cannot unlock lantern fuel without a secured roofline letter',()=>{
 const old=Math.random;Math.random=()=>.2;try{const game=mail();walkTo(game,210);press(game,'x');walkTo(game,45);press(game,'x');assert.equal(game.snapshot().target,4);walkToTray(game);for(let i=0;i<3&&!game.snapshot().sorted;i++){press(game,'x');step(game,13)}assert.ok(game.snapshot().sorted);assert.equal(game.snapshot().rooflineReady,false);step(game,6);press(game,'ArrowUp');press(game,'x');step(game,13);assert.equal(game.snapshot().delivered,1);assert.equal(game.snapshot().rooflineDeliveries,0);press(game,'ArrowDown');walkTo(game,60);press(game,'x');assert.equal(game.snapshot().relay.fuel,'depot');}finally{Math.random=old}
});
test('cat pounce disrupts a sorted parcel and requires re-sorting',()=>{
 const old=Math.random;Math.random=()=>.5;try{const game=mail();press(game,'x');walkToTray(game);for(let i=0;i<3&&!game.snapshot().sorted;i++){press(game,'x');step(game,13)}walkTo(game,210);press(game,'x');walkTo(game,120);press(game,'ArrowUp');const before=game.snapshot();assert.ok(before.sorted&&before.rooflineReady);for(let i=0;i<1000&&game.snapshot().hazardHits===0;i++)game.update(1/60,false);const after=game.snapshot();assert.ok(after.hazardHits>0);assert.equal(after.sorted,false);assert.equal(after.letter,(before.letter+2)%3);assert.equal(after.rooflineReady,false)}finally{Math.random=old}
});
test('watchdog winds up and lunges at a courier on its terrace',()=>{
 const old=Math.random;Math.random=()=>.5;try{const game=mail();walkTo(game,210);press(game,'x');walkTo(game,45);press(game,'ArrowUp');const states=new Set();for(let i=0;i<600&&game.snapshot().hazardHits===0;i++){game.update(1/60,false);states.add(game.snapshot().dog.state)}assert.ok(states.has('windup'));assert.ok(states.has('pounce'));assert.ok(game.snapshot().hazardHits>0)}finally{Math.random=old}
});
test('moving laundry catches a courier crossing the terrace in midair',()=>{
 const old=Math.random;Math.random=()=>.5;try{const game=mail();walkTo(game,210);press(game,'x');walkTo(game,45);press(game,'ArrowUp');let hit=false;for(let attempt=0;attempt<8&&!hit;attempt++){walkTo(game,140);game.input('ArrowLeft',true);step(game,1);press(game,' ');for(let i=0;i<45;i++){game.update(1/60,false);if(game.snapshot().laundry.hits){hit=true;break}}game.input('ArrowLeft',false);step(game,30)}assert.ok(hit)}finally{Math.random=old}
});



test('wind warns before blowing and bracing protects an upper-floor courier',()=>{
 const g=mail();step(g,91);assert.equal(g.snapshot().gust.phase,'quiet');step(g,1);assert.equal(g.snapshot().gust.phase,'warning');step(g,28);assert.equal(g.snapshot().gust.phase,'blowing');step(g,41);assert.equal(g.snapshot().gust.phase,'quiet');
 walkTo(g,210);press(g,'x');walkTo(g,120);press(g,'ArrowUp');assert.equal(g.snapshot().p.floor,1);for(let i=0;i<500&&g.snapshot().gust.phase!=='blowing';i++)g.update(1/60,false);assert.equal(g.snapshot().gust.phase,'blowing');g.input('z',true);let before=g.snapshot().p.x;step(g,5);assert.equal(g.snapshot().p.x,before);g.input('z',false);before=g.snapshot().p.x;step(g,5);assert.notEqual(g.snapshot().p.x,before);
});

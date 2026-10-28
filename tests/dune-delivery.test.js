import test from 'node:test';
import assert from 'node:assert/strict';
import {dune} from '../src/feature-games27.js';
function move(g,target){for(let i=0;i<500;i++){const p=g.snapshot().hero,dx=target.x-p.x,dy=target.y-p.y;if(Math.hypot(dx,dy)<5)break;for(const [k,on] of [['ArrowLeft',dx< -4],['ArrowRight',dx>4],['ArrowUp',dy< -4],['ArrowDown',dy>4]])g.input(k,on);g.update(.02,false)}for(const k of ['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'])g.input(k,false)}
test('manual well relay carries water and retains interrupted pouring',()=>{
 const g=dune();const well=g.snapshot().wellSites[0];move(g,{x:well.x-45,y:well.y});let s=g.snapshot();assert.equal(s.relay.phase,'carrying');assert.equal(s.wellSites[0].water,0);assert.ok(s.water<9);
 g.input('ArrowRight',true);for(let i=0;i<100&&!g.snapshot().wellSites[0].water;i++)g.update(.02,false);g.input('ArrowRight',false);s=g.snapshot();assert.ok(s.wellSites[0].water>0&&s.wellSites[0].water<2.24);move(g,{x:well.x-35,y:well.y});s=g.snapshot();const saved=s.wellSites[0].water;assert.equal(s.relay.phase,'paused');move(g,well);for(let i=0;i<120&&!g.snapshot().wellSites[0].filled;i++)g.update(.02,false);s=g.snapshot();assert.ok(s.wellSites[0].filled);assert.ok(saved>0);assert.equal(s.wells,1);assert.equal(s.manualScore,145);assert.equal(s.relay,null);
});
test('travel consumes water and a warning precedes the storm',()=>{
 const g=dune(),start=g.snapshot().water;move(g,{x:120,y:440});assert.ok(g.snapshot().water<start);for(let i=0;i<600&&g.snapshot().storm.phase==='calm';i++)g.update(.02,false);assert.equal(g.snapshot().storm.phase,'warning');for(let i=0;i<120&&g.snapshot().storm.phase==='warning';i++)g.update(.02,false);assert.equal(g.snapshot().storm.phase,'active');
});
test('AI restores both wells permanently and continues deliveries',()=>{
 const g=dune();for(let i=0;i<2500&&(g.snapshot().wells<2||g.snapshot().deliveries<2);i++)g.update(.033,true);const s=g.snapshot();assert.equal(s.wells,2);const restored=s.wellSites.filter(w=>w.filled);assert.equal(restored.length,2);assert.ok(restored.every(w=>w.water===2.24));assert.ok(s.deliveries>=2);assert.equal(s.manualScore,0);for(let i=0;i<500;i++)g.update(.033,true);assert.ok(restored.every(w=>g.snapshot().wellSites.find(q=>q.id===w.id).filled));
});

test('storm warns, hurts an exposed caravan repeatedly, and shelters behind the rock',()=>{
 const old=Math.random;Math.random=()=>.5;try{
  const exposed=dune();for(let i=0;i<600&&exposed.snapshot().storm.phase!=='active';i++)exposed.update(1/60,false);let start=exposed.snapshot();assert.equal(start.storm.phase,'active');for(let i=0;i<50;i++)exposed.update(1/60,false);let end=exposed.snapshot();assert.ok(end.health<=3);assert.ok(end.water<=start.water-1.1);
  const protectedRun=dune();move(protectedRun,protectedRun.snapshot().rock);protectedRun.input('x',true);for(let i=0;i<600&&protectedRun.snapshot().storm.phase!=='active';i++)protectedRun.update(1/60,false);start=protectedRun.snapshot();assert.equal(start.shelter,true);for(let i=0;i<50;i++)protectedRun.update(1/60,false);end=protectedRun.snapshot();assert.equal(end.health,start.health);assert.ok(end.water>start.water-.5,'lee movement costs less water than an exposed storm');
 }finally{Math.random=old}
});
test('dust devil telegraphs its target and a trimmed manual dodge avoids the lane',()=>{
 const old=Math.random;Math.random=()=>.5;try{const g=dune();for(let i=0;i<600&&g.snapshot().devil?.phase!=='windup';i++)g.update(1/60,false);let s=g.snapshot();assert.equal(s.devil.phase,'windup');const before=s.water;g.input(' ',true);g.input('ArrowDown',true);for(let i=0;i<28;i++)g.update(1/60,false);g.input('ArrowDown',false);s=g.snapshot();assert.ok(s.dodges>=1);for(let i=0;i<35;i++)g.update(1/60,false);assert.notEqual(g.snapshot().message,'DUST DEVIL HIT');assert.ok(g.snapshot().water<=before);
 }finally{Math.random=old}
});

test('AI responds to dust devil warnings and continues the delivery route',()=>{
 const old=Math.random;Math.random=()=>.5;try{const g=dune();for(let i=0;i<60*120;i++)g.update(1/60,true);const s=g.snapshot();assert.ok(s.dodges>0);assert.ok(s.deliveries>=2);assert.ok(s.wells>=2);assert.ok(s.health>=1)}finally{Math.random=old}
});
test('sheltering settles the caravan into the rock lee despite steering',()=>{const g=dune();move(g,g.snapshot().rock);g.input('x',true);g.input('ArrowRight',true);let low=Infinity,high=-Infinity;for(let i=0;i<120;i++){g.update(1/60,false);const s=g.snapshot();assert.equal(s.shelter,true);low=Math.min(low,s.hero.x);high=Math.max(high,s.hero.x)}const s=g.snapshot();assert.ok(high-low>5,'lee sways');assert.ok(Math.abs(s.hero.x-(s.rock.x+14))<16,'remains behind rock');g.input('x',false);g.input('ArrowRight',false)});


test('manual wind-shadow detour shelters a parcel and credits its matching outpost',()=>{
 const old=Math.random;Math.random=()=>.5;try{const g=dune();move(g,{x:g.snapshot().rock.x-10,y:g.snapshot().rock.y});while(g.snapshot().storm.phase==='calm')g.update(.02,false);const shadow=g.snapshot().caravan.shadow;move(g,shadow.detour);let s=g.snapshot();assert.ok(s.caravan.shadow.committed);assert.ok(s.caravan.shadow.watered);assert.equal(s.caravan.oasisVisits,1);
 move(g,s.rock);g.input('x',true);for(let i=0;i<200&&g.snapshot().storm.phase!=='calm';i++)g.update(.02,false);g.input('x',false);s=g.snapshot();assert.ok(s.caravan.shadow.protected);assert.equal(s.caravan.parcel.destination,s.nextStop);move(g,s.stop);g.input('z',true);s=g.snapshot();assert.equal(s.caravan.protectedDeliveries,1);assert.equal(s.caravan.parcel,null);assert.equal(s.caravan.route[0].protected,true);assert.equal(s.deliveries,1);
 }finally{Math.random=old}
});
test('unprotected storm does not create a parcel and trading refills above seven water',()=>{
 const old=Math.random;Math.random=()=>.5;try{const unattended=dune();for(let i=0;i<300;i++)unattended.update(1/60,false);assert.equal(unattended.snapshot().caravan.parcel,null);const g=dune(),s0=g.snapshot();move(g,s0.stop);const before=g.snapshot();assert.ok(before.water>7&&before.water<11.9);g.input('z',true);const after=g.snapshot();assert.equal(after.water,12);assert.equal(after.caravan.protectedDeliveries,0);assert.equal(after.caravan.route[0].protected,false);
 }finally{Math.random=old}
});
test('AI protects and delivers a storm parcel across several fixed random streams',()=>{
 const old=Math.random;try{for(const value of [.1,.5,.9]){Math.random=()=>value;const g=dune();for(let i=0;i<60*120&&(g.snapshot().caravan.protectedDeliveries===0||g.snapshot().caravan.oasisVisits===0);i++)g.update(1/60,true);const s=g.snapshot();assert.ok(s.caravan.oasisVisits>0);assert.ok(s.caravan.protectedDeliveries>0);assert.ok(s.caravan.route.some(r=>r.protected))}}finally{Math.random=old}
});

test('manual well restoration emits one pickup cue only at completion',()=>{const cues=[],g=dune(c=>cues.push(c));const well=g.snapshot().wellSites[0];move(g,{x:well.x-45,y:well.y});assert.deepEqual(cues,[]);move(g,well);for(let i=0;i<120&&!g.snapshot().wellSites[0].filled;i++)g.update(.02,false);assert.equal(g.snapshot().wells,1);assert.deepEqual(cues,['pickup']);for(let i=0;i<100;i++)g.update(.02,false);assert.deepEqual(cues,['pickup'])});
test('AI emits one pickup cue for each restored well',()=>{const cues=[],g=dune(c=>cues.push(c));for(let i=0;i<2500&&g.snapshot().wells<2;i++)g.update(.033,true);assert.equal(g.snapshot().wells,2);assert.deepEqual(cues,['pickup','pickup'])});
test('a new well relay is available only at dusk or night',()=>{const old=Math.random;Math.random=()=>.5;try{const g=dune();for(let i=0;i<771;i++)g.update(1/60,false);assert.equal(g.snapshot().night,'day');move(g,{x:g.snapshot().wellSites[0].x-45,y:g.snapshot().wellSites[0].y});let s=g.snapshot();assert.equal(s.night,'day');assert.ok(Math.hypot(s.hero.x-s.wellSites[0].x,s.hero.y-s.wellSites[0].y)<60);assert.equal(s.relay,null);for(let i=0;i<160&&g.snapshot().night==='day';i++)g.update(1/60,false);s=g.snapshot();assert.equal(s.night,'dusk');assert.equal(s.relay,null,'standing still does not load the relay');g.input('ArrowRight',true);g.update(1/60,false);g.input('ArrowRight',false);assert.ok(g.snapshot().relay)}finally{Math.random=old}});

test('lane changes do not consume travel water, forward travel does',()=>{
 const g=dune(),initial=g.snapshot().water;g.input('ArrowUp',true);for(let i=0;i<30;i++)g.update(1/60,false);g.input('ArrowUp',false);assert.ok(Math.abs(g.snapshot().water-initial)<1e-9);g.input('ArrowRight',true);for(let i=0;i<30;i++)g.update(1/60,false);g.input('ArrowRight',false);assert.ok(g.snapshot().water<initial);
});
test('well pours at the reference 0.16 units per frame and can be interrupted',()=>{
 const g=dune(),well=g.snapshot().wellSites[0];move(g,{x:well.x-45,y:well.y});g.input('ArrowRight',true);for(let i=0;i<150&&!g.snapshot().wellSites[0].water;i++)g.update(1/60,false);g.input('ArrowRight',false);const first=g.snapshot().wellSites[0].water;assert.ok(first>0&&first<2.24);g.update(1/60,false);assert.ok(Math.abs(g.snapshot().wellSites[0].water-first-.16)<1e-8);
});

test('manual first cargo delivery earns 128 points',()=>{const g=dune();move(g,g.snapshot().stop);g.input('z',true);g.input('z',false);assert.equal(g.snapshot().deliveries,1);assert.equal(g.snapshot().manualScore,128)});

test('manual pouring reveals partial well water and restoration brings village life',()=>{
 const old=Math.random;Math.random=()=>.5;try{const g=dune(),well=g.snapshot().wellSites[0];move(g,{x:well.x-45,y:well.y});g.input('ArrowRight',true);for(let i=0;i<100&&!g.snapshot().wellSites[0].water;i++)g.update(1/60,false);g.input('ArrowRight',false);
 let s=g.snapshot();assert.ok(s.wellSites[0].water>0&&s.wellSites[0].water<2.24);const shapes=[],noop=()=>{},ctx=new Proxy({fillRect(x,y,w,h){shapes.push({color:ctx.fillStyle,w,h})}},{get:(o,k)=>o[k]??noop,set:(o,k,v)=>(o[k]=v,true)});g.draw(ctx);assert.ok(shapes.some(q=>q.color==='#69c9ec'&&q.h===10&&q.w>0&&q.w<22));
 move(g,well);for(let i=0;i<120&&!g.snapshot().wellSites[0].filled;i++)g.update(1/60,false);s=g.snapshot();assert.equal(s.wellSites[0].reeds,4);assert.equal(s.wellSites[0].villagers,2);assert.equal(s.wellSites[0].lanterns,true);shapes.length=0;g.draw(ctx);assert.ok(shapes.some(q=>q.color==='#69c9ec'&&q.w===53));assert.ok(shapes.some(q=>q.color==='#ffbd72'&&q.w===8&&q.h===10));
 }finally{Math.random=old}
});
test('AI revived wells retain their village details as the route advances',()=>{
 const old=Math.random;try{for(const seed of [1,2,43]){let n=seed;Math.random=()=>((n=(Math.imul(n,1664525)+1013904223)>>>0)/4294967296);const g=dune();for(let i=0;i<7200&&g.snapshot().wells<3;i++)g.update(1/60,true);const before=g.snapshot(),revived=before.wellSites.filter(w=>w.filled);assert.ok(revived.length>=3,'seed '+seed+' did not revive three wells');assert.ok(revived.every(w=>w.reeds===4&&w.villagers===2&&w.lanterns));for(let i=0;i<1800&&g.snapshot().nextStop<=before.nextStop;i++)g.update(1/60,true);const after=g.snapshot();assert.ok(after.nextStop>before.nextStop,'seed '+seed+' did not continue the route');assert.ok(revived.every(w=>{const site=after.wellSites.find(v=>v.id===w.id);return site.filled&&site.water===2.24&&site.reeds===4&&site.villagers===2&&site.lanterns}))}}finally{Math.random=old}
});

test('held barter triggers when the caravan reaches the outpost',()=>{const old=Math.random;Math.random=()=>.5;try{const g=dune();g.input('z',true);assert.equal(g.snapshot().deliveries,0);move(g,g.snapshot().stop);g.input('z',false);const s=g.snapshot();assert.equal(s.deliveries,1);assert.equal(s.manualScore,128)}finally{Math.random=old}});
test('dust devil spawns in the reference lane offset and reverses momentum on impact',()=>{
 const old=Math.random;Math.random=()=>.5;try{const g=dune();for(let i=0;i<500&&!g.snapshot().devil;i++)g.update(1/60,false);let s=g.snapshot();assert.ok(s.devil);assert.ok(Math.abs(Math.abs(s.devil.y-s.hero.y)-13.76)<1e-8);for(let i=0;i<200;i++){s=g.snapshot();if(s.devil?.phase==='dash'&&s.devil.x-s.hero.x<36)break;g.update(1/60,false)}g.input('ArrowRight',true);let hit=false;for(let i=0;i<20;i++){g.update(1/60,false);s=g.snapshot();if(s.message==='DUST DEVIL HIT'){hit=true;assert.ok(s.hero.vx<0);break}}g.input('ArrowRight',false);assert.ok(hit,'the physical dash hit the moving caravan')}finally{Math.random=old}
});
test('storm duration advances by one stage for each three deliveries',()=>{
 const old=Math.random;Math.random=()=>.5;try{const g=dune();for(let i=0;i<7200&&g.snapshot().deliveries<3;i++)g.update(1/60,true);assert.ok(g.snapshot().deliveries>=3);let prev=g.snapshot();for(let i=0;i<1000;i++){g.update(1/60,true);const s=g.snapshot();if(prev.storm.phase==='warning'&&s.storm.phase==='active'){const expected=(58+Math.min(22,Math.floor(s.deliveries/3)*3))/60;assert.ok(Math.abs(s.storm.timer-expected)<1e-8);return}prev=s}assert.fail('no later storm')}finally{Math.random=old}
});

test('an exposed moving caravan loses momentum at storm impact',()=>{
 const old=Math.random;Math.random=()=>.5;try{const g=dune();while(g.snapshot().storm.phase==='calm')g.update(1/60,false);g.input('ArrowRight',true);let before=g.snapshot();for(let i=0;i<100;i++){g.update(1/60,false);const after=g.snapshot();if(before.storm.phase==='warning'&&after.storm.phase==='active'){assert.ok(before.hero.vx>50);assert.ok(after.hero.vx<before.hero.vx*.75);assert.equal(after.health,before.health-1);return}before=after}assert.fail('storm did not strike')}finally{Math.random=old}
});

test('manual caravan faces its travel direction and shows the sail except in shelter',()=>{
 const g=dune(),scales=[],fills=[],noop=()=>{},ctx=new Proxy({scale(x,y){scales.push([x,y])},fill(){fills.push(ctx.fillStyle)}},{get:(o,k)=>o[k]??noop,set:(o,k,v)=>(o[k]=v,true)});g.draw(ctx);assert.ok(fills.includes('#f6ecd2'),'untrimmed sail is visible');g.input('ArrowLeft',true);for(let i=0;i<10;i++)g.update(1/60,false);g.input('ArrowLeft',false);assert.equal(g.snapshot().hero.face,-1);scales.length=0;g.draw(ctx);assert.equal(scales.filter(([x])=>x===-1).length,2,'both camels face left');move(g,g.snapshot().rock);g.input('x',true);g.update(1/60,false);assert.equal(g.snapshot().shelter,true);fills.length=0;g.draw(ctx);assert.ok(!fills.includes('#f6ecd2'),'sail is lowered in shelter');g.input('x',false);
});
test('AI travel animates the caravan gait',()=>{const g=dune(),initial=g.snapshot().hero.gait;for(let i=0;i<180;i++)g.update(1/60,true);assert.ok(g.snapshot().hero.gait>initial)});

function makeStarvedRelay(){
 const g=dune();for(let i=0;i<1600;i++)g.update(1/60,false);assert.equal(g.snapshot().water,0);const w=g.snapshot().wellSites[0];
 for(let i=0;i<3000&&!g.snapshot().relay;i++){const s=g.snapshot(),dx=w.x-45+(i%60<30?5:-5)-s.hero.x,dy=w.y-s.hero.y;for(const [k,on] of [['ArrowRight',dx>2],['ArrowLeft',dx< -2],['ArrowDown',dy>2],['ArrowUp',dy< -2]])g.input(k,on);g.update(1/60,false)}
 for(const k of ['ArrowRight','ArrowLeft','ArrowDown','ArrowUp'])g.input(k,false);assert.equal(g.snapshot().relay?.phase,'resupply');return g;
}
test('manual dry relay buys at its supplier then loads only near its well',()=>{
 const old=Math.random;Math.random=()=>.5;try{const g=makeStarvedRelay(),s0=g.snapshot();move(g,s0.stop);g.input('z',true);g.input('z',false);let s=g.snapshot();assert.equal(s.coins,s0.coins-1);assert.equal(s.nextStop,0);assert.equal(s.relay.phase,'loading');assert.equal(s.relay.water,0);assert.ok(s.water>4.9);move(g,s.wellSites[0]);for(let i=0;i<150&&!g.snapshot().wellSites[0].filled;i++)g.update(1/60,false);s=g.snapshot();assert.ok(s.wellSites[0].filled);assert.equal(s.wells,1)}finally{Math.random=old}
});
test('AI recovers an actually depleted relay by buying water and restoring its well',()=>{
 const old=Math.random;Math.random=()=>.5;try{const g=makeStarvedRelay(),coins=g.snapshot().coins;let purchased=false;for(let i=0;i<3000&&!g.snapshot().wellSites[0].filled;i++){g.update(1/60,true);purchased ||= g.snapshot().coins<coins}const s=g.snapshot();assert.ok(purchased);assert.ok(s.wellSites[0].filled);assert.equal(s.wells,1)}finally{Math.random=old}
});

test('holding trim retriggers after cooldown and waits while sheltered',()=>{
 const g=dune();g.input(' ',true);assert.ok(g.snapshot().trim>0);for(let i=0;i<40;i++)g.update(1/60,false);assert.equal(g.snapshot().trim,0);for(let i=0;i<18;i++)g.update(1/60,false);assert.ok(g.snapshot().trim>0,'held trim retriggered');g.input(' ',false);
 const sheltered=dune();move(sheltered,sheltered.snapshot().rock);sheltered.input('x',true);sheltered.update(1/60,false);assert.equal(sheltered.snapshot().shelter,true);sheltered.input(' ',true);sheltered.update(1/60,false);assert.equal(sheltered.snapshot().trim,0);sheltered.input('x',false);sheltered.update(1/60,false);assert.ok(sheltered.snapshot().trim>0);sheltered.input(' ',false);
});
test('active manual and AI pours draw the carried water stream only while pouring',()=>{
 const old=Math.random;Math.random=()=>.5;try{for(const auto of [false,true]){const g=dune(),well=g.snapshot().wellSites[0];if(!auto){move(g,{x:well.x-45,y:well.y});g.input('ArrowRight',true)}for(let i=0;i<2000&&g.snapshot().relay?.phase!=='pouring';i++)g.update(1/60,auto);if(!auto)g.input('ArrowRight',false);assert.equal(g.snapshot().relay?.phase,'pouring');const fills=[],noop=()=>{};let path='';const ctx=new Proxy({beginPath(){path=''},arc(){path='arc'},moveTo(){path='poly'},fill(){fills.push([ctx.fillStyle,path])}},{get:(o,k)=>o[k]??noop,set:(o,k,v)=>(o[k]=v,true)});g.draw(ctx);assert.ok(fills.some(([color,path])=>color==='#69c9ec'&&path==='poly'),'draws water stream');if(!auto){move(g,{x:well.x-35,y:well.y});assert.equal(g.snapshot().relay.phase,'paused');fills.length=0;g.draw(ctx);assert.ok(!fills.some(([color,path])=>color==='#69c9ec'&&path==='poly'),'stream stops on interruption')}}}finally{Math.random=old}
});

test('warning and active storms render distinct moving sand for manual and AI runs',()=>{
 const old=Math.random;Math.random=()=>.5;try{for(const auto of [false,true]){const g=dune(),paint=[],stack=[],noop=()=>{},ctx=new Proxy({globalAlpha:1,save(){stack.push(ctx.globalAlpha)},restore(){ctx.globalAlpha=stack.pop()},fillRect(x,y,w,h){paint.push({x,y,w,h,color:ctx.fillStyle,alpha:ctx.globalAlpha})}},{get:(o,k)=>o[k]??noop,set:(o,k,v)=>(o[k]=v,true)});while(g.snapshot().storm.phase==='calm')g.update(1/60,auto);g.draw(ctx);assert.ok(paint.some(q=>q.color==='#ffbd72'&&q.alpha>0&&q.alpha<.12&&q.w===320));const warning=paint.filter(q=>q.color==='#ffe8b5'&&q.w===10&&q.h===2);assert.equal(warning.length,11);paint.length=0;while(g.snapshot().storm.phase==='warning')g.update(1/60,auto);g.draw(ctx);assert.ok(paint.some(q=>q.color==='#bc6654'&&q.alpha===.23&&q.w===320));const sand=paint.filter(q=>q.color==='#f1c58c'&&q.w===20&&q.h===2);assert.equal(sand.length,37);const x=sand[0].x;paint.length=0;g.update(1/60,auto);g.draw(ctx);assert.notEqual(paint.filter(q=>q.color==='#f1c58c'&&q.w===20&&q.h===2)[0].x,x)}}finally{Math.random=old}
});
test('dust devil windup draws a warning and a six-band rotating funnel',()=>{
 const old=Math.random;Math.random=()=>.5;try{const g=dune();for(let i=0;i<600&&g.snapshot().devil?.phase!=='windup';i++)g.update(1/60,false);assert.equal(g.snapshot().devil?.phase,'windup');let ellipses=0;const fills=[],noop=()=>{},ctx=new Proxy({ellipse(){ellipses++},fill(){fills.push(ctx.fillStyle)}},{get:(o,k)=>o[k]??noop,set:(o,k,v)=>(o[k]=v,true)});g.draw(ctx);assert.equal(ellipses,6);assert.ok(fills.includes('#ff5d53'))}finally{Math.random=old}
});

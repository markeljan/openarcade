import test from 'node:test';import assert from 'node:assert/strict';import {dune,duneGround} from '../src/feature-games27.js';
test('manual takeover restores a later well without losing earlier oasis state',()=>{
 const old=Math.random;Math.random=()=>.5;try{const g=dune();let s;for(let i=0;i<8000;i++){g.update(1/60,true);s=g.snapshot();if(s.nextStop===4&&s.relay?.index===2)break}assert.equal(s.nextStop,4);assert.equal(s.relay.index,2);assert.ok(s.wells>=2);const earlier=s.wellSites.filter(w=>w.filled).map(w=>w.id),well=s.wellSites[2];
 for(let i=0;i<1800&&!g.snapshot().wellSites[2].filled;i++){s=g.snapshot();const dx=well.x-s.hero.x,dy=well.y-s.hero.y;for(const [k,on]of[['ArrowLeft',dx< -3],['ArrowRight',dx>3],['ArrowUp',dy< -3],['ArrowDown',dy>3]])g.input(k,on);g.update(1/60,false)}
 s=g.snapshot();assert.ok(s.wellSites[2].filled);assert.equal(s.manualScore,145);assert.ok(earlier.every(id=>s.wellSites.find(w=>w.id===id).filled));assert.equal(s.wellSites.length,48);assert.deepEqual(s.wellSites.slice(0,4).map(w=>w.station),[0,2,4,6]);
 }finally{Math.random=old}
});
test('AI keeps restoring distinct later wells and retains their water',()=>{
 const old=Math.random;try{for(let seed=1;seed<=3;seed++){let n=seed;Math.random=()=>((n=(Math.imul(n,1664525)+1013904223)>>>0)/4294967296);const g=dune();for(let i=0;i<7200;i++)g.update(1/60,true);const s=g.snapshot(),done=s.wellSites.filter(w=>w.filled);assert.ok(done.length>2);assert.equal(s.wells,done.length);assert.equal(new Set(done.map(w=>w.id)).size,done.length);assert.ok(done.every(w=>w.water===2.24));assert.ok(s.deliveries>3)}}finally{Math.random=old}
});
test('sky and guide star follow dusk, night, dawn and day',()=>{
 const g=dune(),noop=()=>{},paint=[],ctx=new Proxy({fillRect(){paint.push(ctx.fillStyle)}},{get:(o,k)=>o[k]??noop,set:(o,k,v)=>(o[k]=v,true)});
 function check(expected,stars,dark){paint.length=0;g.draw(ctx);const s=g.snapshot();assert.equal(s.night,expected);assert.equal(s.guideStarVisible,stars);assert.equal(paint.includes('#a8ecd9'),stars);assert.equal(paint.includes('#303c5a'),dark)}
 function advance(n){for(let i=0;i<n;i++)g.update(1/60,false)}
 check('dusk',true,false);advance(215);check('night',true,true);advance(440);check('dawn',false,false);advance(120);check('day',false,false);advance(150);check('dusk',true,false);
});

test('manual travel scrolls world objects while keeping their world coordinates',()=>{
 const g=dune(), initial=g.snapshot(), well=initial.wellSites[0];g.input('ArrowRight',true);
 for(let i=0;i<220;i++)g.update(1/60,false);g.input('ArrowRight',false);
 const s=g.snapshot();assert.ok(s.hero.x>320);assert.ok(s.camera>0);
 assert.deepEqual(s.wellSites[0],well);assert.equal(s.wellSites[1].x-s.wellSites[0].x,432);
 const offsets=[],noop=()=>{},ctx=new Proxy({translate(x,y){offsets.push([x,y])}},{get:(o,k)=>o[k]??noop,set:(o,k,v)=>(o[k]=v,true)});
 g.draw(ctx);assert.ok(offsets.some(([x,y])=>x===-s.camera&&y===0));
});

test('horizontal motion accelerates and coasts after release while lane motion stays independent',()=>{
 const g=dune();g.input('ArrowRight',true);g.update(1/60,false);const first=g.snapshot();for(let i=0;i<20;i++)g.update(1/60,false);const moving=g.snapshot();assert.ok(first.hero.vx>0);assert.ok(moving.hero.vx>first.hero.vx);g.input('ArrowRight',false);g.update(1/60,false);const coast=g.snapshot();assert.ok(coast.hero.x>moving.hero.x);assert.ok(coast.hero.vx>0&&coast.hero.vx<moving.hero.vx);
});
test('dune and ridge paths scroll as the camera advances',()=>{
 const g=dune(),paths=[],noop=()=>{},ctx=new Proxy({moveTo(x,y){paths.push([x,y])},lineTo(x,y){paths.push([x,y])}},{get:(o,k)=>o[k]??noop,set:(o,k,v)=>(o[k]=v,true)});
 g.draw(ctx);const first=paths.map(p=>p.join(',')).join(';');paths.length=0;g.input('ArrowRight',true);for(let i=0;i<180;i++)g.update(1/60,false);g.input('ArrowRight',false);assert.ok(g.snapshot().camera>100);g.draw(ctx);assert.notEqual(paths.map(p=>p.join(',')).join(';'),first);
});

test('caravan rendering follows world terrain while gameplay lanes remain stable',()=>{
 const g=dune(),noop=()=>{},stack=[];let tx=0,ty=0,camel;const ctx=new Proxy({save(){stack.push([tx,ty])},restore(){[tx,ty]=stack.pop()},translate(x,y){tx+=x;ty+=y},arc(x,y){if(ctx.fillStyle==='#b9784e')camel={x:x+tx,y:y+ty}}},{get:(o,k)=>o[k]??noop,set:(o,k,v)=>(o[k]=v,true)});
 for(const frames of [0,140]){if(frames){g.input('ArrowRight',true);for(let i=0;i<frames;i++)g.update(1/60,false);g.input('ArrowRight',false)}g.draw(ctx);const s=g.snapshot();assert.ok(Math.abs(camel.x-(s.hero.x-s.camera))<1e-8);assert.ok(Math.abs(camel.y-(duneGround(s.hero.x)+s.hero.y-428))<1e-8)}
});

test('AI sails toward the outpost in daylight instead of waiting at a dark well',()=>{
 const old=Math.random;Math.random=()=>.5;try{const g=dune();for(let i=0;i<771;i++)g.update(1/60,false);const w=g.snapshot().wellSites[0];for(let i=0;i<500;i++){const s=g.snapshot(),dx=w.x-45-s.hero.x,dy=w.y-s.hero.y;if(Math.hypot(dx,dy)<5)break;for(const [k,on] of [['ArrowRight',dx>4],['ArrowLeft',dx< -4],['ArrowDown',dy>4],['ArrowUp',dy< -4]])g.input(k,on);g.update(1/60,false)}for(const k of ['ArrowRight','ArrowLeft','ArrowDown','ArrowUp'])g.input(k,false);for(let i=0;i<100&&g.snapshot().storm.phase!=='calm';i++)g.update(1/60,false);const before=g.snapshot();assert.equal(before.night,'day');assert.equal(before.relay,null);assert.equal(before.storm.phase,'calm');g.update(1/60,true);const after=g.snapshot();assert.ok(after.hero.y<before.hero.y);assert.equal(after.relay,null)}finally{Math.random=old}
});

test('storm chooses a reachable forward lee instead of a rock already passed',()=>{
 const old=Math.random;Math.random=()=>.5;try{const g=dune();g.input('ArrowRight',true);for(let i=0;i<65;i++)g.update(1/60,false);g.input('ArrowRight',false);for(let i=0;i<200&&g.snapshot().storm.phase==='calm';i++)g.update(1/60,false);const s=g.snapshot();assert.equal(s.storm.phase,'warning');assert.ok(s.caravan.shadow.rock.x+14>=s.hero.x-24);assert.equal(s.caravan.shadow.rock.x,282)}finally{Math.random=old}
});

test('AI dodges dust devil across its lane while continuing forward',()=>{
 const old=Math.random;Math.random=()=>.1;try{const g=dune();let before,after;for(let i=0;i<7200;i++){before=g.snapshot();g.update(1/60,true);after=g.snapshot();if(after.aiTactic==='dodge'&&before.devil?.phase==='windup'){break}}assert.equal(after.aiTactic,'dodge');assert.equal(after.storm.phase,'calm');const target=before.devil.y>414.3?385.92:440.1;assert.ok((after.hero.y-before.hero.y)*(target-before.hero.y)>0);assert.ok(after.hero.vx>before.hero.vx||after.hero.vx>0);for(let i=0;i<60;i++)g.update(1/60,true);assert.ok(g.snapshot().dodges>0)}finally{Math.random=old}
});

test('caravan tail follows behind the current direction after a manual reversal',()=>{
 const g=dune();g.input('ArrowRight',true);for(let i=0;i<150;i++)g.update(1/60,false);g.input('ArrowRight',false);let s=g.snapshot();assert.equal(s.hero.face,1);assert.ok(s.caravan.tail.x<s.hero.x);g.input('ArrowLeft',true);for(let i=0;i<100;i++)g.update(1/60,false);g.input('ArrowLeft',false);s=g.snapshot();assert.equal(s.hero.face,-1);assert.ok(s.caravan.tail.x>s.hero.x);assert.ok(Number.isFinite(s.caravan.tail.vx));
});
test('AI deliveries open reference biome palettes every three deliveries',()=>{
 const old=Math.random;Math.random=()=>.5;try{const g=dune();assert.equal(g.snapshot().biome,'SAFFRON REACH');for(let i=0;i<7200&&g.snapshot().deliveries<3;i++)g.update(1/60,true);const s=g.snapshot();assert.equal(s.deliveries,3);assert.equal(s.biome,'RUST ARCHES');const fills=[],noop=()=>{},ctx=new Proxy({fill(){fills.push(ctx.fillStyle)}},{get:(o,k)=>o[k]??noop,set:(o,k,v)=>(o[k]=v,true)});g.draw(ctx);assert.ok(fills.includes('#dc9870'));assert.ok(fills.includes('#b96950'))}finally{Math.random=old}
});

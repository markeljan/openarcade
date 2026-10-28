import test from 'node:test';
import assert from 'node:assert/strict';
import {createTowerGame} from '../src/feature-games11.js';
const seeded=fn=>{const old=Math.random;Math.random=()=>.5;try{fn()}finally{Math.random=old}};
const advance=(g,seconds,auto=false)=>{for(let t=0;t<seconds;t+=.02)g.update(.02,auto)};

test('gantry movement requires a connected ladder and takes time',()=>seeded(()=>{
 const g=createTowerGame(), initial=g.snapshot(), start=initial.hero.node, c=start%6;
 assert.equal(initial.layout.ladders.length,5);
 assert.ok(initial.layout.ladders.every(row=>row.length===2));
 if(!initial.layout.ladders[0].includes(c)){
  g.input('ArrowUp',true);advance(g,.2);g.input('ArrowUp',false);
  assert.equal(g.snapshot().hero.node,start);
 }
 const ladder=initial.layout.ladders[0].slice().sort((a,b)=>Math.abs(a-c)-Math.abs(b-c))[0];
 const key=ladder>c?'ArrowRight':'ArrowLeft';g.input(key,true);advance(g,Math.abs(ladder-c)*.51);g.input(key,false);
 // Let the current edge finish before climbing.
 advance(g,.5);assert.equal(g.snapshot().hero.node%6,ladder);
 g.input('ArrowUp',true);advance(g,.4);g.input('ArrowUp',false);
 let s=g.snapshot();assert.equal(s.hero.f,0);assert.ok(s.hero.y<612&&s.hero.y>516);
 advance(g,1);s=g.snapshot();assert.equal(s.hero.f,1);
}));

test('automated rescue reaches the rooftop and runs a timed extraction',()=>seeded(()=>{
 const g=createTowerGame();let s;
 for(let i=0;i<20000;i++){g.update(.02,true);s=g.snapshot();if(s.mode==='extract')break}
 assert.equal(s.mode,'extract');assert.equal(s.workers.filter(w=>w.joined).length,4);assert.equal(s.score,0,'preview does not accrue a player score');
 assert.equal(s.hero.node,34);assert.ok(s.extractT>2.9);assert.equal(s.extractions,1);
 const before=s.score, startX=s.hero.x, startClock=s.clock, startShow=s.showClock, startAct=s.act.time, barrelAges=s.rocks.map(r=>r.age);g.update(.08,true);s=g.snapshot();assert.equal(s.clock,startClock,'opening presentation holds physics');assert.equal(s.extractT,3);assert.ok(s.act.time<startAct,'cascade clock continues during hold');advance(g,.92,true);s=g.snapshot();assert.equal(s.mode,'extract');assert.ok(Math.abs(s.clock-startClock-(.5+.4/3))<.04,'hold and slow physics advance on the simulation clock');assert.ok(s.act.time<startAct-.99,'cascade uses the presentation clock');assert.ok(s.rocks.some(r=>barrelAges.some(age=>Math.abs(r.age-age-(.5+.4/3))<.04)),'barrels share the slowed physics clock');assert.notEqual(s.hero.x,startX);advance(g,.5,true);assert.ok(Math.abs(g.snapshot().hero.x-160)<1);advance(g,1,true);assert.ok(g.snapshot().hero.y<138);
 advance(g,1.1,true);s=g.snapshot();assert.equal(s.stage,1);assert.equal(s.mode,'climb');assert.equal(s.score,before,'preview extraction does not accrue a player score');assert.ok(s.clock>=startClock+3,'run clock continues across the tower');assert.ok(Math.abs(s.act.time-(startAct-(s.showClock-startShow)))<.08,'cascade countdown continues across the tower');assert.ok(s.rocks.some(r=>r.age>=183/60),'new tower starts with the reference pre-aged barrel');const f=s.fires[0];assert.equal(f.active,s.clock>=f.suppressedUntil&&((s.clock*60+f.phase)%420)<112,'new hazards use the continuing run clock');
}));

test('cascade warns before releasing multiple rolling barrels',()=>seeded(()=>{
 const g=createTowerGame();advance(g,25.1);let s=g.snapshot();assert.equal(s.act.phase,'warn');
 advance(g,4.1);s=g.snapshot();assert.equal(s.act.phase,'live');assert.ok(s.rocks.length>=3);
 assert.ok(s.rocks.some(r=>!r.falling));
}));


test('fire cycles and can be suppressed by a brace',()=>{
 const old=Math.random;Math.random=()=>0;try{
  const g=createTowerGame();let s=g.snapshot();assert.equal(s.fires[0].c,1);assert.equal(s.fires[0].active,true);
  g.input('ArrowRight',true);advance(g,.02);g.input('ArrowRight',false);g.input('z',true);advance(g,.8);
  s=g.snapshot();assert.equal(s.health,3);assert.equal(s.notice,'RAIL HOLDS');assert.equal(s.score,8,'deflection awards reference event points');assert.equal(s.fires[0].active,false);
  advance(g,2.6);assert.equal(g.snapshot().fires[0].active,false,'the initial fire cycle has ended');
  g.input('z',false);g.input('ArrowLeft',true);advance(g,.6);g.input('ArrowLeft',false);advance(g,3.4);assert.equal(g.snapshot().fires[0].active,true,'fire returns on its seven-second cycle');
 }finally{Math.random=old}
});

test('fire damages an unbraced rigger and machine presses cycle',()=>{
 const old=Math.random;Math.random=()=>0;try{
  const g=createTowerGame();g.input('ArrowRight',true);advance(g,.7);g.input('ArrowRight',false);
  let s=g.snapshot();assert.equal(s.health,2);assert.equal(s.notice,'TOO HOT');
  const before=s.machines[0].reach;advance(g,4.5);s=g.snapshot();assert.notEqual(s.machines[0].reach,before);
 }finally{Math.random=old}
});



function reachFirstPress(g){
 g.input('ArrowUp',true);advance(g,.02);g.input('ArrowUp',false);advance(g,1.3);
 g.input('ArrowRight',true);advance(g,.02);g.input('ArrowRight',false);advance(g,.6);
 assert.equal(g.snapshot().hero.node,7);
}

test('press strikes an unprotected rigger but brace prevents damage',()=>{
 const old=Math.random;Math.random=()=>0;try{
  const hit=createTowerGame();reachFirstPress(hit);advance(hit,4);let s=hit.snapshot();
  assert.equal(s.health,2);assert.equal(s.notice,'PRESS HIT');
  const guarded=createTowerGame();reachFirstPress(guarded);guarded.input(' ',true);advance(guarded,4);s=guarded.snapshot();
  assert.equal(s.health,3);assert.equal(s.notice,'RAIL HOLDS');
 }finally{Math.random=old}
});



test('AI routes around active fire to reach a worker and retains its path',()=>{
 const old=Math.random;Math.random=()=>0;try{const g=createTowerGame();g.update(.02,true);let s=g.snapshot();assert.equal(s.fires[0].active,true);assert.equal(s.fires[0].c,1);assert.equal(s.workers[0].node,7);assert.equal(s.hero.to,6,'climb around the burning ground node');assert.deepEqual(s.route.slice(0,2),[6,7]);advance(g,1.4,true);s=g.snapshot();assert.equal(s.hero.node,6);assert.ok(s.hero.to===7||s.workers[0].joined)}finally{Math.random=old}
});

test('manual assist remains active only while Z is held',()=>{
 const old=Math.random;Math.random=()=>0;try{const g=createTowerGame();g.input('z',true);assert.equal(g.snapshot().assist,1);g.input('ArrowRight',true);advance(g,.6);g.input('ArrowRight',false);assert.equal(g.snapshot().health,3);g.input('z',false);assert.equal(g.snapshot().assist,0)}finally{Math.random=old}
});

test('hazard forecast changes with arrival time and adds purge-column risk',()=>{
 const old=Math.random;Math.random=()=>0;try{const g=createTowerGame();assert.equal(g.forecast(1,.2),2,'fire is active at the predicted arrival');assert.equal(g.forecast(1,2),0,'fire has ended at the later arrival');assert.equal(g.forecast(7,.3),1.5,'press reaches the landing at the predicted time');for(let i=0;i<1255;i++)g.update(.02,false);const s=g.snapshot();assert.equal(s.act.phase,'warn');const n=s.act.purgeCol;assert.ok(g.forecast(n,0)>=520/60,'warned column receives the reference penalty') }finally{Math.random=old}
});

test('barrel forecast follows its rolling path across the roof',()=>{
 const old=Math.random;Math.random=()=>0;try{const g=createTowerGame();advance(g,4.22);const s=g.snapshot();assert.ok(s.rocks.length);assert.ok(g.forecast(30,0)>0);assert.equal(g.forecast(35,0),0);assert.ok(g.forecast(35,2.8)>0);assert.equal(g.forecast(30,2.8),0)}finally{Math.random=old}
});

test('rescue and convoy cues lead into a higher-priority extraction presentation',()=>seeded(()=>{
 const g=createTowerGame(),seen=new Set();let s;
 for(let i=0;i<20000;i++){g.update(.02,true);s=g.snapshot();if(s.show.active)seen.add(s.show.active.id);if(s.mode==='extract')break}
 assert.ok(seen.has('rescue'));assert.ok(seen.has('convoy'));assert.equal(s.show.active?.id,'extraction');assert.equal(s.show.active?.tier,3);assert.ok(s.show.offered>=5);assert.ok(s.show.shown>=3);
}));


test('an active cascade survives a tower transition',()=>{
 const old=Math.random;Math.random=()=>.35;try{const g=createTowerGame();let previous,s;for(let i=0;i<100000;i++){previous=s;g.update(.02,true);s=g.snapshot();if(previous&&s.stage>previous.stage&&previous.act.phase==='warn')break}assert.ok(s.stage>0);assert.equal(previous.mode,'extract');assert.equal(previous.act.phase,'warn');assert.equal(s.act.phase,'warn');assert.ok(s.act.time<previous.act.time);assert.ok(s.clock>=previous.clock)}finally{Math.random=old}
});

test('fresh run and reset start with the pre-aged opening barrel',()=>{
 const g=createTowerGame();for(const s of [g.snapshot(),(g.reset(),g.snapshot())]){assert.equal(s.stage,0);assert.equal(s.clock,0);assert.equal(s.rocks.length,1);assert.equal(s.rocks[0].dir,-1);assert.ok(Math.abs(s.rocks[0].age-170/60)<1e-9);assert.equal(s.rocks[0].f,5)}
});

test('manual convoy uses the same time delay at 30 and 60 updates per second',()=>{
 const old=Math.random;Math.random=()=>0;try{function run(dt){const g=createTowerGame();g.input('z',true);g.input('ArrowUp',true);g.update(dt,false);g.input('ArrowUp',false);for(let i=0;i<Math.round(1.3/dt);i++)g.update(dt,false);g.input('ArrowRight',true);for(let i=0;i<Math.round(.8/dt);i++)g.update(dt,false);return g.snapshot()}const a=run(1/30),b=run(1/60);assert.ok(a.workers[0].joined&&b.workers[0].joined);assert.ok(Math.abs(a.workers[0].x-b.workers[0].x)<2);assert.ok(a.hero.x-a.workers[0].x>15);assert.ok(b.hero.x-b.workers[0].x>15)}finally{Math.random=old}
});

test('out-of-order rescues preserve the order workers joined the convoy',()=>{
 const old=Math.random;Math.random=()=>2/30;try{const g=createTowerGame(),order=[];for(let i=0;i<5000&&order.length<2;i++){g.update(.033,true);for(const w of g.snapshot().workers)if(w.joined&&!order.includes(w.id))order.push(w.id)}const s=g.snapshot();assert.deepEqual(order,[1,0]);assert.equal(s.workers[1].join,0);assert.equal(s.workers[0].join,1);for(let i=0;i<30;i++)g.update(.033,true);const next=g.snapshot();assert.equal(next.workers[1].join,0);assert.equal(next.workers[0].join,1)}finally{Math.random=old}
});


test('manual rescue and extraction earn the reference points',()=>seeded(()=>{
 const g=createTowerGame();g.input('z',true);let s;
 for(let attempt=0;attempt<180;attempt++){
  s=g.snapshot();if(s.mode==='extract')break;if(s.hero.move>0||s.stun>0){g.update(.02,false);continue}
  const goals=s.workers.filter(w=>!w.joined).map(w=>w.node);if(!goals.length)goals.push(34);
  const seen=new Set([s.hero.node]),queue=[[s.hero.node,[]]];let path=[];
  while(queue.length){const [n,route]=queue.shift();if(goals.includes(n)){path=route;break}const f=Math.floor(n/6),c=n%6,near=[];if(c>0&&!s.layout.gaps.includes(`${f}:${c-1}`))near.push(n-1);if(c<5&&!s.layout.gaps.includes(`${f}:${c}`))near.push(n+1);if(f>0&&s.layout.ladders[f-1].includes(c))near.push(n-6);if(f<5&&s.layout.ladders[f].includes(c))near.push(n+6);for(const next of near)if(!seen.has(next)){seen.add(next);queue.push([next,[...route,next]])}}
  assert.ok(path.length);const next=path[0],delta=next-s.hero.node,key=delta===6?'ArrowUp':delta===-6?'ArrowDown':delta===1?'ArrowRight':'ArrowLeft';g.input(key,true);g.update(.02,false);g.input(key,false);for(let n=0;n<100&&g.snapshot().hero.move>0;n++)g.update(.02,false);
 }
 s=g.snapshot();assert.equal(s.mode,'extract');assert.ok(s.score>=4*35+5*10+180);const before=s.score;for(let i=0;i<220&&g.snapshot().stage===0;i++)g.update(.02,false);s=g.snapshot();assert.equal(s.stage,1);assert.ok(s.score>=before+250);
}));
test('scheduled barrels alternate direction for both manual and AI play',()=>{const old=Math.random;Math.random=()=>0;try{for(const auto of [false,true]){const g=createTowerGame();for(let i=0;i<211;i++)g.update(.02,auto);let s=g.snapshot();assert.equal(s.rocks.at(-1).dir,1);for(let i=0;i<210;i++)g.update(.02,auto);s=g.snapshot();assert.equal(s.rocks.at(-1).dir,-1)}}finally{Math.random=old}});
test('moving smart AI assists through a hazard without losing health',()=>{const old=Math.random;Math.random=()=>0;try{const events=[],g=createTowerGame(e=>events.push(e));let deflected=false;for(let i=0;i<5000&&!deflected;i++){const a=g.snapshot(),n=events.length;g.update(.02,true);const b=g.snapshot();if(a.hero.move>0&&events.slice(n).includes('tower-deflect')){deflected=true;assert.equal(b.assist,1);assert.equal(b.hero.health,a.hero.health)}}assert.ok(deflected,'AI must actually meet and deflect a hazard')}finally{Math.random=old}});

test('seeded AI profiles pause during short lapses but continue rescuing',()=>{
 const old=Math.random;try{for(const [random,name] of [[0,'SMOKE READER'],[1/8388606,'HOT SHOT'],[2/8388606,'LINE CHIEF']]){Math.random=()=>random;assert.equal(createTowerGame().snapshot().profile.name,name)}Math.random=()=>0;const g=createTowerGame();let lapse;
 for(let i=0;i<5000;i++){g.update(1/60,true);const s=g.snapshot();if(s.profile.lapsed){lapse=s;break}}
 assert.ok(lapse);assert.equal(lapse.profile.lapses,1);assert.ok(lapse.profile.lapseUntil-lapse.clock<=22/60);assert.ok(lapse.profile.lapseUntil-lapse.clock>0);assert.equal(lapse.assist,0);const count=lapse.profile.lapses;for(let i=0;i<60;i++)g.update(1/60,true);assert.ok(!g.snapshot().profile.lapsed);assert.equal(g.snapshot().profile.lapses,count);
 }finally{Math.random=old}
});

test('fire reignition and machine impact sounds follow simulation time in manual and AI play',()=>{
 const old=Math.random;Math.random=()=>0;try{for(const auto of [false,true]){const events=[],g=createTowerGame(e=>events.push(e));events.length=0;for(let i=0;i<26;i++)g.update(1/60,auto);assert.equal(events.filter(e=>e==='tower-press').length,0);for(let i=0;i<2;i++)g.update(1/60,auto);assert.equal(events.filter(e=>e==='tower-press').length,1);for(let i=0;i<65;i++)g.update(1/60,auto);assert.equal(events.filter(e=>e==='tower-fire').length,1)}}finally{Math.random=old}
});

test('decorative broken ladders cannot be climbed in manual play',()=>{
 const old=Math.random;Math.random=()=>0;try{const g=createTowerGame();g.input('z',true);const first=g.snapshot(),col=first.layout.broken[0];assert.ok(!first.layout.ladders[0].includes(col));
 for(let i=0;i<col;i++){g.input('ArrowRight',true);g.update(.02,false);g.input('ArrowRight',false);for(let n=0;n<100&&g.snapshot().hero.move>0;n++)g.update(.02,false)}
 let s=g.snapshot();assert.equal(s.hero.node,col);g.input('ArrowUp',true);for(let i=0;i<30;i++)g.update(.02,false);g.input('ArrowUp',false);s=g.snapshot();assert.equal(s.hero.node,col);assert.equal(s.hero.move,0);
 }finally{Math.random=old}
});

test('AI advances through named reference zones and renders distinct workers',()=>{
 const old=Math.random;Math.random=()=>0;try{const g=createTowerGame();let s=g.snapshot();assert.equal(s.zone.name,'BOILER WORKS');assert.equal(s.zone.code,'B4');assert.ok(s.layout.broken.every((c,i)=>!s.layout.ladders[i].includes(c)));
 const colors=[],labels=[],noop=()=>{},c=new Proxy({fillRect(){colors.push(c.fillStyle)},fillText(v){labels.push(v)}},{get:(o,k)=>o[k]??noop,set:(o,k,v)=>(o[k]=v,true)});g.draw(c);assert.ok(colors.includes(s.zone.sky));assert.ok(['#315e83','#386856','#7b4139','#554a83'].every(color=>colors.includes(color)));assert.ok(labels.some(v=>v.includes('BOILER WORKS')));
 for(let i=0;i<20000&&g.snapshot().stage===0;i++)g.update(.02,true);s=g.snapshot();assert.equal(s.stage,1);assert.equal(s.zone.name,'DYNAMO SPIRE');assert.ok(s.layout.broken.every((c,i)=>!s.layout.ladders[i].includes(c)));
 }finally{Math.random=old}
});

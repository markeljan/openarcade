import test from 'node:test';import assert from 'node:assert/strict';import {garden,gardenApplyBite,gardenAdvanceShots} from '../src/feature-games8.js';
function withRandom(value,fn){const old=Math.random;Math.random=()=>value;try{fn()}finally{Math.random=old}}
function advance(g,seconds,auto=false){for(let i=0;i<Math.ceil(seconds*60);i++)g.update(1/60,auto)}
test('wave roster is announced before spawning and advances on its timer',()=>withRandom(.3,()=>{const g=garden();let s=g.snapshot();assert.equal(s.wave,1);assert.equal(s.plan.length,4);assert.equal(s.zombies.length,0);assert.deepEqual(s.plants.map(p=>p.type).sort(),['pea','pea','pea','pea','sun','sun','wall','wall'].sort());advance(g,4.9);assert.equal(g.snapshot().zombies.length,0);advance(g,.3);s=g.snapshot();assert.equal(s.wave,1);assert.equal(s.zombies.length,1);assert.equal(s.zombies[0].kind,'hound');advance(g,10);assert.equal(g.snapshot().wave,2)}));
test('manual controls build only in empty beds and do not lift or select moon caps',()=>withRandom(.3,()=>{
 const g=garden();g.input(' ',true);advance(g,1);let s=g.snapshot();assert.equal(s.carried,null);assert.equal(s.gardener.task,null);assert.ok(s.plants.some(p=>p.lane===0&&p.col===0&&p.type==='sun'));
 g.input('ArrowDown',true);g.input('ArrowRight',true);g.input('c',true);assert.equal(g.snapshot().gardener.task,null);
 g.input(' ',true);s=g.snapshot();assert.equal(s.gardener.task.type,'pea');assert.ok(!s.plants.some(p=>p.lane===1&&p.col===1));advance(g,.2);assert.ok(g.snapshot().gardener.x>48);advance(g,2);s=g.snapshot();assert.ok(s.plants.some(p=>p.lane===1&&p.col===1&&p.type==='pea'));assert.ok(s.score>=11);
}));
test('thorn wall damages biting enemies and barrow precedes greenhouse breach',()=>withRandom(.3,()=>{const g=garden();advance(g,16.33);let s=g.snapshot();const wall=s.plants.find(p=>p.lane===1&&p.type==='wall');assert.ok(wall.hp<20,'wall must absorb bites');assert.ok(s.zombies.some(z=>z.lane===1&&z.hp<4),'thorn must damage the attacker');let saved=false;for(let i=0;i<60*400;i++){g.update(1/60,false);s=g.snapshot();saved ||= s.barrows[1].active;if(s.breaches)break}assert.ok(saved,'barrow must launch');assert.ok(s.breaches>0);assert.ok(s.greenhouse<200)}));
test('AI holds real waves and manual terminal screen remains until restart',()=>withRandom(.3,()=>{const g=garden();advance(g,75,true);let s=g.snapshot();assert.ok(s.wave>=5);assert.ok(s.score>0);assert.ok(s.wavesHeld>0);advance(g,826,false);s=g.snapshot();assert.ok(s.ended);const saved=s.score;advance(g,5,false);assert.equal(g.snapshot().score,saved);advance(g,7.1,true);assert.equal(g.snapshot().ended,false);g.reset();assert.equal(g.snapshot().wave,1)}));


test('blood moon warns before empowering one lane and then passes',()=>withRandom(.3,()=>{const g=garden();advance(g,70.1);let s=g.snapshot();assert.equal(s.moon.phase,'warn');const lane=s.moon.lane;advance(g,4.1);s=g.snapshot();assert.equal(s.moon.phase,'live');assert.equal(s.moon.lane,lane);advance(g,11);s=g.snapshot();assert.ok(s.zombies.some(z=>z.moon&&z.lane===lane),'target lane should spawn empowered enemies');advance(g,4.1);assert.equal(g.snapshot().moon.phase,'calm')}));

test('AI can plant a moon cap and fire a heavier shot',()=>withRandom(.3,()=>{const g=garden();let found=false;for(let i=0;i<60*35;i++){g.update(1/60,true);const s=g.snapshot();if(s.shots.some(q=>q.kind==='moon'&&q.damage===1.65)){found=true;break}}assert.ok(found)}));

test('AI forecasts the announced roster and physically shifts a defense to a threatened lane',()=>withRandom(.3,()=>{
 const g=garden();g.update(1/60,true);let s=g.snapshot();
 assert.equal(s.gardener.task.action,'build');assert.equal(s.gardener.task.lane,1,'focus lane receives the first defense before enemies spawn');assert.equal(s.gardener.task.col,1);assert.equal(s.zombies.length,0);
 let move,placed=false;
 for(let i=0;i<60*230;i++){
  g.update(1/60,true);s=g.snapshot();const task=s.gardener.task;
  if(!move&&task?.action==='lift'&&task.destination)move={source:{lane:task.lane,col:task.col},dest:{...task.destination}};
  if(move&&!s.gardener.task&&!s.carried&&s.plants.some(p=>p.lane===move.dest.lane&&p.col===move.dest.col)){placed=true;break}
 }
 assert.ok(move,'planner should rebalance a healthy defense');assert.notEqual(move.source.lane,move.dest.lane);assert.ok(placed,'gardener must finish the transplant');
}));




test('manual sunblooms wait their bed-specific initial delay and then produce every 330 frames',()=>withRandom(.3,()=>{
 const g=garden();let s=g.snapshot();assert.equal(s.plants.find(p=>p.type==='sun'&&p.lane===0).cool,3);assert.equal(s.plants.find(p=>p.type==='sun'&&p.lane===2).cool,254/60);
 advance(g,2.9);assert.equal(g.snapshot().score,0);advance(g,.2);assert.equal(g.snapshot().score,2);
 g.input('ArrowDown',true);g.input('ArrowDown',true);g.input('ArrowDown',true);g.input('ArrowRight',true);g.input('z',true);
 let p;for(let i=0;i<60*8;i++){g.update(1/60,false);p=g.snapshot().plants.find(q=>q.type==='sun'&&q.lane===3&&q.col===1);if(p)break}assert.ok(p,'gardener plants a sunbloom');const initial=(180+(3*37+29)%160)/60;assert.ok(p.cool<=initial&&p.cool>=initial-2/60);
 const first=p.cool;advance(g,first-.1);p=g.snapshot().plants.find(q=>q.type==='sun'&&q.lane===3&&q.col===1);assert.ok(p.cool>0&&p.cool<.2);advance(g,.15);p=g.snapshot().plants.find(q=>q.type==='sun'&&q.lane===3&&q.col===1);assert.ok(p.cool>5.3&&p.cool<=5.5);
 advance(g,5.25);p=g.snapshot().plants.find(q=>q.type==='sun'&&q.lane===3&&q.col===1);assert.ok(p.cool>0&&p.cool<.3);advance(g,.3);p=g.snapshot().plants.find(q=>q.type==='sun'&&q.lane===3&&q.col===1);assert.ok(p.cool>5.2&&p.cool<=5.5);
}));
test('AI-planted sunbloom gets the same bed-specific initial production timer',()=>{
 let seed=42;const old=Math.random;Math.random=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/2**32);try{
  const g=garden();let plant;for(let i=0;i<60*500;i++){g.update(1/60,true);if(i%6===0){const s=g.snapshot();plant=s.plants.find(p=>p.type==='sun'&&!(p.lane===0&&p.col===0)&&!(p.lane===2&&p.col===0));if(plant)break}}
  assert.ok(plant,'AI should plant a replacement sunbloom');const expected=(180+(plant.lane*37+plant.col*29)%160)/60;assert.ok(plant.cool<=expected&&plant.cool>=expected-.12);
 }finally{Math.random=old}
});

test('one second of uninterrupted biting uses each reference enemy damage rate',()=>{
 for(const [kind,damage] of [['shambler',1.02],['hound',1.26],['bucket',1.44],['brute',2.415]]){
  const plant={type:'wall',hp:20},enemy={kind,hp:30};for(let i=0;i<60;i++)gardenApplyBite(plant,enemy,1/60);
  assert.ok(Math.abs(plant.hp-(20-damage))<1e-9,`${kind} bite damage`);assert.ok(Math.abs(enemy.hp-(30-1.92))<1e-9,`${kind} receives thorn damage`);
 }
 const pea={type:'pea',hp:9},brute={kind:'brute',hp:22};gardenApplyBite(pea,brute,.5);assert.ok(Math.abs(pea.hp-(9-1.2075))<1e-9);assert.equal(brute.hp,22);
});


test('shots hit the nearest living enemy regardless of array order and cannot skip at low frame rate',()=>{
 const front={x:120,lane:0,hp:2},rear={x:140,lane:0,hp:4},otherLane={x:110,lane:1,hp:4};
 const remaining=gardenAdvanceShots([{x:80,lane:0,kind:'pea',damage:1}],[rear,otherLane,front],.5);
 assert.equal(front.hp,1);assert.equal(rear.hp,4);assert.equal(otherLane.hp,4);assert.equal(remaining.length,0);
});
test('moon shots splash nearby living enemies, while multiple shots can hit in one frame',()=>{
 const front={x:120,lane:0,hp:5},near={x:140,lane:0,hp:5},far={x:155,lane:0,hp:5};
 gardenAdvanceShots([{x:100,lane:0,kind:'moon',damage:1.65},{x:100,lane:0,kind:'pea',damage:1}],[near,front,far],.2);
 assert.ok(Math.abs(front.hp-2.35)<1e-9);assert.equal(near.hp,4.45);assert.equal(far.hp,5);
});
test('every seventh wave redirects the first three forecast attackers to the neighboring lane',()=>withRandom(.3,()=>{
 const game=garden();advance(game,90);const s=game.snapshot();assert.equal(s.wave,7);assert.deepEqual(s.plan.slice(0,3).map(q=>q.lane),[2,2,2]);
}));

test('zero greenhouse stays lost through repairs and dawn ends on wave 60',()=>withRandom(.3,()=>{
 const g=garden();let zeroAt=0;for(let i=0;i<60*850;i++){g.update(1/60,false);if(i%30===0&&g.snapshot().greenhouse===0){zeroAt=i/60;break}}
 assert.ok(zeroAt>0,'unattended garden must reach zero');advance(g,40);let s=g.snapshot();assert.equal(s.greenhouse,0,'chapter repair must not revive a lost greenhouse');assert.equal(s.ended,false,'the match continues until dawn');
 for(let i=0;i<60*900&&!g.snapshot().ended;i++)g.update(1/60,false);s=g.snapshot();assert.equal(s.wave,60);assert.equal(s.notice,'GARDEN LOST');assert.equal(s.greenhouse,0);
}));
test('AI waits seven seconds on the dawn result before resetting',()=>withRandom(.3,()=>{
 const g=garden();advance(g,900,false);assert.equal(g.snapshot().ended,true);advance(g,6.9,true);assert.equal(g.snapshot().ended,true);advance(g,.2,true);assert.equal(g.snapshot().ended,false);assert.equal(g.snapshot().wave,1);
}));

test('passive sun arrives in two-unit ticks each second and remains capped',()=>withRandom(.3,()=>{
 const g=garden();advance(g,.5);assert.equal(g.snapshot().sun,130);advance(g,.5);assert.equal(g.snapshot().sun,132);advance(g,60);assert.equal(g.snapshot().sun,300);advance(g,3);assert.equal(g.snapshot().sun,300);
}));
test('blood moon warning repeats 120 seconds after the previous warning',()=>withRandom(.3,()=>{
 const g=garden();advance(g,70.1);assert.equal(g.snapshot().moon.phase,'warn');advance(g,19);assert.equal(g.snapshot().moon.phase,'calm');assert.equal(g.snapshot().moon.count,1);advance(g,100.7);assert.equal(g.snapshot().moon.phase,'calm');advance(g,.3);const moon=g.snapshot().moon;assert.equal(moon.phase,'warn');assert.equal(moon.count,1);
}));

test('idle pea wards recheck for approaching enemies every 12 frames',()=>withRandom(.3,()=>{
 const g=garden();let p=g.snapshot().plants.find(q=>q.lane===1&&q.col===0);assert.equal(p.cool,31/60);advance(g,.6);p=g.snapshot().plants.find(q=>q.lane===1&&q.col===0);assert.ok(p.cool>0&&p.cool<=.2,'idle target check should reset to 12 frames');
 let first;for(let i=0;i<60*6;i++){g.update(1/60,false);const s=g.snapshot();if(s.shots.some(q=>q.lane===1)){first=s.waveTime;break}}assert.ok(first>=5&&first<=5.2,`first shot should follow the incoming wave promptly, got ${first}`);
}));

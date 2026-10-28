import test from 'node:test';import assert from 'node:assert/strict';import {garden,gardenBiteCueDue,gardenBiteInRange,gardenApplyBite,gardenAdvanceShots} from '../src/feature-games8.js';
function withRandom(value,fn){const old=Math.random;Math.random=()=>value;try{fn()}finally{Math.random=old}}
function advance(g,seconds,auto=false){for(let i=0;i<Math.ceil(seconds*60);i++)g.update(1/60,auto)}
test('wave roster is announced before spawning and advances on its timer',()=>withRandom(.3,()=>{const g=garden();let s=g.snapshot();assert.equal(s.wave,1);assert.equal(s.plan.length,4);assert.equal(s.zombies.length,0);assert.deepEqual(s.plants.map(p=>p.type).sort(),['pea','pea','pea','pea','sun','sun','wall','wall'].sort());advance(g,4.9);assert.equal(g.snapshot().zombies.length,0);advance(g,.3);s=g.snapshot();assert.equal(s.wave,1);assert.equal(s.zombies.length,1);assert.equal(s.zombies[0].kind,'hound');advance(g,10);assert.equal(g.snapshot().wave,2)}));
test('manual controls build only in empty beds and do not lift or select moon caps',()=>withRandom(.3,()=>{
 const g=garden();g.input(' ',true);g.input(' ',false);advance(g,1);let s=g.snapshot();assert.equal(s.carried,null);assert.equal(s.gardener.task,null);assert.ok(s.plants.some(p=>p.lane===0&&p.col===0&&p.type==='sun'));
 g.input('ArrowDown',true);g.input('ArrowRight',true);g.input('c',true);assert.equal(g.snapshot().gardener.task,null);
 g.input(' ',true);s=g.snapshot();assert.equal(s.gardener.task.type,'pea');assert.ok(!s.plants.some(p=>p.lane===1&&p.col===1));advance(g,.2);assert.ok(g.snapshot().gardener.x>48);advance(g,2);s=g.snapshot();assert.ok(s.plants.some(p=>p.lane===1&&p.col===1&&p.type==='pea'));assert.ok(s.score>=11);
}));
test('thorn wall damages biting enemies and barrow precedes greenhouse breach',()=>withRandom(.3,()=>{const g=garden();advance(g,16.33);let s=g.snapshot(),wall=s.plants.find(p=>p.lane===1&&p.type==='wall');for(let i=0;i<180&&!(wall.hp<20&&s.zombies.some(z=>z.lane===1&&z.hp<4));i++){g.update(1/60,false);s=g.snapshot();wall=s.plants.find(p=>p.lane===1&&p.type==='wall')}assert.ok(wall.hp<20,'wall must absorb bites');assert.ok(s.zombies.some(z=>z.lane===1&&z.hp<4),'thorn must damage the attacker');let saved=false;for(let i=0;i<60*400;i++){g.update(1/60,false);s=g.snapshot();saved ||= s.barrows[1].active;if(s.breaches)break}assert.ok(saved,'barrow must launch');assert.ok(s.breaches>0);assert.ok(s.greenhouse<200)}));
test('AI holds real waves and manual terminal screen remains until restart',()=>withRandom(.3,()=>{const g=garden();advance(g,75,true);let s=g.snapshot();assert.ok(s.wave>=5);assert.ok(s.score>0);assert.ok(s.wavesHeld>0);advance(g,826,false);s=g.snapshot();assert.ok(s.ended);const saved=s.score;advance(g,5,false);assert.equal(g.snapshot().score,saved);advance(g,7.1,true);assert.equal(g.snapshot().ended,false);g.reset();assert.equal(g.snapshot().wave,1)}));


test('blood moon warns before empowering one lane and then passes',()=>withRandom(.3,()=>{const g=garden();advance(g,70.1);let s=g.snapshot();assert.equal(s.moon.phase,'warn');const lane=s.moon.lane;advance(g,4.1);s=g.snapshot();assert.equal(s.moon.phase,'live');assert.equal(s.moon.lane,lane);advance(g,11);s=g.snapshot();assert.ok(s.zombies.some(z=>z.moon&&z.lane===lane),'target lane should spawn empowered enemies');advance(g,4.1);assert.equal(g.snapshot().moon.phase,'calm')}));

test('AI can plant a moon cap and fire a heavier shot',()=>withRandom(.3,()=>{const g=garden();let found=false;for(let i=0;i<60*35;i++){g.update(1/60,true);const s=g.snapshot();if(s.shots.some(q=>q.kind==='moon'&&q.damage===1.65)){found=true;break}}assert.ok(found)}));

test('AI forecasts the announced roster and physically shifts a defense to a threatened lane',()=>withRandom(.3,()=>{
 const g=garden();g.update(1/60,true);let s=g.snapshot();
 assert.equal(s.gardener.task.action,'build');assert.equal(s.gardener.task.lane,1,'focus lane receives the first defense before enemies spawn');assert.equal(s.gardener.task.col,1);assert.equal(s.zombies.length,0);
 Math.random=()=>.2;const relocation=garden();let move,placed=false;
 for(let i=0;i<60*230;i++){
  relocation.update(1/60,true);s=relocation.snapshot();const task=s.gardener.task;
  if(!move&&task?.action==='lift'&&task.destination)move={source:{lane:task.lane,col:task.col},dest:{...task.destination}};
  if(move&&!s.gardener.task&&!s.carried&&s.plants.some(p=>p.lane===move.dest.lane&&p.col===move.dest.col)){placed=true;break}
 }
 assert.ok(move,'planner should rebalance a healthy defense');assert.notEqual(move.source.lane,move.dest.lane);assert.ok(placed,'gardener must finish the transplant');
}));




test('manual sunblooms wait their bed-specific initial delay and then produce every 330 frames',()=>withRandom(.3,()=>{
 const g=garden();let s=g.snapshot();assert.equal(s.plants.find(p=>p.type==='sun'&&p.lane===0).cool,3);assert.equal(s.plants.find(p=>p.type==='sun'&&p.lane===2).cool,254/60);
 advance(g,2.9);assert.equal(g.snapshot().score,0);advance(g,.2);assert.equal(g.snapshot().score,2);
 for(let i=0;i<3;i++){g.input('ArrowDown',true);g.input('ArrowDown',false)}g.input('ArrowRight',true);g.input('z',true);
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

test('forecast silhouettes and lane counts appear only during the five-second warning',()=>withRandom(.3,()=>{
 const g=garden(),labels=[],ctx=new Proxy({fillText(t){labels.push(String(t))}},{get:(o,k)=>o[k]??(()=>{}),set:(o,k,v)=>(o[k]=v,true)});g.draw(ctx);assert.ok(labels.some(t=>/^x\d+ 5s$/.test(t)));labels.length=0;advance(g,5.1);g.draw(ctx);assert.ok(!labels.some(t=>/^x\d+ \d+s$/.test(t)));
}));
test('wave ten spawns an undertaker with reference maximum health',()=>withRandom(.3,()=>{
 const g=garden();advance(g,140.1);const s=g.snapshot(),brute=s.zombies.find(z=>z.kind==='brute');assert.equal(s.wave,10);assert.ok(brute,'the first tenth-wave attacker is an undertaker');assert.equal(brute.maxHp,22);assert.ok(brute.hp>0&&brute.hp<=brute.maxHp);
}));

test('personas keep the same roster while varying bloom planning',()=>{
 const old=Math.random;function run(first){let state=4,calls=0;Math.random=()=>calls++===0?first:(state=(Math.imul(state,1664525)+1013904223)>>>0)/2**32;const g=garden(),initial=g.snapshot();advance(g,290,true);return {initial,late:g.snapshot()}}
 try{const moss=run(.4),briar=run(.8);assert.equal(moss.initial.persona.name,'MOSS');assert.equal(briar.initial.persona.name,'BRIAR');assert.deepEqual(moss.initial.plan,briar.initial.plan,'persona should not change a fixed wave draw');assert.ok(moss.late.plants.filter(p=>p.type==='sun').length>briar.late.plants.filter(p=>p.type==='sun').length)}finally{Math.random=old}
});
test('idle AI caches the no-task plan briefly instead of recomputing every frame',()=>withRandom(.3,()=>{
 const g=garden();let prev=0,found=false;for(let i=0;i<60*80;i++){g.update(1/60,true);const s=g.snapshot();if(s.plannerCalls>prev&&s.tactic==='WATCH THE LINE'&&!s.gardener.task&&s.waveTime>6&&s.waveTime<12){found=true;break}prev=s.plannerCalls}assert.ok(found);const calls=g.snapshot().plannerCalls;advance(g,.2,true);assert.equal(g.snapshot().plannerCalls,calls);advance(g,.55,true);assert.ok(g.snapshot().plannerCalls>calls);
}));


test('barrow starts at the reference-scaled greenhouse edge before moving',()=>withRandom(.3,()=>{
 const g=garden();let found=false;for(let i=0;i<60*200;i++){g.update(1/60,false);const s=g.snapshot(),b=s.barrows.find(b=>b.active);if(b){assert.equal(b.x,38);assert.ok(s.zombies.some(z=>z.lane===b.lane&&z.x<64));g.update(1/60,false);assert.ok(g.snapshot().barrows[b.lane].x>b.x);found=true;break}}assert.ok(found,'manual garden must eventually launch a barrow');
}));


test('an unprotected attacker breaches at the reference-scaled greenhouse threshold',()=>withRandom(.3,()=>{
 const g=garden();let previous=g.snapshot(),found=false;for(let i=0;i<60*400;i++){g.update(1/60,false);const current=g.snapshot();if(current.breaches>previous.breaches){assert.ok(previous.zombies.some(z=>z.hp>0&&z.x>=52&&z.x<53),'breaching enemy should cross x=52 from outside');assert.equal(current.greenhouse,previous.greenhouse-1);found=true;break}previous=current}assert.ok(found,'manual garden should eventually suffer a breach');
}));


test('manual and AI waves spawn staggered enemies at reference frame positions and speeds',()=>{for(const auto of [false,true])withRandom(.3,()=>{const g=garden();let seen=new Set(),s;for(let i=0;i<800&&seen.size<3;i++){g.update(1/60,auto);s=g.snapshot();for(const entry of s.plan.filter(e=>e.spawned&&!seen.has(e.id))){const z=s.zombies.find(z=>z.id===entry.id);assert.ok(z);assert.ok(Math.abs(z.x-(320+(entry.id%3)*6-21.6/60))<1e-7);seen.add(entry.id)}}assert.deepEqual([...seen],[100,101,102]);assert.deepEqual(s.plan.map(e=>e.at),[5,460/60,620/60,13]);});});


test('attacker bites from six pixels behind a plant to just under eighteen ahead',()=>{assert.equal(gardenBiteInRange(100,94),true);assert.equal(gardenBiteInRange(100,93.99),false);assert.equal(gardenBiteInRange(100,117.99),true);assert.equal(gardenBiteInRange(100,118),false)});


test('glass indicator turns red at the reference critical threshold',()=>withRandom(.3,()=>{
 const g=garden(),draws=[],noop=()=>{},c=new Proxy({fillRect(x,y,w,h){if(x===14&&y===58&&h===5)draws.push({width:w,color:this.fillStyle})},fillText(value){if(String(value).startsWith('GLASS '))draws.push({label:value,color:this.fillStyle})}},{get:(o,k)=>k in o?o[k]:noop,set:(o,k,v)=>(o[k]=v,true)});g.draw(c);assert.equal(draws.at(-1).color,'#92d88c');for(let i=0;i<60*850&&g.snapshot().greenhouse>60;i++)g.update(1/60,false);assert.ok(g.snapshot().greenhouse<=60);draws.length=0;g.draw(c);assert.equal(draws.at(-1).color,'#d95656');assert.ok(draws.at(-1).label.startsWith('GLASS '));
}));


test('pea and moon shots expire after their reference flight lifetimes',()=>{
 const far={x:300,lane:0,hp:5};let pea=gardenAdvanceShots([{x:0,lane:0,kind:'pea',damage:1}],[far],1.49);assert.equal(pea.length,1);pea=gardenAdvanceShots(pea,[far],.02);assert.equal(pea.length,0);assert.equal(far.hp,5);let moon=gardenAdvanceShots([{x:0,lane:0,kind:'moon',damage:1.65}],[],1.5);assert.equal(moon.length,1);moon=gardenAdvanceShots(moon,[],.5);assert.equal(moon.length,0);const target={x:300,lane:0,hp:5};gardenAdvanceShots([{x:0,lane:0,kind:'pea',damage:1}],[target],3);assert.equal(target.hp,5,'a long update cannot extend a shot beyond its lifetime');
});


test('last-second kills highlight the threatened lane and play the save cue',()=>withRandom(.3,()=>{
 const events=[],g=garden(e=>events.push(e));let s;for(let i=0;i<60*300;i++){g.update(1/60,false);s=g.snapshot();if(s.lastSave)break}assert.ok(s.lastSave,'a late kill should trigger a save');assert.ok(s.saves>0);assert.ok(events.includes('dodge'));const lane=s.lastSave.lane;assert.equal(s.notice,'LAST-SECOND SAVE!');assert.ok(lane>=0&&lane<4);for(let i=0;i<300&&g.snapshot().lastSave;i++)g.update(1/60,false);assert.equal(g.snapshot().lastSave,null,'highlight should clear after the last save');
}));

test('manual and AI dawn cards show outcome, held waves and replanted defenses',()=>withRandom(.3,()=>{
 for(const auto of [false,true]){const g=garden();advance(g,900,auto);const s=g.snapshot();assert.ok(s.ended);const labels=[],noop=()=>{},c=new Proxy({fillText(v){labels.push(String(v))}},{get:(o,k)=>k in o?o[k]:noop,set:(o,k,v)=>(o[k]=v,true)});g.draw(c);assert.ok(labels.includes(s.notice));assert.ok(labels.includes(`${s.wavesHeld} WAVES HELD`));assert.ok(labels.includes(`${s.transplants} DEFENSES REPLANTED`));assert.ok(!labels.includes('GAME OVER'));}
}));


test('AI occasionally misses a cue without blocking manual takeover',()=>withRandom(.3,()=>{
 const g=garden();let s,frame=0;for(;frame<60*300;frame++){g.update(1/60,true);s=g.snapshot();if(s.skill.lapses&&s.skill.until>(frame+1)/60+.2&&!s.gardener.task)break}assert.ok(s.skill.lapses>0);assert.ok(s.skill.until-(frame+1)/60<=34/60+1e-6);const calls=s.plannerCalls;for(let i=0;i<10;i++)g.update(1/60,true);s=g.snapshot();assert.equal(s.gardener.task,null);assert.equal(s.plannerCalls,calls);const before=s.bed.lane;g.input(before<3?'ArrowDown':'ArrowUp',true);assert.notEqual(g.snapshot().bed.lane,before,'manual selection is not suppressed by AI lapse');
}));


test('reference-scaled beds and gardener project into the compact garden for manual and AI',()=>{
 for(const auto of [false,true])withRandom(.3,()=>{const g=garden();let s=g.snapshot();assert.deepEqual(s.bedPositions,{x:[84,136,188],y:[176,280,384,488]});assert.equal(s.gardener.x,62);assert.equal(s.gardener.y,280);const arcs=[],noop=()=>{},c=new Proxy({arc(x,y){arcs.push([x,y])}},{get:(o,k)=>k in o?o[k]:noop,set:(o,k,v)=>(o[k]=v,true)});g.draw(c);assert.ok(arcs.some(([x,y])=>Math.abs(x-58.1)<.01&&y===180),'first sunbloom must be drawn in the projected first bed');g.update(1/60,auto);s=g.snapshot();assert.ok(s.bedPositions.x.every(Number.isFinite));});
});


test('bite cues follow each attacker ID on the forty-frame reference rhythm',()=>{
 assert.equal(gardenBiteCueDue(100,19,20),true);assert.equal(gardenBiteCueDue(100,20,21),false);assert.equal(gardenBiteCueDue(101,18,19),true);assert.equal(gardenBiteCueDue(101,19,20),false);assert.equal(gardenBiteCueDue(100,18,22),true);assert.equal(gardenBiteCueDue(100,21,23),false);
});


test('independent AI skill randomness cannot change later wave rosters',()=>{
 const old=Math.random;function run(auto){let state=42;Math.random=()=>((state=(Math.imul(state,1664525)+1013904223)>>>0)/2**32);const g=garden(),rosters=[];for(let i=0;i<60*76;i++){g.update(1/60,auto);const s=g.snapshot();if(rosters.length<s.wave)rosters.push(s.plan.map(({at,lane,kind,id})=>({at,lane,kind,id})))}return rosters}try{const manual=run(false),ai=run(true);assert.ok(manual.length>=5);assert.deepEqual(ai,manual)}finally{Math.random=old}
});


test('seed 42 reproduces the reference opening roster and AI planting state',()=>{
 const old=Math.random;let state=42;Math.random=()=>{state|=0;state=state+0x6D2B79F5|0;let v=Math.imul(state^state>>>15,1|state);v=v+Math.imul(v^v>>>7,61|v)^v;return((v^v>>>14)>>>0)/4294967296};try{const g=garden(),initial=g.snapshot();assert.equal(initial.persona.name,'MOSS');assert.deepEqual(initial.plan.map(q=>[Math.round(q.at*60),q.lane,q.kind,q.id]),[[300,3,'shambler',100],[460,3,'hound',101],[620,2,'hound',102],[780,2,'shambler',103]]);for(let i=0;i<156;i++)g.update(1/60,true);const s=g.snapshot();assert.equal(s.sun,94);assert.equal(s.plants.length,9);assert.equal(s.plannerCalls,2);assert.equal(s.skill.lapses,0);for(let i=156;i<25000;i++)g.update(1/60,true);const late=g.snapshot();assert.equal(late.wave,28);assert.equal(late.sun,44);assert.equal(late.greenhouse,200);assert.equal(late.plants.length,12);assert.deepEqual(late.plants.filter(p=>p.lane===2&&p.type==='moon').map(p=>[p.col,Math.round(p.cool*60)]).sort((a,b)=>a[0]-b[0]),[[1,59],[2,13]]);for(let i=25000;i<25287;i++)g.update(1/60,true);assert.equal(Math.round(g.snapshot().plants.find(p=>p.lane===3&&p.col===1).cool*60),5);for(let i=25287;i<25622;i++)g.update(1/60,true);const threat=g.snapshot();assert.ok(Math.abs(threat.zombies.find(z=>z.id===2900).hp-.7)<1e-8);assert.ok(Math.abs(threat.zombies.find(z=>z.id===2901).hp-2.9)<1e-8);for(let i=25622;i<26104;i++)g.update(1/60,true);assert.deepEqual((({action,lane,col})=>({action,lane,col}))(g.snapshot().gardener.task),{action:'lift',lane:2,col:0});for(let i=26104;i<30000;i++)g.update(1/60,true);const checkpoint=g.snapshot();assert.deepEqual([checkpoint.wave,checkpoint.sun,checkpoint.greenhouse,checkpoint.breaches,checkpoint.plants.length,checkpoint.zombies.length,checkpoint.transplants],[34,7,200,0,5,14,12]);for(let i=30000;i<32829;i++)g.update(1/60,true);const cached=g.snapshot();assert.equal(cached.gardener.task,null);assert.equal(cached.sun,25);for(let i=32829;i<32842;i++)g.update(1/60,true);const replanned=g.snapshot();assert.deepEqual((({action,type,lane,col})=>({action,type,lane,col}))(replanned.gardener.task),{action:'build',type:'sun',lane:0,col:0});assert.equal(replanned.sun,25);for(let i=32842;i<37895;i++)g.update(1/60,true);const afterLapse=g.snapshot();assert.deepEqual((({action,type,lane,col})=>({action,type,lane,col}))(afterLapse.gardener.task),{action:'build',type:'sun',lane:0,col:0});assert.equal(afterLapse.sun,29);for(let i=37895;i<40000;i++)g.update(1/60,true);let later=g.snapshot();assert.deepEqual([later.wave,later.sun,later.greenhouse,later.breaches,later.plants.length,later.zombies.length,later.transplants],[45,39,140,64,2,18,22]);for(let i=40000;i<53999;i++)g.update(1/60,true);later=g.snapshot();assert.deepEqual([later.wave,later.sun,later.greenhouse,later.breaches,later.plants.length,later.zombies.length,later.transplants],[60,9,18,190,1,21,37])}finally{Math.random=old}
});


test('a projectile uses the reference post-move hit window among clustered enemies',()=>{
 const behind={id:100,x:95,lane:0,hp:5},ahead={id:101,x:110,lane:0,hp:5};gardenAdvanceShots([{x:100,lane:0,kind:'pea',damage:1}],[behind,ahead],1/60);assert.equal(behind.hp,5);assert.equal(ahead.hp,4);
});


test('gardener begins its full work countdown after arriving at the bed',()=>withRandom(.3,()=>{
 const g=garden();g.input('ArrowDown',true);g.input('ArrowRight',true);g.input(' ',true);let s;for(let i=0;i<200;i++){g.update(1/60,false);s=g.snapshot();if(s.gardener.task?.phase==='work')break}assert.equal(s.gardener.task.phase,'work');assert.ok(Math.abs(s.gardener.task.remaining-34/60)<1e-9);for(let i=0;i<33;i++)g.update(1/60,false);assert.ok(g.snapshot().gardener.task);g.update(1/60,false);assert.equal(g.snapshot().gardener.task,null);assert.ok(g.snapshot().plants.some(p=>p.lane===1&&p.col===1&&p.type==='pea'));
}));


test('AI uproots exactly after the reference 26 work frames',()=>withRandom(.2,()=>{
 const g=garden();let s;for(let i=0;i<60*240;i++){g.update(1/60,true);s=g.snapshot();if(s.gardener.task?.action==='lift'&&s.gardener.task.phase==='work')break}assert.equal(s.gardener.task?.action,'lift');assert.ok(Math.abs(s.gardener.task.remaining-26/60)<1e-9);for(let i=0;i<25;i++)g.update(1/60,true);assert.equal(g.snapshot().carried,null);g.update(1/60,true);s=g.snapshot();assert.ok(s.carried,'plant should be uprooted on the 26th work frame');assert.equal(s.gardener.task?.action,'place');
}));


test('seed 1 preserves reference transplant choice and late-wave outcomes',()=>{
 const old=Math.random;let state=1;Math.random=()=>{state|=0;state=state+0x6D2B79F5|0;let v=Math.imul(state^state>>>15,1|state);v=v+Math.imul(v^v>>>7,61|v)^v;return((v^v>>>14)>>>0)/4294967296};try{const g=garden();for(let i=0;i<31437;i++)g.update(1/60,true);let s=g.snapshot();assert.deepEqual((({action,lane,col,destination})=>({action,lane,col,destination}))(s.gardener.task),{action:'lift',lane:1,col:2,destination:{lane:3,col:0}});for(let i=31437;i<40000;i++)g.update(1/60,true);s=g.snapshot();assert.deepEqual([s.wave,s.sun,s.greenhouse,s.breaches,s.plants.length,s.zombies.length,s.transplants],[45,23,137,68,4,20,28]);for(let i=40000;i<53999;i++)g.update(1/60,true);s=g.snapshot();assert.deepEqual([s.wave,s.sun,s.greenhouse,s.breaches,s.plants.length,s.zombies.length,s.transplants],[60,15,13,196,1,26,33])}finally{Math.random=old}
});


test('seed 1 unattended manual garden matches reference late-wave samples',()=>{
 const old=Math.random;let state=1;Math.random=()=>{state|=0;state=state+0x6D2B79F5|0;let v=Math.imul(state^state>>>15,1|state);v=v+Math.imul(v^v>>>7,61|v)^v;return((v^v>>>14)>>>0)/4294967296};try{const g=garden();for(let i=0;i<30000;i++)g.update(1/60,false);let s=g.snapshot();assert.deepEqual([s.wave,s.sun,s.greenhouse,s.breaches,s.plants.length,s.zombies.length],[34,300,96,110,0,18]);for(let i=30000;i<53999;i++)g.update(1/60,false);s=g.snapshot();assert.deepEqual([s.wave,s.sun,s.greenhouse,s.breaches,s.plants.length,s.zombies.length],[60,300,0,383,0,25]);assert.equal(s.ended,false);g.update(1/60,false);assert.equal(g.snapshot().notice,'GARDEN LOST')}finally{Math.random=old}
});


test('seed 1 active manual planting follows the reference into late waves',()=>{
 const old=Math.random;let state=1;Math.random=()=>{state|=0;state=state+0x6D2B79F5|0;let v=Math.imul(state^state>>>15,1|state);v=v+Math.imul(v^v>>>7,61|v)^v;return((v^v>>>14)>>>0)/4294967296};try{const g=garden(),actions=new Map([[1,'ArrowDown'],[2,'ArrowRight'],[3,' '],[184,'ArrowDown'],[185,'ArrowRight'],[186,'x'],[367,'ArrowUp'],[368,'ArrowUp'],[369,'z']]),checkpoints=new Map([[500,[1,92,200,0,10,2]],[5000,[6,300,200,0,11,1]],[20000,[23,300,180,22,4,13]],[30000,[34,300,115,91,0,16]],[40000,[45,300,11,199,0,21]],[53999,[60,300,0,362,0,25]]]);for(let frame=1;frame<=53999;frame++){const k=actions.get(frame);if(k){g.input(k,true);g.input(k,false)}g.update(1/60,false);if(checkpoints.has(frame)){const s=g.snapshot();assert.deepEqual([s.wave,s.sun,s.greenhouse,s.breaches,s.plants.length,s.zombies.length],checkpoints.get(frame));assert.deepEqual(s.bed,{lane:0,col:2});if(frame===20000)assert.ok(Math.abs(s.plants.find(p=>p.lane===1&&p.col===2).hp-16.232)<1e-9)}}}finally{Math.random=old}
});


test('blood moon transitions on the exact reference frames',()=>withRandom(.3,()=>{
 const g=garden();for(let i=1;i<=26940;i++){g.update(1/60,false);if(i===4199)assert.equal(g.snapshot().moon.phase,'calm');if(i===4200)assert.equal(g.snapshot().moon.phase,'warn');if(i===4440)assert.equal(g.snapshot().moon.phase,'live');if(i===5340)assert.equal(g.snapshot().moon.phase,'calm');if(i===25800)assert.equal(g.snapshot().moon.phase,'warn');if(i===26040)assert.equal(g.snapshot().moon.phase,'live');if(i===26940)assert.equal(g.snapshot().moon.phase,'calm')}
}));


test('seed 2 blood-moon contact and late waves match reference checkpoints',()=>{
 const old=Math.random;let state=2;Math.random=()=>{state|=0;state=state+0x6D2B79F5|0;let v=Math.imul(state^state>>>15,1|state);v=v+Math.imul(v^v>>>7,61|v)^v;return((v^v>>>14)>>>0)/4294967296};try{const g=garden();for(let i=0;i<26975;i++)g.update(1/60,true);let s=g.snapshot();assert.ok(Math.abs(s.plants.find(p=>p.lane===0&&p.col===2).hp-7.456)<1e-9);for(let i=26975;i<30000;i++)g.update(1/60,true);s=g.snapshot();assert.deepEqual([s.wave,s.sun,s.greenhouse,s.breaches,s.plants.length,s.zombies.length,s.transplants],[34,35,200,0,8,16,6]);for(let i=30000;i<40000;i++)g.update(1/60,true);s=g.snapshot();assert.deepEqual([s.wave,s.sun,s.greenhouse,s.breaches,s.plants.length,s.zombies.length,s.transplants],[45,4,173,29,1,20,22]);for(let i=40000;i<53999;i++)g.update(1/60,true);s=g.snapshot();assert.deepEqual([s.wave,s.sun,s.greenhouse,s.breaches,s.plants.length,s.zombies.length,s.transplants],[60,7,30,176,0,23,29])}finally{Math.random=old}
});

test('seed 3 AI preserves reference late-wave defense and enemy state',()=>{
 const old=Math.random;let state=3;Math.random=()=>{state|=0;state=state+0x6D2B79F5|0;let v=Math.imul(state^state>>>15,1|state);v=v+Math.imul(v^v>>>7,61|v)^v;return((v^v>>>14)>>>0)/4294967296};try{const g=garden(),checks=new Map([[30000,[34,48,199,1,5,13,2,13]],[40000,[45,2,152,52,3,21,3,35]],[53999,[60,20,8,200,1,21,6,47]]]);for(let frame=1;frame<=53999;frame++){g.update(1/60,true);if(checks.has(frame)){const s=g.snapshot();assert.deepEqual([s.wave,s.sun,s.greenhouse,s.breaches,s.plants.length,s.zombies.length,s.skill.lapses,s.transplants],checks.get(frame));if(frame===30000){const z=s.zombies.find(z=>z.id===3112);assert.equal(z.kind,'brute');assert.ok(Math.abs(z.x-92.72399999999358)<1e-9);assert.ok(Math.abs(z.hp-7.665999999999986)<1e-9)}if(frame===40000)assert.ok(Math.abs(s.plants.find(p=>p.lane===2&&p.col===1).hp-2.7919999999999523)<1e-9)}}}finally{Math.random=old}
});

test('seed 4 AI matches reference late defense and dawn loss',()=>{
 const old=Math.random;let state=4;Math.random=()=>{state|=0;state=state+0x6D2B79F5|0;let v=Math.imul(state^state>>>15,1|state);v=v+Math.imul(v^v>>>7,61|v)^v;return((v^v>>>14)>>>0)/4294967296};try{const g=garden(),checks=new Map([[30000,[34,30,200,2,6,18,1,16]],[40000,[45,22,140,66,0,21,3,26]],[53999,[60,9,0,225,1,21,5,34]]]);for(let frame=1;frame<=53999;frame++){g.update(1/60,true);if(checks.has(frame)){const s=g.snapshot();assert.deepEqual([s.wave,s.sun,s.greenhouse,s.breaches,s.plants.length,s.zombies.length,s.skill.lapses,s.transplants],checks.get(frame));if(frame===53999)assert.equal(s.ended,false)}}g.update(1/60,true);assert.equal(g.snapshot().notice,'GARDEN LOST')}finally{Math.random=old}
});

test('seed 5 AI holds the reference garden until dawn',()=>{
 const old=Math.random;let state=5;Math.random=()=>{state|=0;state=state+0x6D2B79F5|0;let v=Math.imul(state^state>>>15,1|state);v=v+Math.imul(v^v>>>7,61|v)^v;return((v^v>>>14)>>>0)/4294967296};try{const g=garden(),checks=new Map([[30000,[34,144,200,0,11,10,3,1]],[40000,[45,48,199,3,5,21,6,18]],[53999,[60,23,53,153,0,24,11,29]]]);for(let frame=1;frame<=53999;frame++){g.update(1/60,true);if(checks.has(frame)){const s=g.snapshot();assert.deepEqual([s.wave,s.sun,s.greenhouse,s.breaches,s.plants.length,s.zombies.length,s.skill.lapses,s.transplants],checks.get(frame));if(frame===53999)assert.equal(s.ended,false)}}g.update(1/60,true);assert.equal(g.snapshot().notice,'DAWN SAVED')}finally{Math.random=old}
});

test('a thorn wall survives a simultaneous lethal bite until a living attacker bites it',()=>{
 const wall={type:'wall',hp:.01},attacker={kind:'shambler',hp:.02};assert.equal(gardenApplyBite(wall,attacker,1/60),false);assert.ok(wall.hp<=0);assert.ok(attacker.hp<=0);const next={kind:'hound',hp:1};assert.equal(gardenApplyBite(wall,next,1/60),true);assert.ok(next.hp>0);
});

test('held manual controls and aliases produce one tap until released',()=>{
 const g=garden();g.input('ArrowDown',true);g.input('ArrowDown',true);g.input('s',true);assert.equal(g.snapshot().bed.lane,1);g.input('s',false);g.input('ArrowDown',true);assert.equal(g.snapshot().bed.lane,2);g.input('ArrowDown',false);g.input('ArrowDown',true);g.input('ArrowRight',true);g.input(' ',true);g.input(' ',true);assert.equal(g.snapshot().gardener.task.type,'pea');
});

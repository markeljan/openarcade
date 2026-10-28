import test from 'node:test';
import assert from 'node:assert/strict';
import {miner,minerBaseTile,minerMiningSeconds,minerFluidStep,minerSupported,minerGravityStep,minerClimbUp,minerProjectileStep,minerLineClear,minerEnemyRoute,minerStairStep,minerCycleObserve,minerCycleExpire,minerCycleEscapeRoute,minerQuarryRoute,minerEscapeLava,minerStairDuration,minerFinishMove,minerTransitPosition,minerEnemyContact,minerHomeRoute,minerPrepareLanding,minerPlanMine,minerGolemStep,minerSkeletonShot,minerGolemShot,minerTowerMove,minerTowerGravity,drawMinerTower,minerSkyWeatherStep,minerLightningHits,minerSurfacePredatorStep,minerIsNight,minerSkyDelay,minerWorldTile,minerDamageAmount,minerAgeGolem,minerCreeperStep,minerSpiderStep,minerFallCatch,minerCaveKind,minerCaveSpawn,minerNearestThreat,minerWithinMobRange,minerStagger,minerMobTravelSeconds,minerTntTargets,minerGateReady,minerCampNear} from '../src/feature-games4.js';
function seeded(seed, fn){const original=Math.random;Math.random=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/2**32);try{return fn()}finally{Math.random=original}}
function manualShaft(){const w=Array.from({length:240},(_,y)=>Array(20).fill(y<3?0:1));w[2][4]=w[2][6]=w[1][5]=4;return w}
function observer(game){const labels=[];const ctx=new Proxy({fillText(s){labels.push(s)}},{get:(o,k)=>o[k]??(()=>{}),set:(o,k,v)=>(o[k]=v,true)});return ()=>{labels.length=0;game.draw(ctx);return [...labels]}}
function mine(game,d){settle(game);game.input('x',true);game.input(d,true);game.input(d,false);game.input('x',false);game.update(3,false)}
function settle(game){for(let i=0;i<180;i++){const s=game.snapshot();if(!s.stairTransit&&(s.p.towerLevel>0||minerSupported(s.world,s.p.x,s.p.y)||s.p.air>0))return;game.update(1/60,false)}}
function move(game,k){settle(game);game.input(k,true);game.input(k,false);const t=game.snapshot().stairTransit;if(t)game.update(t.left+1e-8,false);settle(game)}
function reachRightTree(g){for(let i=0;i<4;i++)move(g,'ArrowRight')}
function harvestOpening(g){reachRightTree(g);mine(g,'ArrowRight');move(g,'ArrowRight');mine(g,'ArrowUp');for(let i=0;i<10;i++){const s=g.snapshot();if(s.world[2][s.p.x-1]!==0)mine(g,'ArrowLeft');move(g,'ArrowLeft')}mine(g,'ArrowLeft')}
test('preview earns the beacon and defeats the golem across seeds',()=>{for(const seed of [1,7,42,99,12345])seeded(seed,()=>{const game=miner(),snapshot=observer(game);let won=false;for(let i=0;i<60*180&&!won;i++){game.update(1/60,true);if(i%60===0)won=snapshot().some(s=>/KILLS [1-9]/.test(s))}assert.ok(won,`seed ${seed} must reach and defeat the golem`)})});
test('manual cave-enemy defeat persists until restart',()=>seeded(42,()=>{const game=miner(()=>{},{dynamicSpawns:false}),snapshot=observer(game);for(const d of ['ArrowLeft','ArrowRight','ArrowUp'])mine(game,d);for(let i=0;i<20;i++){mine(game,'ArrowDown');move(game,'ArrowDown')}assert.ok(snapshot().some(s=>s.startsWith('ZOMBIE ')));for(let i=0;i<12;i++)game.update(1,false);assert.ok(snapshot().includes('RUN OVER'));for(let i=0;i<10;i++)game.update(1,false);assert.ok(snapshot().includes('RUN OVER'),'manual loss must not silently restart');game.reset();assert.ok(!snapshot().includes('RUN OVER'));assert.match(snapshot().find(s=>s.startsWith('DEPTH')),/DEPTH 0/)}));

test('mining wears the pick and the surface camp repairs it',()=>seeded(42,()=>{
 const game=miner(),snapshot=observer(game);harvestOpening(game);assert.ok(game.snapshot().tool>=1);while(game.snapshot().p.x<10)move(game,'ArrowRight');mine(game,'ArrowDown');assert.equal(game.snapshot().dur,118);game.update(.2,false);move(game,'ArrowUp');game.update(1.5,false);assert.ok(snapshot().includes('PICK DUR 120/120'));
}));

test('manual mining takes time and completes after the key is released',()=>seeded(42,()=>{
 const game=miner(),snapshot=observer(game);reachRightTree(game);game.input('x',true);game.input('ArrowRight',true);game.input('ArrowRight',false);game.input('x',false);game.update(1,false);assert.match(snapshot().find(s=>s.includes('PICK')),/W0 /);game.update(.14,false);assert.match(snapshot().find(s=>s.includes('PICK')),/W1 /);
}));

test('iron and diamond remain mineable with weak tools but take longer',()=>{
 assert.equal(minerMiningSeconds(3,0),Math.ceil(66*1.7*2.2)/60);
 assert.equal(minerMiningSeconds(3,1),Math.ceil(66*.75)/60);
 assert.equal(minerMiningSeconds(5,2),Math.ceil(88*.5*2.2)/60);
 assert.equal(minerMiningSeconds(5,3),Math.ceil(88*.32)/60);
});

test('water flows downward before sideways and meets lava as stone',()=>{
 const world=Array.from({length:5},()=>Array(5).fill(1));
 world[1][2]=6;world[2][2]=0;world[1][1]=0;world[1][3]=0;
 minerFluidStep(world,2,2);
 assert.equal(world[2][2],6);assert.equal(world[1][1],0);assert.equal(world[1][3],0);
 world[3][2]=7;minerFluidStep(world,2,2);assert.equal(world[3][2],1);
 minerFluidStep(world,2,2);assert.equal(world[1][1],6);assert.equal(world[1][3],6);
});
test('liquid outside the nearby exposed area remains inactive',()=>{
 const world=Array.from({length:14},()=>Array(3).fill(1));world[12][1]=7;world[13][1]=0;
 minerFluidStep(world,1,1);assert.equal(world[13][1],0);
 minerFluidStep(world,1,10);assert.equal(world[13][1],7);
});

test('unsupported shafts fall and damage on landing, while water cushions the fall',()=>{
 const world=Array.from({length:7},()=>[1,0,1]);world[6][1]=1;const p={x:1,y:1,fall:0};assert.equal(minerSupported(world,1,1),false);for(let i=0;i<4;i++)assert.equal(minerGravityStep(world,p).moved,true);assert.equal(minerGravityStep(world,p).damage,1);
 world[5][1]=6;const swimmer={x:1,y:1,fall:0};for(let i=0;i<4;i++)minerGravityStep(world,swimmer);assert.equal(minerGravityStep(world,swimmer).damage,0);
});
test('manual miner descends after removing footing and places an anchored ladder to climb',()=>seeded(42,()=>{
 const g=miner();g.input('x',true);g.input('ArrowDown',true);g.input('ArrowDown',false);g.input('x',false);g.update(3,false);g.update(.2,false);let s=g.snapshot();assert.equal(s.p.y,3);assert.equal(s.ladder,2);
 move(g,'ArrowUp');s=g.snapshot();assert.equal(s.p.y,2);assert.equal(s.world[3][10],9);assert.equal(s.ladder,1);g.update(.3,false);assert.equal(g.snapshot().p.y,2);
}));

test('a miner without rungs can mantle a ledge but cannot hop into a bare shaft',()=>{
 const world=Array.from({length:5},()=>Array(5).fill(0));world[4][2]=1;world[3][3]=1;const p={x:2,y:3,fall:0},stock={ladder:0,wood:0,stone:0};
 assert.equal(minerClimbUp(world,p,stock),true);assert.equal(p.y,2);assert.ok(p.air>0);p.x=3;assert.equal(minerSupported(world,p.x,p.y),true);
 const bare=Array.from({length:5},()=>Array(5).fill(0));bare[4][2]=1;const q={x:2,y:3,fall:0};assert.equal(minerClimbUp(bare,q,{ladder:0,wood:0,stone:0}),false);assert.equal(q.y,3);
});
test('water exit needs a rung or water above and failed placement preserves supplies',()=>{
 const world=Array.from({length:5},()=>Array(5).fill(0));world[3][2]=6;const p={x:2,y:3},stock={ladder:1,wood:0,stone:0};assert.equal(minerClimbUp(world,p,stock),true);assert.equal(world[2][2],9);assert.equal(stock.ladder,0);assert.equal(p.y,2);
 const empty=Array.from({length:5},()=>Array(5).fill(0));const q={x:2,y:3},resources={ladder:0,wood:1,stone:0};assert.equal(minerClimbUp(empty,q,resources),false);assert.equal(resources.wood,1);assert.equal(resources.ladder,0);
});


test('projectiles travel over time and solid walls stop even a long update',()=>{
 const world=Array.from({length:3},()=>Array(7).fill(0)),target={x:5,y:1};
 const arrow={x:1.5,y:1.5,vx:10,vy:0,ttl:1};assert.equal(minerProjectileStep(world,arrow,target,.1),'flying');assert.equal(minerProjectileStep(world,arrow,target,.4),'hit');
 world[1][3]=1;const blocked={x:1.5,y:1.5,vx:10,vy:0,ttl:1};assert.equal(minerLineClear(world,{x:1,y:1},target),false);assert.equal(minerProjectileStep(world,blocked,target,1),'wall');
});
test('manual bow attacks spend ammunition before the arrow reaches the enemy',()=>seeded(42,()=>{
 const game=miner(()=>{},{dynamicSpawns:false,initialWorld:manualShaft(),initialPosition:{x:5,y:2}});for(const d of ['ArrowLeft','ArrowRight','ArrowUp'])mine(game,d);for(let i=0;i<20;i++){mine(game,'ArrowDown');move(game,'ArrowDown')}
 let before=game.snapshot();assert.ok(before.mob);game.input('x',true);game.update(1/60,false);game.input('x',false);let fired=game.snapshot();assert.equal(fired.ammo,before.ammo-1);assert.equal(fired.mob.hp,before.mob.hp);assert.equal(fired.projectiles.length,1);
 game.update(.02,false);assert.equal(game.snapshot().mob.hp,before.mob.hp);game.update(.1,false);assert.ok(game.snapshot().mob.hp<before.mob.hp);
}));


test('golem takes an open detour instead of smashing a blocking wall',()=>{
 const world=Array.from({length:5},()=>Array(7).fill(1));for(const [x,y] of [[1,2],[2,2],[2,1],[3,1],[4,1],[4,2],[5,2]])world[y][x]=0;
 const golem={x:1,y:2,t:0},player={x:5,y:2};assert.ok(minerEnemyRoute(world,golem,player).length>4);for(let i=0;i<10&&golem.x!==5;i++)assert.equal(minerGolemStep(world,golem,player,1.01),'moved');assert.deepEqual([golem.x,golem.y],[5,2]);assert.equal(world[2][3],1);assert.equal(golem.smash,undefined);
});
test('trapped golem telegraphs then breaks rock and opens line of sight',()=>{
 const world=Array.from({length:3},()=>Array(7).fill(1));world[1][1]=world[1][2]=world[1][4]=world[1][5]=0;const golem={x:2,y:1,t:0},player={x:5,y:1};
 assert.equal(minerEnemyRoute(world,golem,player),null);assert.equal(minerLineClear(world,golem,player),false);assert.equal(minerGolemStep(world,golem,player,1.01),'windup');assert.deepEqual([golem.smash.x,golem.smash.y],[3,1]);
 assert.equal(minerGolemStep(world,golem,player,79/60),'smashing');assert.equal(world[1][3],1);assert.equal(minerGolemStep(world,golem,player,1/60),'smashed');assert.equal(world[1][3],0);assert.equal(minerLineClear(world,golem,player),true);assert.equal(minerGolemStep(world,golem,player,1.01),'moved');
});
test('a golem cancels a smash if the targeted block is removed',()=>{
 const world=Array.from({length:3},()=>Array(5).fill(1));world[1][1]=world[1][3]=0;const golem={x:1,y:1,t:0},player={x:3,y:1};assert.equal(minerGolemStep(world,golem,player,1.01),'windup');world[1][2]=0;assert.equal(minerGolemStep(world,golem,player,.1),'interrupted');assert.equal(golem.smash,null);
});

test('manual outpost consumes stone and creates a defensible hollow fort',()=>seeded(42,()=>{
 const g=miner(()=>{},{initialWorld:manualShaft(),initialPosition:{x:5,y:2},dynamicSpawns:false});for(const d of ['ArrowLeft','ArrowRight','ArrowUp'])mine(g,d);
 let before;
 for(let i=0;i<60;i++){
  g.input('x',true);g.input('ArrowDown',true);g.input('ArrowDown',false);g.input('x',false);
  for(let j=0;j<30;j++){g.input('x',true);g.update(.1,false)}
  g.input('x',false);move(g,'ArrowDown');
  const s=g.snapshot();if(s.depth>=16&&s.stone>=18&&!s.mob&&!s.boss){before=s;break}
 }
 assert.ok(before,'manual player reaches an eligible depth with stone');
 g.input('c',true);const after=g.snapshot();assert.equal(after.outposts.length,1);
 const o=after.outposts[0];assert.equal(o.depth,o.y-2);assert.equal(after.world[o.y][o.x+2],10);assert.equal(after.world[o.y][o.x+1],0);
 assert.equal(after.world[o.y-2][o.x],before.world[o.y-2][o.x]);assert.equal(after.world[o.y+2][o.x],before.world[o.y+2][o.x]);
 assert.ok([12,14].includes(before.stone-after.stone));assert.ok(after.buildCooldown>0);
 g.input('c',true);assert.equal(g.snapshot().outposts.length,1);
}));

test('automatic miner builds an outpost during descent',()=>seeded(42,()=>{
 const g=miner();let state;for(let i=0;i<60*90;i++){g.update(1/60,true);if(i%30===0){state=g.snapshot();if(state.outposts.length)break}}
 assert.ok(state.outposts.length);const o=state.outposts[0];assert.ok(o.depth>=16);assert.equal(state.world[o.y][o.x+2],10);
}));

test('fort walls obstruct projectiles and do not count as open ledges',()=>{
 const world=Array.from({length:5},()=>Array(5).fill(0));world[1][2]=10;
 assert.equal(minerLineClear(world,{x:1,y:1},{x:3,y:1}),false);
 assert.equal(minerProjectileStep(world,{x:1.5,y:1.5,vx:10,vy:0,ttl:1},{x:3,y:1},.3),'wall');
 world[4][2]=1;world[3][3]=1;world[2][3]=10;
 assert.equal(minerClimbUp(world,{x:2,y:3},{ladder:0,wood:0,stone:0}),false);
});


test('skeleton only draws a bow when its target is in range and line of sight',()=>seeded(5,()=>{
 const world=Array.from({length:5},()=>Array(12).fill(0)),skeleton={x:1,y:2,shotCd:.5},player={x:5,y:2};
 world[2][3]=1;assert.equal(minerSkeletonShot(world,skeleton,player,1,0),null);assert.equal(skeleton.shotCd,.5);
 world[2][3]=0;assert.equal(minerSkeletonShot(world,skeleton,player,.4,0),null);
 const arrow=minerSkeletonShot(world,skeleton,player,.1,0);assert.equal(arrow.kind,'arrow');assert.equal(arrow.dmg,1);assert.ok(arrow.vx>0);assert.ok(skeleton.shotCd>=1.5&&skeleton.shotCd<=140/60);
 assert.equal(minerSkeletonShot(world,{x:4,y:2,shotCd:0},player,1,0),null);
}));

test('manual descent encounters a skeleton that fires a travelling arrow',()=>seeded(5,()=>{
 const g=miner(()=>{},{initialWorld:manualShaft(),initialPosition:{x:5,y:2},dynamicSpawns:false});for(const d of ['ArrowLeft','ArrowRight','ArrowUp'])mine(g,d);let found=false;
 for(let i=0;i<80&&!found;i++){
  g.input('x',true);g.input('ArrowDown',true);g.input('ArrowDown',false);g.input('x',false);
  for(let j=0;j<30;j++){
   if(g.snapshot().mob?.kind==='SKELETON'){found=true;break}
   g.input('x',true);g.update(.1,false);
  }
  if(!found){g.input('x',false);move(g,'ArrowDown')}
 }
 assert.ok(found);g.input('x',false);let arrow;
 for(let i=0;i<50&&!arrow;i++){g.update(.05,false);arrow=g.snapshot().projectiles.find(p=>p.kind==='arrow')}
 assert.ok(arrow,'skeleton launches an arrow before approaching');assert.equal(arrow.dmg,1);
}));

test('obsidian takes reference mining time and golems cannot smash it',()=>{
 assert.equal(minerMiningSeconds(11,4),.5);assert.equal(minerMiningSeconds(11,3),Math.ceil(150*.32*2.2)/60);
 const world=Array.from({length:3},()=>Array(5).fill(11));world[1][1]=world[1][3]=0;
 const golem={x:1,y:1,t:1};assert.equal(minerGolemStep(world,golem,{x:3,y:1},.1),'waiting');assert.equal(world[1][2],11);
});

test('manual waygate channels to camp and back',()=>{
 const w=Array.from({length:34},(_,y)=>Array(10).fill(y<3?0:1));w[10][5]=0;const home={x:2,y:2},deep={x:5,y:10},g=miner(()=>{},{initialWorld:w,initialPosition:deep,initialGates:{home,deep:[deep]},dynamicSpawns:false});
 let s=g.snapshot();assert.equal(s.world[deep.y][deep.x],12);g.update(.01,false);assert.ok(g.snapshot().gateChannel>0);g.input('ArrowLeft',true);assert.equal(g.snapshot().p.x,deep.x,'channel holds player in place');g.input('ArrowLeft',false);
 g.update(.7,false);s=g.snapshot();assert.deepEqual({x:s.p.x,y:s.p.y},home);assert.ok(s.gateCooldown>0);
 g.update(5.1,false);g.update(.7,false);s=g.snapshot();assert.deepEqual({x:s.p.x,y:s.p.y},deep);
});

test('separate deep gates link to camp and camp returns to the newest gate',()=>{
 const w=Array.from({length:100},(_,y)=>Array(20).fill(y<3?0:1)),first={x:3,y:10},last={x:7,y:60},home={x:17,y:2},g=miner(()=>{},{initialWorld:w,initialPosition:first,initialGates:{home,deep:[first,last]},dynamicSpawns:false});let s=g.snapshot();assert.equal(s.deepGates.length,2);assert.ok(last.y-first.y>=45);g.update(.01,false);assert.ok(g.snapshot().gateChannel>0);g.update(.7,false);s=g.snapshot();assert.deepEqual({x:s.p.x,y:s.p.y},home);g.update(5.1,false);g.update(.7,false);s=g.snapshot();assert.deepEqual({x:s.p.x,y:s.p.y},last);
});

test('manual miner eats an outpost ration after taking damage',()=>seeded(42,()=>{
 const g=miner(()=>{},{dynamicSpawns:false,initialWorld:manualShaft(),initialPosition:{x:5,y:2}});for(const d of ['ArrowLeft','ArrowRight','ArrowUp'])mine(g,d);let built=false,encounter=false;
 for(let i=0;i<80&&!encounter;i++){
  g.input('x',true);g.input('ArrowDown',true);g.input('ArrowDown',false);g.input('x',false);
  for(let j=0;j<30;j++){
   const s=g.snapshot();if(!built&&s.depth>=16&&s.stone>=18&&!s.mob){g.input('c',true);built=true}
   if(s.mob?.kind==='SKELETON'){encounter=true;break}
   g.input('x',true);g.update(.1,false);
  }
  if(!encounter){g.input('x',false);move(g,'ArrowDown')}
 }
 assert.ok(built&&encounter);g.input('x',false);g.input('ArrowDown',false);let before;for(let i=0;i<400;i++){g.update(.05,false);before=g.snapshot();if(before.hp<5)break}
 assert.ok(before.hp<5&&before.food>0);g.input('r',true);const after=g.snapshot();assert.equal(after.hp,Math.min(5,before.hp+2));assert.equal(after.food,before.food-1);assert.equal(after.mealInv,.75);g.update(.25,false);assert.ok(g.snapshot().mealInv>0);g.update(.6,false);assert.equal(g.snapshot().mealInv,0);
}));


test('AI returns to camp, plants a grove and builds tower courses',()=>seeded(42,()=>{
 const g=miner();let s;for(let i=0;i<60*400;i++){g.update(1/60,true);if(i%30===0){s=g.snapshot();if(s.towerHeight>0&&s.grove.length)break}}
 assert.ok(s.gate&&s.homeGate);assert.ok(s.towerHeight>0);assert.equal(s.p.y,2-s.p.towerLevel);assert.equal(s.world[2][s.grove[0].x],13);
 while(g.snapshot().p.towerLevel>0)move(g,'ArrowDown');const x=s.grove[0].x;for(let i=0;i<20&&g.snapshot().p.x<x-2;i++){const q=g.snapshot();if([1,2,3,4,5,10,11,14,19].includes(q.world[2]?.[q.p.x+1]))mine(g,'ArrowRight');move(g,'ArrowRight')}assert.ok(Math.abs(g.snapshot().p.x-x)>=2);
 const beforeCanopy=g.snapshot().world[0];g.update(40,false);s=g.snapshot();assert.equal(s.world[2][x],4,'sapling grows into harvestable wood');for(const col of [x-1,x+1])if(beforeCanopy[col]===0)assert.equal(s.world[0][col],14,'a canopy occupies available air');assert.ok(!s.grove.some(tree=>tree.x===x));
}));

test('manual player climbs and descends built tower courses',()=>{
 const w=Array.from({length:34},(_,y)=>Array(20).fill(y<3?0:1)),courses=[['wall','air','ladder','air','wall']],g=miner(()=>{},{initialWorld:w,initialTower:{courses,level:0,x:0,stock:{ladder:0,wood:0,stone:0,rope:0,silk:0}},dynamicSpawns:false});let s=g.snapshot();assert.equal(s.p.x,4);move(g,'ArrowUp');s=g.snapshot();assert.equal(s.p.towerLevel,1);assert.equal(s.p.y,1);assert.equal(s.towerWorld['1']['4'],'ladder');g.update(.3,false);assert.equal(g.snapshot().p.towerLevel,1);move(g,'ArrowDown');s=g.snapshot();assert.equal(s.p.towerLevel,0);assert.equal(s.p.y,2);
});

test('seeded AI completes the tower through grove harvest and stone trips',()=>seeded(42,()=>{
 const g=miner();let s,sawGrove=false,sawReturn=false;for(let i=0;i<60*1800;i++){g.update(1/60,true);if(i%120===0){s=g.snapshot();sawGrove||=s.grove.length>0;if(s.towerHeight>0&&s.p.y>32)sawReturn=true;if(s.towerHeight===60)break}}
 assert.ok(sawGrove,'the builder plants a grove');assert.ok(sawReturn,'the builder returns underground for resources');assert.equal(s.towerHeight,60);assert.ok(s.depth>=100);
}));


test('tower courses enforce walls and a central ladder',()=>{
 const courses=[['wall','air','ladder','air','door'],['window','air','ladder','air','wall']];const p={towerLevel:0,towerX:0};
 assert.equal(minerTowerMove(courses,p,0,-1),true);assert.equal(minerTowerMove(courses,p,1,0),true);assert.equal(minerTowerMove(courses,p,0,-1),false,'climbing requires the ladder');assert.equal(minerTowerMove(courses,p,-1,0),true);assert.equal(minerTowerMove(courses,p,0,-1),true);assert.equal(minerTowerMove(courses,p,-1,0),true);assert.equal(minerTowerMove(courses,p,-1,0),false,'windows block passage');
});

test('Deep Digger emits mining and crafting sounds only when actions complete',()=>seeded(42,()=>{
 const cues=[],g=miner(name=>cues.push(name));g.input('r',true);g.input('g',true);g.input('b',true);assert.deepEqual(cues,[]);reachRightTree(g);g.input('x',true);g.input('ArrowRight',true);g.input('ArrowRight',false);g.input('x',false);assert.deepEqual(cues,[]);g.update(3,false);assert.deepEqual(cues,['deep-mine']);move(g,'ArrowRight');mine(g,'ArrowUp');for(let i=0;i<10;i++){const s=g.snapshot();if(s.world[2][s.p.x-1]!==0)mine(g,'ArrowLeft');move(g,'ArrowLeft')}mine(g,'ArrowLeft');assert.ok(cues.includes('deep-craft'));assert.ok(cues.filter(x=>x==='deep-mine').length>=3);
}));

test('Deep Digger preview emits late milestones to its optional sink',()=>seeded(42,()=>{
 const cues=[],g=miner(name=>cues.push(name));for(let i=0;i<60*180;i++){g.update(1/60,true);if(g.snapshot().towerHeight>0)break}
 for(const cue of ['deep-ore','deep-golem','deep-gate','deep-build'])assert.ok(cues.includes(cue),cue);
}));


test('tower gravity lands on a floor or falls back to the surface',()=>{
 const rows=Array.from({length:6},()=>['wall','air','ladder','air','wall']);rows[1][1]='floor';const p={towerLevel:6,towerX:-1};
 for(let i=0;i<3;i++)assert.equal(minerTowerGravity(rows,p),0);assert.equal(p.towerLevel,3);assert.equal(minerTowerGravity(rows,p),0);assert.equal(p.towerLevel,3,'the floor beneath supports the miner');
 const q={towerLevel:2,towerX:1,x:5,y:0};assert.equal(minerTowerGravity(rows,q),0);assert.equal(minerTowerGravity(rows,q),0);assert.equal(q.towerLevel,0);assert.equal(q.towerX,0);assert.equal(q.x,5,'landing preserves the tower column');
});

test('tower camera renders full-size cells and follows upper courses',()=>{
 const rows=Array.from({length:60},()=>['wall','air','ladder','air','wall']),rects=[];const c={fillRect(x,y,w,h){rects.push({x,y,w,h})}};
 drawMinerTower(c,rows,{towerLevel:50,towerX:0});assert.ok(rects.some(r=>r.w===21&&r.h===21),'walls use full-size tiles');assert.ok(rects.some(r=>r.w===14&&r.h===12&&r.y>=50&&r.y<500),'climber remains in the camera');
});


test('manual miner opens a tower wall after timed mining',()=>seeded(42,()=>{
 const g=miner();let s,row,half;for(let i=0;i<60*400;i++){g.update(1/60,true);if(i<6000||i%3)continue;s=g.snapshot();row=s.towerCourses[s.p.towerLevel-1];if(!row||s.p.towerX!==0)continue;half=(row.length-1)/2;if(row[half+1]==='floor'&&['wall','window'].includes(row[half*2]))break}
 assert.ok(row&&row[half+1]==='floor');for(let i=1;i<half;i++)move(g,'ArrowRight');s=g.snapshot();const x=s.p.x+1,y=s.p.y,old=s.towerWorld[y][x];g.input('x',true);g.input('ArrowRight',true);g.input('x',false);s=g.snapshot();assert.equal(s.mining.v,old);g.update(s.mining.total/2,false);assert.equal(g.snapshot().towerWorld[y][x],old);g.update(s.mining.total,false);s=g.snapshot();assert.equal(s.towerWorld[y][x],'air');assert.equal(s.towerCourses[s.p.towerLevel-1][half*2],'air');move(g,'ArrowRight');assert.equal(g.snapshot().p.x,x);
}));

test('sky weather warns before storms and exposes the tower top to lightning',()=>{
 const w={phase:'clear',timer:.01,strikeTimer:140/60,strikes:0,boltX:0,boltTime:0},p={x:4,y:-8};assert.equal(minerSkyWeatherStep(w,.02,10,p).kind,'warning');assert.equal(minerSkyWeatherStep(w,4.01,10,p).kind,'storm');assert.equal(minerSkyWeatherStep(w,140/60+.001,10,p).damage,0);const strike=minerSkyWeatherStep(w,140/60+.001,10,p);assert.equal(strike.x,4);assert.equal(strike.damage,1.5);w.strikes=1;w.strikeTimer=.01;p.y=-58;assert.equal(minerSkyWeatherStep(w,.02,60,p,[],{'-59':{4:'beacon'}}).kind,'crown');
});


test('lightning stops at a treetop and only hits exposed creatures',()=>{
 const weather={phase:'storm',timer:10,strikeTimer:.01,strikes:0,boltTime:0},world=[[0,4],[0,4],[0,4]],p={x:1,y:1};const event=minerSkyWeatherStep(weather,.02,0,p,world,{});assert.equal(event.x,1);assert.equal(event.impactY,0);assert.equal(event.damage,0);assert.equal(minerLightningHits(event,{x:1,y:0}),true);assert.equal(minerLightningHits(event,{x:1,y:1}),false);assert.equal(minerLightningHits(event,{x:2,y:0}),false);
});


test('surface predators pursue above ground, ignore caves and eventually leave',()=>{
 const wolf={kind:'WOLF',x:1,y:2,age:0,touchCd:0},p={x:4,y:2};minerSurfacePredatorStep(wolf,p,1);assert.ok(wolf.x>1);const before=wolf.x;p.y=8;minerSurfacePredatorStep(wolf,p,1);assert.equal(wolf.x,before);wolf.age=45;assert.equal(minerSurfacePredatorStep(wolf,p,.1),'depart');const harpy={kind:'HARPY',x:3,y:-5,age:0,touchCd:0};p.y=-2;minerSurfacePredatorStep(harpy,p,1);assert.ok(harpy.y>-5);harpy.x=4;harpy.y=-2;assert.equal(minerSurfacePredatorStep(harpy,p,.01),'hit');
});

test('arrows can travel through open sky to a flying target',()=>{
 const shot={x:4.5,y:-3.5,vx:0,vy:-2,ttl:2},target={x:4,y:-5};assert.equal(minerProjectileStep([],shot,target,1),'hit');
});


test('manual player can defeat a surface predator spawned during tower construction',()=>seeded(42,()=>{
 const g=miner();let s;for(let i=0;i<60*1800;i++){g.update(1/60,true);if(i%6===0){s=g.snapshot();if(s.surfaceMob&&s.p.y===2)break}}assert.ok(s.surfaceMob&&s.p.y===2,'predator must actually meet the player on the surface');for(let i=0;i<120&&g.snapshot().surfaceMob;i++){g.input('x',true);g.update(.1,false);g.input('x',false)}s=g.snapshot();assert.equal(s.surfaceMob,null);assert.equal(s.gameOver,false);
}));


test('night follows the reference cycle and harpies initiate a timed swoop',()=>{
 assert.equal(minerIsNight(0),true);assert.equal(minerIsNight(.5),false);const harpy={kind:'HARPY',x:2,y:-4,age:0,touchCd:0},p={x:5,y:-4};minerSurfacePredatorStep(harpy,p,1/60);assert.equal(harpy.lunge,1.5);assert.ok(harpy.vx>0);for(let i=0;i<91;i++)minerSurfacePredatorStep(harpy,{x:5,y:8},1/60);assert.equal(harpy.lunge,0,'the swoop expires while the miner is underground');
});


test('completed tower places a physical mineable lightning crown',()=>seeded(42,()=>{
 const g=miner();let s;for(let i=0;i<60*1800;i++){g.update(1/60,true);if(i%6===0){s=g.snapshot();if(s.towerHeight===60)break}}assert.equal(s.towerHeight,60);assert.equal(s.towerWorld['-59']['4'],'beacon');while(g.snapshot().p.towerLevel<60)move(g,'ArrowUp');g.input('x',true);g.input('ArrowUp',true);g.input('x',false);s=g.snapshot();assert.equal(s.mining.v,'beacon');g.update(s.mining.total/2,false);assert.equal(g.snapshot().towerWorld['-59']['4'],'beacon');g.update(s.mining.total,false);s=g.snapshot();assert.equal(s.towerWorld['-59']['4'],'air');const w={phase:'storm',timer:10,strikeTimer:.01,strikes:1,boltTime:0};const event=minerSkyWeatherStep(w,.02,60,s.p,s.world,s.towerWorld);assert.equal(event.kind,'strike');assert.equal(event.damage,1.5);
}));


test('tower walls block sky shots and line of sight until mined open',()=>{const map={'-4':{3:'wall',4:'ladder',5:'floor',6:'window'}},p={x:4,y:-4},enemy={x:7,y:-4};assert.equal(minerLineClear([],p,enemy,map),false);let arrow={x:4.5,y:-3.5,vx:3,vy:0,ttl:2};assert.equal(minerProjectileStep([],arrow,enemy,1,map),'wall');map['-4'][6]='air';assert.equal(minerLineClear([],p,enemy,map),true);arrow={x:4.5,y:-3.5,vx:3,vy:0,ttl:2};assert.equal(minerProjectileStep([],arrow,enemy,1,map),'hit');});


test('tower camera places surface and first course in the same full-scale view',()=>{const rows=[['wall','air','ladder','air','door']],world=[[],[],[0,4]],rects=[];const c={fillRect(x,y,w,h){rects.push({x,y,w,h})}};drawMinerTower(c,rows,{towerLevel:0,towerX:0},{},world);const player=rects.find(r=>r.w===14&&r.h===12);assert.ok(player.y>=50&&player.y<500);assert.ok(rects.some(r=>r.w===21&&r.h===21),'first-course wall is full-size at ground level');assert.ok(rects.some(r=>r.w===30&&r.h===15),'nearby trees remain visible');});


test('manual climber replaces a mined tower rung when climbing back up',()=>seeded(42,()=>{const g=miner();let s;for(let i=0;i<60*200;i++){g.update(1/60,true);if(i%6===0){s=g.snapshot();if(s.p.towerLevel>=2)break}}assert.ok(s.p.towerLevel>=2);move(g,'ArrowDown');s=g.snapshot();const next=s.p.towerLevel+1,y=2-next,stock=s.ladder;g.input('x',true);g.input('ArrowUp',true);g.input('x',false);s=g.snapshot();assert.equal(s.mining.v,'ladder');g.update(s.mining.total+.01,false);s=g.snapshot();assert.equal(s.towerWorld[y][4],'air');assert.equal(s.ladder,stock+1);move(g,'ArrowUp');s=g.snapshot();assert.equal(s.p.towerLevel,next);assert.equal(s.towerWorld[y][4],'ladder');assert.equal(s.ladder,stock)}));


test('AI repairs a missing tower rung during continued construction',()=>seeded(42,()=>{const g=miner();let s;for(let i=0;i<60*200;i++){g.update(1/60,true);if(i%6===0){s=g.snapshot();if(s.p.towerLevel>=2)break}}assert.ok(s.p.towerLevel>=2);move(g,'ArrowDown');s=g.snapshot();const y=s.p.y-1,oldHeight=s.towerHeight;g.input('x',true);g.input('ArrowUp',true);g.input('x',false);g.update(g.snapshot().mining.total+.01,false);assert.equal(g.snapshot().towerWorld[y][4],'air');let repaired=false;for(let i=0;i<60*300;i++){g.update(1/60,true);if(i%20===0){s=g.snapshot();if(s.towerWorld[y]?.[4]==='ladder'&&s.towerHeight>oldHeight){repaired=true;break}}}assert.ok(repaired)}));


test('tower tile overrides surface terrain for projectiles and sight',()=>{const world=[[],[0,0,0,0,0,4,0,0,0,0]],tower={1:{4:'ladder',5:'air',6:'wall'}};assert.equal(minerWorldTile(world,tower,5,1),0);assert.equal(minerWorldTile(world,tower,6,1),10);assert.equal(minerLineClear(world,{x:4,y:1},{x:7,y:1},tower),false);tower[1][6]='air';assert.equal(minerLineClear(world,{x:4,y:1},{x:7,y:1},tower),true)});

test('storm clear intervals use reference seeded timing formula',()=>{for(const seed of [1,42,1234]){const first=minerSkyDelay(seed,0),next=minerSkyDelay(seed,1);assert.ok(first>=60&&first<100);assert.ok(next>=120&&next<180);const n=Math.sin((seed*3+7)*127.1+11*311.7)*43758.5453;assert.equal(first,(3600+Math.floor((n-Math.floor(n))*2400))/60)}assert.notEqual(minerSkyDelay(1,0),minerSkyDelay(42,0))});


test('golem milestone advances 80m on spawn and armor mitigates repeated manual hits',()=>seeded(42,()=>{const g=miner();let s;for(let i=0;i<60*200;i++){g.update(1/60,true);if(i%3===0){s=g.snapshot();if(s.boss)break}}assert.ok(s.boss);assert.equal(s.boss.hp,10+2*Math.floor(s.depth/50));assert.equal(s.nextGolemDepth,s.depth+80);assert.equal(s.armor,3);const initial=s.hp;for(let i=0;i<600;i++){g.update(1/60,false);s=g.snapshot();if(s.hp<initial)break}assert.ok(Math.abs(s.hp-(initial-minerDamageAmount(2,3)))<1e-8);assert.equal(s.armor,3);assert.ok(s.mealInv>1);const once=s.hp;for(let i=0;i<30;i++)g.update(1/60,false);s=g.snapshot();assert.equal(s.hp,once,'contact invulnerability applies across attacks');assert.equal(s.armor,3)}));


test('tower falls scale up to three raw damage and armor mitigates environmental hits',()=>{const rows=Array.from({length:8},()=>['wall','air','ladder','air','wall']),p={towerLevel:7,towerX:1};for(let i=0;i<6;i++)assert.equal(minerTowerGravity(rows,p),0);assert.equal(minerTowerGravity(rows,p),3);assert.equal(minerDamageAmount(3,2),2.1);assert.equal(minerDamageAmount(1,3),.5);assert.equal(minerDamageAmount(2,0),2)});


test('a surviving golem crumbles after the reference 60-second lifetime',()=>{const g={age:0};assert.equal(minerAgeGolem(g,30),false);assert.equal(minerAgeGolem(g,30),false);assert.equal(minerAgeGolem(g,1/60),true)});


test('creeper windup stops without sight and explosion preserves protected ore',()=>{const w=Array.from({length:9},()=>Array(10).fill(1));w[5][4]=w[5][5]=0;w[4][5]=5;w[6][5]=11;w[5][6]=12;const e={x:5,y:5,charge:0},p={x:4,y:5};assert.equal(minerCreeperStep(w,e,p,.5),'charging');assert.ok(e.charge>0);p.x=1;assert.equal(minerCreeperStep(w,e,p,.3),'waiting');assert.equal(e.charge,0);p.x=4;assert.equal(minerCreeperStep(w,e,p,1),'explode');assert.equal(w[4][5],5);assert.equal(w[6][5],11);assert.equal(w[5][6],12);assert.equal(w[4][4],0)});

test('manual miner sees and survives an unchecked creeper blast',()=>seeded(1,()=>{const g=miner(()=>{},{dynamicSpawns:false});let s;for(let i=0;i<60*150;i++){g.update(1/60,true);if(i%3===0){s=g.snapshot();if(s.mob?.kind==='CREEPER'&&!s.stairTransit)break}}assert.equal(s.mob?.kind,'CREEPER');const hp=s.hp,armor=s.armor;for(let i=0;i<120&&g.snapshot().mob;i++)g.update(1/60,false);s=g.snapshot();assert.equal(s.mob,null);assert.ok(Math.abs(s.hp-(hp-minerDamageAmount(3,armor)))<1e-8);assert.equal(s.gameOver,false)}));


test('spider pounces only with clear sight and waits for its cooldown',()=>{const w=Array.from({length:8},()=>Array(10).fill(0)),spider={x:2,y:4},p={x:5,y:4};w[4][3]=1;assert.equal(minerSpiderStep(w,spider,p,1/60),'waiting');w[4][3]=0;assert.equal(minerSpiderStep(w,spider,p,1/60),'pounce');assert.equal(spider.x,3);assert.equal(minerSpiderStep(w,spider,p,1/60),'waiting');assert.ok(spider.lunge>1.7)});

test('manual spider defeat yields silk usable for emergency climbing',()=>{
 const w=Array.from({length:34},(_,y)=>Array(20).fill(y<3?0:1));for(let x=2;x<12;x++)w[4][x]=0;const spider={kind:'SPIDER',x:8,y:4,hp:1,t:0,age:0,shotCd:1.8,stun:100,lunge:0};const g=miner(()=>{},{initialWorld:w,initialPosition:{x:5,y:4},initialEnemies:[spider],initialCombat:{tool:2,ammo:5},dynamicSpawns:false});g.input('x',true);g.update(1/60,false);g.input('x',false);let s;for(let i=0;i<90;i++){g.update(1/60,false);s=g.snapshot();if(!s.mob)break}assert.equal(s.mob,null);assert.ok(s.silk>0,'the physically defeated spider drops silk');const world=[[1,1,1],[1,0,1],[1,0,1],[1,1,1]],p={x:1,y:2},stock={ladder:0,wood:0,stone:0,silk:1};assert.equal(minerClimbUp(world,p,stock),true);assert.equal(stock.silk,0);assert.equal(stock.rope,1);assert.equal(world[2][1],15);
});

test('silk makes anchored rope and climbing extends it before stepping off the top',()=>{const w=Array.from({length:7},()=>Array(5).fill(0));w[5][2]=1;const p={x:2,y:4,fall:0},stock={ladder:0,wood:0,stone:0,silk:2,rope:0};assert.equal(minerClimbUp(w,p,stock),true);assert.equal(w[4][2],15);assert.equal(stock.rope,1);assert.equal(minerSupported(w,p.x,p.y),false,'a rope below does not support an empty cell');p.y=4;assert.equal(minerClimbUp(w,p,stock),true);assert.equal(w[3][2],15);assert.equal(stock.rope,0);assert.equal(minerSupported(w,p.x,p.y),true);assert.equal(minerClimbUp(w,p,stock),true);assert.equal(w[2][2],15);assert.equal(stock.silk,0)});

test('rope placement requires an anchor and prefers wood ladders when available',()=>{const w=Array.from({length:6},()=>Array(5).fill(0)),p={x:2,y:3},stock={ladder:0,wood:0,stone:0,silk:1,rope:0};assert.equal(minerClimbUp(w,p,stock),false);assert.equal(stock.silk,1);w[4][2]=1;stock.wood=1;assert.equal(minerClimbUp(w,p,stock),true);assert.equal(w[3][2],9);assert.equal(stock.ladder,2);assert.equal(stock.silk,1)});


test('AI catches an anchored fall while manual play continues to fall',()=>{const make=()=>{const world=Array.from({length:8},()=>Array(5).fill(0));world[2][2]=15;return world};const stock={ladder:0,wood:0,stone:0,silk:1,rope:0},p={x:2,y:3,fall:2};const manual=make();assert.equal(minerFallCatch(manual,p,stock,false),false);assert.equal(p.fall,2);assert.equal(stock.silk,1);const world=make();assert.equal(minerFallCatch(world,p,stock,true),true);assert.equal(world[3][2],15);assert.equal(p.fall,0);assert.equal(stock.rope,1);assert.equal(minerSupported(world,2,3),true);const unanchored=make();unanchored[2][2]=0;const q={x:2,y:3,fall:2},supplies={ladder:0,rope:1,wood:0,stone:0,silk:0};assert.equal(minerFallCatch(unanchored,q,supplies,true),false);assert.equal(supplies.rope,1)});


test('mixed cave spawn chooses depth-scaled enemies only in reachable open cells',()=>{assert.equal(minerCaveKind(.1,20),'CREEPER');assert.equal(minerCaveKind(.3,20),'SKELETON');assert.equal(minerCaveKind(.5,20),'ZOMBIE');assert.equal(minerCaveKind(.5,50),'SPIDER');const w=Array.from({length:25},()=>Array(10).fill(1));for(let y=5;y<=18;y++)w[y][5]=0;const p={x:5,y:18},before=structuredClone(w),mob=minerCaveSpawn(w,p,100,.5,0);assert.equal(mob.kind,'SPIDER');assert.equal(mob.hp,4);assert.ok(minerEnemyRoute(w,mob,p)?.length);assert.deepEqual(w,before,'spawning does not carve the cave');for(let y=5;y<18;y++)w[y][5]=1;assert.equal(minerCaveSpawn(w,p,100,.1,0),null)});

test('manual player can fight a dynamically spawned cave enemy',()=>seeded(1,()=>{const g=miner();let s;for(let i=0;i<60*120;i++){g.update(1/60,true);if(i%3===0){s=g.snapshot();if(s.mob?.ambient)break}}assert.ok(s.mob?.ambient);const hp=s.hp;for(let i=0;i<600&&g.snapshot().mob?.ambient;i++){g.input('x',true);g.update(1/60,false);g.input('x',false)}s=g.snapshot();assert.ok(!s.mob?.ambient);assert.equal(s.gameOver,false);assert.ok(s.hp<=hp)}));


test('manual bow targets the nearer of concurrent cave enemies',()=>{
 const w=Array.from({length:34},(_,y)=>Array(20).fill(y<3?0:1));for(let x=2;x<18;x++)w[4][x]=0;const enemy=x=>({kind:'ZOMBIE',x,y:4,hp:3,t:0,age:0,shotCd:1.8,stun:100});const g=miner(()=>{},{initialWorld:w,initialPosition:{x:5,y:4},initialEnemies:[enemy(12),enemy(8)],initialCombat:{tool:2,ammo:5},dynamicSpawns:false});const before=g.snapshot();assert.equal(before.mobs.length,2);g.input('x',true);g.update(1/60,false);g.input('x',false);let s=g.snapshot();assert.equal(s.ammo,4);assert.equal(s.projectiles.length,1);for(let i=0;i<60;i++){g.update(1/60,false);s=g.snapshot();if(s.mobs[1].hp<before.mobs[1].hp)break}assert.ok(s.mobs[1].hp<before.mobs[1].hp,'the nearer second-listed enemy takes the arrow');assert.equal(s.mobs[0].hp,before.mobs[0].hp,'the farther first-listed enemy is unharmed');
});

test('AI survives concurrent cave enemies and completes the full tower across seeds',()=>{let traded=0;for(const seed of [1,7,42,99,12345])seeded(seed,()=>{const g=miner();let max=0,s;for(let i=0;i<60*1800;i++){g.update(1/60,true);if(i%60===0){s=g.snapshot();max=Math.max(max,s.mobs.length+(s.boss?1:0));if(s.towerHeight===60)break}}assert.ok(max>=2,`seed ${seed} did not encounter concurrent threats`);assert.equal(s.towerHeight,60,`seed ${seed} did not complete the tower`);traded+=s.caravans;if(seed!==12345)assert.ok(s.quarryMines>0,`seed ${seed} did not gather stone from cave walls`);assert.ok(s.stairDigs>0&&s.stairMoves>0,`seed ${seed} did not physically dig and descend a stair`);if([1,99].includes(seed))assert.ok(s.gateReturns>0,`seed ${seed} did not physically return through a gate`)});assert.ok(traded>0,'seeded runs physically trade gold')});


test('AI turns spare wood into ladders and finishes the former seed 7 stall',()=>seeded(7,()=>{const g=miner();let shortage=false,s;for(let i=0;i<60*1800;i++){g.update(1/60,true);if(i%3===0){s=g.snapshot();shortage||=s.towerHeight>0&&s.towerHeight<60&&s.ladder===0&&s.wood>0&&s.stone>=10;if(s.towerHeight===60)break}}assert.ok(shortage,'builder encountered a ladder shortage with wood available');assert.equal(s.towerHeight,60)}));


test('AI prioritizes nearby threats within reference combat ranges',()=>{const p={x:0,y:0},z={kind:'ZOMBIE',x:8,y:0},sk={kind:'SKELETON',x:9,y:0};assert.equal(minerNearestThreat([z,sk],p),sk,'a distant zombie does not mask an in-range skeleton');assert.equal(minerNearestThreat([sk],p,true),null,'homeward travel ignores a far threat');sk.x=4;assert.equal(minerNearestThreat([sk],p,true),sk,'homeward travel still fights a close threat')});


test('enemy retirement uses the reference vertical separation threshold',()=>{const p={y:10};assert.equal(minerWithinMobRange({y:72},p),true);assert.equal(minerWithinMobRange({y:72.5},p),false);assert.equal(minerWithinMobRange({y:-53},p),false)});

test('manual gate return retires distant cave mobs without defeating the miner',()=>seeded(2,()=>{const g=miner();let s;for(let i=0;i<60*300;i++){g.update(1/60,true);if(i%3===0){s=g.snapshot();if(s.gateChannel>0&&s.p.y>70&&s.mobs.length)break}}assert.ok(s.gateChannel>0&&s.mobs.length>0);const home=s.homeGate;for(let i=0;i<60;i++)g.update(1/60,false);s=g.snapshot();assert.deepEqual({x:s.p.x,y:s.p.y},home);assert.equal(s.mobs.length,0);assert.equal(s.gameOver,false)}));


test('manual melee stuns a surviving cave enemy but not a golem',()=>seeded(42,()=>{const g=miner(()=>{},{dynamicSpawns:false,initialWorld:manualShaft(),initialPosition:{x:5,y:2}});for(const d of ['ArrowLeft','ArrowRight','ArrowUp'])mine(g,d);for(let i=0;i<20;i++){mine(g,'ArrowDown');move(g,'ArrowDown')}g.update(1.01,false);const before=g.snapshot();assert.equal(before.mob.kind,'ZOMBIE');assert.equal(Math.abs(before.mob.x-before.p.x),1);g.input('x',true);assert.equal(g.snapshot().mob.hp,before.mob.hp,'attack waits for the manual tick');g.update(1/60,false);g.input('x',false);const hit=g.snapshot();assert.equal(hit.mob.hp,1);assert.equal(hit.mob.stun,.3);g.update(.2,false);const held=g.snapshot();assert.deepEqual([held.mob.x,held.mob.y],[hit.mob.x,hit.mob.y]);assert.ok(held.mob.stun>0);g.update(.2,false);assert.equal(g.snapshot().mob.stun,0);const boss={kind:'GOLEM'};minerStagger(boss);assert.equal(boss.stun,undefined)}));


test('cave enemy speeds vary by kind and water slows their traversal',()=>{assert.ok(minerMobTravelSeconds('SPIDER')<minerMobTravelSeconds('CREEPER'));assert.ok(minerMobTravelSeconds('CREEPER')<minerMobTravelSeconds('ZOMBIE'));assert.ok(minerMobTravelSeconds('ZOMBIE')<minerMobTravelSeconds('SKELETON'));assert.ok(Math.abs(minerMobTravelSeconds('ZOMBIE',true)*.55-minerMobTravelSeconds('ZOMBIE'))<1e-9)});

test('a manual miner sees a zombie advance at the reference-derived pace',()=>seeded(42,()=>{const g=miner(()=>{},{dynamicSpawns:false,initialWorld:manualShaft(),initialPosition:{x:5,y:2}});for(const d of ['ArrowLeft','ArrowRight','ArrowUp'])mine(g,d);for(let i=0;i<20;i++){mine(g,'ArrowDown');move(g,'ArrowDown')}let s=g.snapshot();assert.equal(s.mob.kind,'ZOMBIE');const x=s.mob.x;g.update(.4,false);assert.equal(g.snapshot().mob.x,x);g.update(.3,false);assert.equal(g.snapshot().mob.x,x-1)}));


test('manual creeper kill supplies powder for a coal-powered TNT trap',()=>seeded(42,()=>{
 const w=Array.from({length:34},(_,y)=>Array(20).fill(y<3?0:1));for(let x=2;x<12;x++)w[4][x]=0;const creeper={kind:'CREEPER',x:8,y:4,hp:1,t:0,age:0,shotCd:1.8,stun:100,charge:0};const g=miner(()=>{},{initialWorld:w,initialPosition:{x:5,y:4},initialEnemies:[creeper],initialCombat:{tool:2,ammo:5,coal:1},dynamicSpawns:false});g.input('x',true);g.update(1/60,false);g.input('x',false);let s;for(let i=0;i<90;i++){g.update(1/60,false);s=g.snapshot();if(s.powder>0)break}assert.ok(s.powder>0&&s.coal>0,'a real arrow defeats the creeper and drops powder');const powder=s.powder,coal=s.coal;g.input('z',true);s=g.snapshot();assert.equal(s.traps.at(-1).kind,'tnt');assert.equal(s.traps.at(-1).uses,1);assert.equal(s.powder,powder-1);assert.equal(s.coal,coal-1);
}));

test('TNT blast targets all nearby enemies and can hurt its owner',()=>{const trap={x:4,y:6},inside={x:7,y:6},outside={x:8,y:6},p={x:4,y:8};let hit=minerTntTargets(trap,[inside,outside],p);assert.deepEqual(hit.enemies,[inside]);assert.equal(hit.player,true);p.y=9;hit=minerTntTargets(trap,[inside,outside],p);assert.equal(hit.player,false)});


test('manual TNT trap detonates when a surface wolf crosses it',()=>{
 const w=Array.from({length:34},(_,y)=>Array(20).fill(y<3?0:1)),courses=[['wall','air','ladder','air','wall']],cues=[],wolf={kind:'WOLF',x:13,y:2,hp:3,age:0,touchCd:0,vx:0,vy:0};const g=miner(c=>cues.push(c),{initialWorld:w,initialTower:{courses,level:0,x:0,stock:{ladder:0,wood:0,stone:0,rope:0,silk:0}},initialPosition:{x:10,y:2},initialGates:{home:{x:17,y:2},deep:[{x:7,y:20}]},initialCombat:{tool:2,ammo:0,coal:1,powder:1},initialSurfaceMob:wolf,dynamicSpawns:false});g.input('z',true);g.input('z',false);const armed=g.snapshot(),trap=armed.traps.at(-1);assert.equal(trap.kind,'tnt');assert.equal(trap.x,11);assert.ok(armed.surfaceMob.x>trap.x);let s;for(let i=0;i<300;i++){g.update(1/60,false);s=g.snapshot();if(s.traps[0].uses===0)break}assert.equal(s.traps[0].uses,0,'the approaching wolf triggers the placed trap');assert.equal(s.surfaceMob,null,'the blast defeats the wolf');assert.ok(s.hp<armed.hp,'the nearby owner is hurt');assert.equal(s.gameOver,false);assert.ok(cues.includes('deep-impact'));
});

test('starting rations and camp repair follow reference upkeep',()=>seeded(42,()=>{const g=miner();assert.equal(g.snapshot().food,2);harvestOpening(g);let s=g.snapshot();assert.equal(s.p.x,5);assert.equal(s.dur,s.durMax-1);g.update(2,false);assert.equal(g.snapshot().dur,s.durMax-1,'outside the camp does not repair');while(g.snapshot().p.x<8)move(g,'ArrowRight');g.update(1,false);assert.equal(g.snapshot().dur,s.durMax-1);g.update(.5,false);assert.equal(g.snapshot().dur,s.durMax)}));


test('manual gold mining and daylight camp caravan deliver the earned supplies',()=>{
 const w=Array.from({length:60},(_,y)=>Array(20).fill(y<3?0:1));for(let x=3;x<=6;x++)w[10][x]=0;w[10][6]=19;const home={x:17,y:2},deep={x:3,y:10},g=miner(()=>{},{initialWorld:w,initialPosition:{x:5,y:10},initialGates:{home,deep:[deep]},initialCombat:{tool:2,ammo:0},dynamicSpawns:false});g.input('x',true);g.input('ArrowRight',true);g.input('ArrowRight',false);g.input('x',false);let s=g.snapshot();assert.equal(s.mining.v,19);g.update(s.mining.total+.01,false);assert.equal(g.snapshot().gold,1,'manual mining collects gold');move(g,'ArrowLeft');move(g,'ArrowLeft');g.update(.01,false);assert.ok(g.snapshot().gateChannel>0);g.update(.7,false);s=g.snapshot();assert.deepEqual({x:s.p.x,y:s.p.y},home);const before=s;for(let i=0;i<20&&!minerCampNear(g.snapshot().p);i++)move(g,'ArrowLeft');assert.ok(minerCampNear(g.snapshot().p),'miner physically reaches camp');let after=g.snapshot();for(let i=0;i<60*40&&after.caravans===before.caravans;i++){g.update(1/60,false);after=g.snapshot()}assert.equal(after.caravans,before.caravans+1);assert.equal(after.gold,0);assert.equal(after.ammo,before.ammo+before.gold*3);assert.equal(after.torchStock,before.torchStock+before.gold*2);assert.equal(after.sapling,before.sapling+2);assert.equal(after.food,Math.min(4,before.food+Math.ceil(before.gold/2)));assert.equal(after.hp,5);
});

test('gold needs the reference hardness and weak-tool penalty',()=>{assert.equal(minerMiningSeconds(19,2),Math.ceil(74*.5)/60);assert.ok(minerMiningSeconds(19,1)>minerMiningSeconds(19,2));});


test('homeward route uses supported player moves and accounts for climb supplies',()=>{
 const world=[[1,1,1,1,1],[1,0,0,0,1],[1,0,1,0,1],[1,9,1,9,1],[1,9,1,9,1],[1,1,1,1,1]];
 const stock={ladder:2,wood:0,stone:0,rope:0,silk:0},before=structuredClone(world),gate={x:3,y:3};
 assert.equal(minerHomeRoute(world,{x:1,y:4},[gate],stock),null,'unsupported upper passage cannot be walked across');
 world[2][2]=9;world[2][3]=9;
 const path=minerHomeRoute(world,{x:1,y:4},[gate],stock);
 assert.ok(path);assert.deepEqual(path.gate,gate);assert.deepEqual(stock,{ladder:2,wood:0,stone:0,rope:0,silk:0});
 assert.equal(world[3][1],before[3][1],'planning does not mutate the real map');
});


test('homeward planner requires and preserves ladder supplies',()=>{
 const world=[[1,1,1],[1,0,1],[1,0,1],[1,0,1],[1,1,1]],start={x:1,y:3},gate={x:1,y:1};
 const empty={ladder:0,wood:0,stone:0,rope:0,silk:0};
 assert.equal(minerHomeRoute(world,start,[gate],empty),null);
 const stock={...empty,ladder:2};assert.deepEqual(minerHomeRoute(world,start,[gate],stock).path,[{x:1,y:2},{x:1,y:1}]);
 assert.equal(stock.ladder,2);assert.equal(world[3][1],0);
});



test('homeward routes prepare a physical plank or lava bridge before crossing',()=>{
 for(const [floor,cost] of [[0,1],[7,2]]){
  const world=[[1,1,1,1,1],[1,0,0,0,1],[1,1,floor,1,1],[1,1,1,1,1]], start={x:1,y:1},gate={x:3,y:1};
  const stock={ladder:0,wood:0,stone:cost,rope:0,silk:0};
  assert.equal(minerHomeRoute(world,start,[gate],{...stock,stone:cost-1},true),null);
  const route=minerHomeRoute(world,start,[gate],stock,true);assert.deepEqual(route.path,[{x:2,y:1},{x:3,y:1}]);
  assert.equal(world[2][2],floor);assert.equal(stock.stone,cost);
  assert.ok(minerPrepareLanding(world,2,1,stock));assert.equal(world[2][2],8);assert.equal(stock.stone,0);
  assert.equal(minerGravityStep(world,{x:2,y:1,fall:0}).moved,false);
 }
});


test('injured miner rests and recovers at the campfire at night',()=>{
 const w=Array.from({length:34},(_,y)=>Array(20).fill(y<3?0:1));const enemy={kind:'ZOMBIE',x:10,y:2,hp:1,t:0,age:0,shotCd:1.8,stun:0};const g=miner(()=>{},{initialWorld:w,initialEnemies:[enemy],dynamicSpawns:false});g.update(1/60,false);assert.ok(g.snapshot().hp<5,'enemy contact injures the miner');g.input('x',true);g.update(1/60,false);g.input('x',false);assert.equal(g.snapshot().mobs.length,0,'the miner defeats the attacker');let s;for(let i=0;i<60*50;i++){g.update(1/60,false);s=g.snapshot();if(minerIsNight(s.dayTime))break}assert.ok(minerCampNear(s.p)&&minerIsNight(s.dayTime)&&s.hp<5);const hp=s.hp,position={x:s.p.x,y:s.p.y};for(let i=0;i<60;i++)g.update(1/60,true);s=g.snapshot();assert.ok(s.hp>hp+.4,'campfire restores health over time');assert.deepEqual({x:s.p.x,y:s.p.y},position,'AI remains at camp while resting');const manualHp=s.hp;for(let i=0;i<30;i++)g.update(1/60,false);assert.ok(g.snapshot().hp>manualHp,'manual play also receives campfire healing');
});

test('homeward fallback plans a mineable obstruction without changing the world',()=>{
 const world=[[1,1,1,1,1],[1,0,2,0,1],[1,1,1,1,1]],before=structuredClone(world),stock={ladder:0,wood:0,stone:0,rope:0,silk:0};
 assert.equal(minerHomeRoute(world,{x:1,y:1},[{x:3,y:1}],stock,true),null);
 const route=minerHomeRoute(world,{x:1,y:1},[{x:3,y:1}],stock,true,true);assert.deepEqual(route.path,[{x:2,y:1},{x:3,y:1}]);assert.deepEqual(world,before);
});


test('homeward mining accounts for stone gained and prefers softer detours',()=>{
 const stock={ladder:0,wood:0,stone:0,rope:0,silk:0};
 const earned=[[1,1,1,1,1],[1,0,1,0,1],[1,1,1,0,1],[1,7,7,7,1],[1,1,1,1,1]];
 assert.deepEqual(minerHomeRoute(earned,{x:1,y:1},[{x:3,y:1}],stock,true,true,true).path,[{x:2,y:1},{x:3,y:1}]);
 const detour=[[1,1,1,1,1,1],[1,0,1,0,0,1],[1,0,11,0,0,1],[1,1,1,1,1,1],[1,1,1,1,1,1]];
 const route=minerHomeRoute(detour,{x:1,y:2},[{x:4,y:2}],{...stock,ladder:1,stone:2},true,true,true);
 assert.ok(route.path.some(p=>p.x===2&&p.y===1),'mine stone instead of crossing obsidian');assert.ok(!route.path.some(p=>p.x===2&&p.y===2));
});


test('homeward planner revisits a cell after mining stone to fund a bridge',()=>{
 const world=[[1,1,1,1,1],[1,1,0,0,1],[1,1,1,0,1],[1,7,7,7,1],[1,1,1,1,1]],stock={ladder:0,wood:0,stone:0,rope:0,silk:0,tool:0},before=structuredClone(world);
 const route=minerHomeRoute(world,{x:2,y:1},[{x:3,y:1}],stock,true,true,true);
 assert.deepEqual(route.path,[{x:1,y:1},{x:2,y:1},{x:3,y:1}]);assert.deepEqual(world,before);assert.equal(stock.stone,0);
});


test('homeward simulation accounts for automatic crafting after mining',()=>{
 const stock={stone:7,tool:1,wood:0,coal:0,iron:0,diamond:0,beacon:false};minerPlanMine(stock,1);assert.equal(stock.stone,0);assert.equal(stock.tool,2);
 const world=[[1,1,1,1,1],[1,0,1,0,1],[1,1,1,0,1],[1,7,7,7,1],[1,1,1,1,1]],s={ladder:0,wood:0,stone:7,rope:0,silk:0,tool:1};
 const route=minerHomeRoute(world,{x:1,y:1},[{x:3,y:1}],s,true,true,true);assert.equal(route,null,'automatic upgrade spends the newly mined stone before the bridge');
});


test('homeward simulation includes actual diamond stock and existing beacon',()=>{
 const stock={stone:7,tool:4,wood:0,coal:0,iron:0,diamond:3,beacon:false};minerPlanMine(stock,1);
 assert.equal(stock.stone,4);assert.equal(stock.diamond,0);assert.equal(stock.beacon,true);
 const built={stone:7,tool:4,wood:0,coal:0,iron:0,diamond:3,beacon:true};minerPlanMine(built,1);
 assert.equal(built.stone,8);assert.equal(built.diamond,3);
});


test('stair descent clears the side then the diagonal and requires footing',()=>{
 const w=[[1,1,1,1,1],[1,0,1,0,1],[1,1,1,0,1],[1,1,1,0,1]],p={x:1,y:1};
 assert.deepEqual(minerStairStep(w,p,1),{dx:1,dy:0,mine:true});w[1][2]=0;
 assert.deepEqual(minerStairStep(w,p,1),{dx:1,dy:1,mine:true});w[2][2]=0;
 assert.deepEqual(minerStairStep(w,p,1),{dx:1,dy:1,mine:false});w[3][2]=0;
 assert.equal(minerStairStep(w,p,1),null);
});


test('stair descent preserves portal cores and prepares lava bridges only with supplies',()=>{
 const p={x:1,y:1},w=[[1,1,1,1],[1,0,12,1],[1,1,1,1],[1,1,1,1]];
 assert.equal(minerStairStep(w,p,1,2),null,'portal cannot be mined or entered');
 w[1][2]=7;assert.equal(minerStairStep(w,p,1,1),null);assert.deepEqual(minerStairStep(w,p,1,2),{dx:1,dy:0,bridge:true});
 w[1][2]=0;w[2][2]=7;assert.deepEqual(minerStairStep(w,p,1,2),{dx:1,dy:1,bridge:true});
 w[2][2]=0;w[3][2]=7;assert.deepEqual(minerStairStep(w,p,1,2),{dx:1,dy:2,bridge:true});
 w[2][2]=12;assert.equal(minerStairStep(w,p,1,2),null,'portal below the side remains intact');
});


test('AI stair travel takes eight frames before reaching its destination',()=>seeded(42,()=>{
 const g=miner();let s;for(let i=0;i<60*150;i++){g.update(1/60,true);s=g.snapshot();if(s.stairTransit)break}
 assert.ok(s.stairTransit,'find a physical stair move');assert.equal(s.stairTransit.duration,8/60);assert.equal(minerStairDuration(6),12/60,'water uses the reference twelve-frame duration');
 const from={x:s.p.x,y:s.p.y},to={x:s.stairTransit.x,y:s.stairTransit.y};g.update(3/60,false);s=g.snapshot();assert.deepEqual({x:s.p.x,y:s.p.y},from);assert.ok(s.stairTransit);
 for(let i=0;i<4;i++)g.update(1/60,false);s=g.snapshot();assert.deepEqual({x:s.p.x,y:s.p.y},from,'seven frames do not complete movement');g.update(1/60,false);s=g.snapshot();assert.deepEqual({x:s.p.x,y:s.p.y},to,'movement commits on frame eight');assert.equal(s.stairTransit,null);
}));


test('manual torch tap during stair travel is applied on arrival',()=>seeded(42,()=>{
 const g=miner();let s;for(let i=0;i<60*150;i++){g.update(1/60,true);s=g.snapshot();if(s.stairTransit&&s.torchStock>0)break}
 assert.ok(s.stairTransit&&s.torchStock>0);const before=s.torchStock;g.input(' ',true);g.input(' ',false);assert.equal(g.snapshot().torchStock,before);
 for(let i=0;i<8;i++)g.update(1/60,false);s=g.snapshot();assert.equal(s.stairTransit,null);assert.equal(s.torchStock,before,'arrival does not consume the queued tap');g.update(1/60,false);s=g.snapshot();assert.equal(s.torchStock,before-1,'queued tap places a torch when movement finishes');
}));


test('moving miner projectile hitbox follows the interpolated stair position',()=>{
 const p={x:1,y:1},t={x:2,y:2,duration:8/60,left:4/60},moving=minerTransitPosition(p,t);
 assert.ok(moving.x>1.8&&moving.y>1.8);const world=Array.from({length:4},()=>[0,0,0,0]);
 const shot={x:2.5,y:2.5,vx:0,vy:0,ttl:1};assert.equal(minerProjectileStep(world,shot,moving,.01),'hit');
 const other={x:2.5,y:2.5,vx:0,vy:0,ttl:1};assert.equal(minerProjectileStep(world,other,p,.01),'flying');
});


test('AI mines obstructions during a physical homeward gate trip',()=>{
 const w=Array.from({length:60},(_,y)=>Array(10).fill(y<3?0:1));w[40][5]=0;const deep={x:3,y:40},home={x:2,y:2},courses=[['wall','air','ladder','air','wall']];const g=miner(()=>{},{initialWorld:w,initialPosition:{x:5,y:40},initialTower:{courses,level:0,x:1,stock:{ladder:0,wood:0,stone:40,silk:0,rope:0}},initialGates:{home,deep:[deep]},dynamicSpawns:false});let s;for(let i=0;i<60*30;i++){g.update(1/60,true);s=g.snapshot();if(s.homingMines>0&&s.gateReturns>0)break}assert.ok(s.homingMines>0,'miner physically starts a homeward mining action');assert.equal(s.world[40][4],0,'the obstruction is physically mined');assert.ok(s.gateReturns>0,'miner completes a gate return');assert.deepEqual({x:s.p.x,y:s.p.y},home);
});

test('manual trap tap during stair travel is applied on arrival',()=>seeded(42,()=>{
 const g=miner();let s;for(let i=0;i<60*180;i++){g.update(1/60,true);s=g.snapshot();if(s.stairTransit&&s.stone>=6){const {x,y}=s.stairTransit;if([[1,0],[-1,0],[0,-1],[0,1]].some(([dx,dy])=>[0,8].includes(s.world[y+dy]?.[x+dx])&&!s.traps.some(t=>t.x===x+dx&&t.y===y+dy&&t.uses>0)))break}}
 assert.ok(s.stairTransit&&s.stone>=6);const before=s.traps.length;g.input('z',true);g.input('z',false);assert.equal(g.snapshot().traps.length,before);
 for(let i=0;i<12;i++)g.update(1/60,false);s=g.snapshot();assert.equal(s.traps.length,before+1,'queued tap builds the trap after arrival');
}));


test('enemy contact follows physical player position during stair travel',()=>{
 const p={x:1,y:1},t={x:2,y:2,duration:8/60,left:4/60},z={x:2,y:2,kind:'ZOMBIE'};
 assert.equal(minerEnemyContact(z,p,null),false);assert.equal(minerEnemyContact(z,p,t),true);
 const old={x:1,y:1,kind:'ZOMBIE'};assert.equal(minerEnemyContact(old,p,t),false);
});


test('enemy contact uses reference radius on both sides of the arrival boundary',()=>{
 const z={x:1.9,y:1,kind:'ZOMBIE'},g={x:2.1,y:1,kind:'GOLEM'},p={x:1,y:1};
 assert.equal(minerEnemyContact(z,p,null),false);assert.equal(minerEnemyContact(g,p,null),true);
 const t={x:1,y:1,duration:8/60,left:0};assert.equal(minerEnemyContact(z,p,t),false);assert.equal(minerEnemyContact(g,p,t),true);
});

test('skeleton arrow aims at the moving physical position',()=>{
 const w=Array.from({length:8},()=>Array(10).fill(0)),e={x:1,y:1,shotCd:0},p={x:5,y:1},t={x:5,y:2,duration:8/60,left:4/60};
 const shot=minerSkeletonShot(w,e,minerTransitPosition(p,t),0,0);assert.ok(shot);assert.ok(shot.vy>0,'arrow leads toward the moving miner');
});


test('golem rock targets interpolated position and respects line of sight',()=>{
 const w=Array.from({length:8},()=>Array(10).fill(0)),e={x:1,y:1,shotCd:0},p={x:5,y:1},t={x:5,y:2,duration:8/60,left:4/60};
 const shot=minerGolemShot(w,e,minerTransitPosition(p,t),0);assert.ok(shot);assert.ok(shot.vy>0);
 w[1][3]=1;e.shotCd=0;assert.equal(minerGolemShot(w,e,p,0),null);
});


test('AI detects a repeated two-second cycle and guards its stair cells',()=>{
 const state={trail:[],penalties:new Map(),origin:null,breaks:0};let broken=false;
 for(let i=0;i<=10;i++)broken=minerCycleObserve(state,{x:i%2?2:1,y:2},i*.22)||broken;
 assert.ok(broken);assert.equal(state.breaks,1);assert.ok(state.penalties.get('2,2')>2.2);
 const world=[[1,1,1,1,1],[1,0,0,0,1],[1,1,1,1,1],[1,1,1,1,1]],p={x:2,y:1};
 const right=minerStairStep(world,p,1,0,(x,y)=>x===3);assert.equal(right.dx,-1,'avoided side forces the other stair direction');
});


test('detected cycle selects a reachable three-cell escape',()=>{
 const state={trail:[],penalties:new Map(),origin:null,breaks:0};for(let i=0;i<=10;i++)minerCycleObserve(state,{x:i%2?2:1,y:2},i*.22);
 const world=[[1,1,1,1,1,1,1],[1,0,0,0,0,0,1],[1,0,0,0,0,0,1],[1,1,1,1,1,1,1]],p={x:1,y:2},stock={ladder:0,wood:0,stone:0,rope:0,silk:0,tool:0};
 const route=minerCycleEscapeRoute(world,p,stock,state,2.2);assert.ok(route);assert.deepEqual(route.gate,{x:4,y:2});assert.deepEqual(route.path,[{x:2,y:2},{x:3,y:2},{x:4,y:2}]);
});


test('cycle recovery expires at the surface and clamps edge escape targets',()=>{
 const state={origin:{x:2,y:4,until:6},penalties:new Map(),trail:[],breaks:0};assert.equal(minerCycleExpire(state,{x:2,y:2},6),true);assert.equal(state.origin,null);
 const w=[[1,1,1,1,1,1],[1,0,0,0,0,1],[1,1,1,1,1,1]],stock={ladder:0,wood:0,stone:0,rope:0,silk:0,tool:0};
 const route=minerCycleEscapeRoute(w,{x:2,y:1},stock,state,0);assert.ok(route);assert.ok(route.gate.x===1||route.gate.x===4);
});

test('cycle escape route prices nearby threats and penalized cells',()=>{
 const w=[[1,1,1,1,1,1,1,1,1],[1,0,0,0,0,0,0,0,1],[1,1,1,1,1,1,1,1,1]],stock={ladder:0,wood:0,stone:0,rope:0,silk:0,tool:0},state={penalties:new Map([['5,1',6]])};
 const route=minerCycleEscapeRoute(w,{x:4,y:1},stock,state,0,[{x:6,y:1}]);assert.ok(route);assert.equal(route.gate.x,1,'escape avoids the nearby enemy and penalized side');
});


test('cycle escape cannot cross a portal while homeward travel can reach one',()=>{
 const w=[[1,1,1,1,1,1,1],[1,0,12,0,0,0,1],[1,1,1,1,1,1,1]],p={x:1,y:1},stock={ladder:0,wood:0,stone:0,rope:0,silk:0,tool:0},state={penalties:new Map()};
 assert.equal(minerCycleEscapeRoute(w,p,stock,state,0),null,'escape cannot cross the portal core');
 const route=minerHomeRoute(w,p,[{x:2,y:1}],stock,true,false,true);assert.deepEqual(route.path,[{x:2,y:1}],'waygate remains a valid homeward destination');
});


test('waygate waits for a physical move to finish before beginning a channel',()=>{
 const p={x:2,y:5},gate={x:2,y:5},moving={x:3,y:6,duration:8/60,left:4/60};
 assert.equal(minerGateReady([gate],p,0,moving),false);assert.equal(minerGateReady([gate],p,0,null),true);assert.equal(minerGateReady([gate],p,1,null),false);
});

test('TNT checks the moving physical position for owner blast damage',()=>{
 const p={x:1,y:1},t={x:2,y:2,duration:8/60,left:4/60},trap={x:3,y:3};
 assert.equal(minerTntTargets(trap,[],p).player,false);assert.equal(minerTntTargets(trap,[],minerTransitPosition(p,t)).player,true);
});


test('ordinary AI movement commits after its physical travel interval',()=>seeded(42,()=>{
 const g=miner();let s;for(let i=0;i<60*150;i++){g.update(1/60,true);s=g.snapshot();if(s.stairTransit&&!s.stairTransit.stair)break}
 assert.ok(s.stairTransit&&!s.stairTransit.stair);const from={x:s.p.x,y:s.p.y},to={x:s.stairTransit.x,y:s.stairTransit.y},duration=s.stairTransit.duration;
 for(let i=0;i<Math.round(duration*60)-1;i++)g.update(1/60,false);s=g.snapshot();assert.deepEqual({x:s.p.x,y:s.p.y},from);
 g.update(1/60,false);s=g.snapshot();assert.deepEqual({x:s.p.x,y:s.p.y},to);
}));


test('held manual direction uses timed travel and stops after release',()=>seeded(42,()=>{
 const g=miner();const start=g.snapshot();assert.equal(start.p.x,10);g.input('ArrowRight',true);
 for(let i=0;i<7;i++)g.update(1/60,false);let s=g.snapshot();assert.equal(s.p.x,10,'position stays at the origin for seven frames');
 g.update(1/60,false);s=g.snapshot();assert.equal(s.p.x,11);assert.equal(s.stairTransit,null,'arrival completes before the next idle tick');g.update(1/60,false);s=g.snapshot();assert.ok(s.stairTransit,'held direction starts the next move');g.input('ArrowRight',false);
 for(let i=0;i<8;i++)g.update(1/60,false);s=g.snapshot();assert.equal(s.p.x,12);assert.equal(s.stairTransit,null,'releasing stops further movement');
}));


test('a committed move enters a destination even if its tile changes',()=>{
 const p={x:1,y:1,fall:0},move={x:2,y:1,air:0},w=[[0,0,0],[0,0,7]];assert.equal(minerFinishMove(w,p,move),7);assert.deepEqual({x:p.x,y:p.y},{x:2,y:1});
 p.x=1;w[1][2]=1;assert.equal(minerFinishMove(w,p,move),1);assert.equal(p.x,2);
});

test('held direction has priority over manual attack',()=>seeded(42,()=>{
 const cues=[],g=miner(name=>cues.push(name),{dynamicSpawns:false});for(const d of ['ArrowLeft','ArrowRight','ArrowUp'])mine(g,d);for(let i=0;i<80&&!g.snapshot().mob;i++){mine(g,'ArrowDown');move(g,'ArrowDown')}let s=g.snapshot();assert.ok(s.mob);const hp=s.mob.hp;g.input('ArrowDown',true);g.input('x',true);g.update(1/60,false);s=g.snapshot();assert.equal(s.mob.hp,hp,'attack does not fire while a direction is held');g.input('ArrowDown',false);g.input('x',false);
}));


test('torch tapped while falling waits for a later supported manual tick',()=>seeded(42,()=>{
 const g=miner();g.input('x',true);g.input('ArrowDown',true);g.input('ArrowDown',false);g.input('x',false);let s=g.snapshot();g.update(s.mining.total+.001,false);s=g.snapshot();assert.equal(minerSupported(s.world,s.p.x,s.p.y),false);
 const stock=s.torchStock;g.input(' ',true);g.input(' ',false);g.update(.12,false);s=g.snapshot();assert.equal(s.p.y,3);assert.equal(s.torchStock,stock,'fall tick does not consume the tap');
 g.update(1/60,false);assert.equal(g.snapshot().torchStock,stock-1,'the next supported manual tick places it');
}));


test('manual movement commits into newly solidified fluid and digs free on the next tick',()=>{
 const w=Array.from({length:240},()=>Array(10).fill(1));for(let y=0;y<3;y++)w[y].fill(0);w[1][6]=7;w[2][7]=6;
 const g=miner(()=>{},{initialWorld:w,initialPosition:{x:5,y:2},dynamicSpawns:false});g.input('ArrowRight',true);g.input('ArrowRight',false);
 for(let i=0;i<7;i++)g.update(1/60,false);let s=g.snapshot();assert.equal(s.p.x,5);assert.equal(s.world[2][6],1,'water and lava solidify the destination during travel');
 g.update(1/60,false);s=g.snapshot();assert.equal(s.p.x,6);assert.equal(s.world[2][6],1,'movement still commits into the changed cell');const before=s.stone;
 g.update(1/60,false);s=g.snapshot();assert.equal(s.world[2][6],0,'miner digs free on the next tick');assert.equal(s.stone,before+1);
});


test('movement into lava that flows during travel applies arrival damage',()=>{
 const w=Array.from({length:240},()=>Array(10).fill(1));for(let y=0;y<3;y++)w[y].fill(0);w[1][6]=7;
 const g=miner(()=>{},{initialWorld:w,initialPosition:{x:5,y:2},dynamicSpawns:false});g.input('ArrowRight',true);g.input('ArrowRight',false);
 for(let i=0;i<8;i++)g.update(1/60,false);let s=g.snapshot();assert.equal(s.p.x,6);assert.equal(s.world[2][6],7);assert.equal(s.hp,3);move(g,'ArrowLeft');s=g.snapshot();assert.ok(s.mealInv>0);g.input('ArrowRight',true);g.input('ArrowRight',false);assert.ok(g.snapshot().stairTransit,'temporary immunity permits entering known lava');
});


test('manual miner refuses to start a move into known lava without immunity',()=>{
 const w=Array.from({length:240},()=>Array(10).fill(1));for(let y=0;y<3;y++)w[y].fill(0);w[2][6]=7;
 const g=miner(()=>{},{initialWorld:w,initialPosition:{x:5,y:2},dynamicSpawns:false});g.input('ArrowRight',true);g.input('ArrowRight',false);const s=g.snapshot();assert.equal(s.stairTransit,null);assert.equal(s.p.x,5);assert.equal(s.hp,5);
});

test('origin solidification is cleared while a move is still in flight',()=>{
 const w=Array.from({length:240},()=>Array(10).fill(1));for(let y=0;y<3;y++)w[y].fill(0);w[1][5]=7;w[2][4]=6;
 const g=miner(()=>{},{initialWorld:w,initialPosition:{x:5,y:2},dynamicSpawns:false});g.input('ArrowRight',true);g.input('ArrowRight',false);
 for(let i=0;i<4;i++)g.update(1/60,false);let s=g.snapshot();assert.equal(s.world[2][5],1);assert.ok(s.stairTransit);const stock=s.stone;
 g.update(1/60,false);s=g.snapshot();assert.equal(s.world[2][5],0);assert.equal(s.stone,stock+1);assert.equal(s.p.x,5);assert.ok(s.stairTransit);
});

test('torch and trap taps during mining wait for the next idle manual tick',()=>{
 const w=Array.from({length:240},()=>Array(10).fill(1));for(let y=0;y<3;y++)w[y].fill(0);
 const g=miner(()=>{},{initialWorld:w,initialPosition:{x:5,y:2},dynamicSpawns:false});for(let i=0;i<6;i++){mine(g,'ArrowDown');move(g,'ArrowDown')}let s=g.snapshot();assert.ok(s.stone>=6);
 g.input('x',true);g.input('ArrowRight',true);g.input('ArrowRight',false);g.input('x',false);s=g.snapshot();assert.ok(s.mining);const total=s.mining.left,torch=s.torchStock,traps=s.traps.length;
 g.input(' ',true);g.input(' ',false);g.input('z',true);g.input('z',false);s=g.snapshot();assert.equal(s.torchStock,torch);assert.equal(s.traps.length,traps);
 g.update(total+.001,false);s=g.snapshot();assert.equal(s.mining,null);assert.equal(s.torchStock,torch);assert.equal(s.traps.length,traps);
 g.update(1/60,false);s=g.snapshot();assert.equal(s.torchStock,torch-1);assert.equal(s.traps.length,traps+1);
});


test('manual tower climb uses an eight-frame physical transition',()=>seeded(42,()=>{
 const g=miner();let s;for(let i=0;i<60*300;i++){g.update(1/60,true);if(i%3===0){s=g.snapshot();if(s.p.towerLevel>=2&&!s.stairTransit)break}}
 assert.ok(s.p.towerLevel>=2);const from=s.p.towerLevel;g.input('ArrowDown',true);g.input('ArrowDown',false);s=g.snapshot();assert.ok(s.stairTransit?.tower);
 for(let i=0;i<7;i++)g.update(1/60,false);assert.equal(g.snapshot().p.towerLevel,from);
 g.update(1/60,false);s=g.snapshot();assert.equal(s.p.towerLevel,from-1);assert.equal(s.stairTransit,null);
}));


test('held tower mining resumes on the idle tick after travel',()=>seeded(42,()=>{
 const g=miner();let s;for(let i=0;i<60*300;i++){g.update(1/60,true);if(i%3===0){s=g.snapshot();if(s.p.towerLevel>=2&&!s.stairTransit)break}}assert.ok(s.p.towerLevel>=2);
 g.input('ArrowDown',true);g.input('ArrowDown',false);g.input('x',true);g.input('ArrowUp',true);
 for(let i=0;i<8;i++)g.update(1/60,false);s=g.snapshot();assert.equal(s.mining,null,'arrival tick does not mine');
 g.update(1/60,false);s=g.snapshot();assert.equal(s.mining?.v,'ladder','held inputs begin mining on the following idle tick');g.input('ArrowUp',false);g.input('x',false);
}));

test('manual tower descent can step down off the ladder into open space',()=>seeded(42,()=>{
 const g=miner();let s,found=false;for(let i=0;i<60*600;i++){g.update(1/60,true);if(i%3)continue;s=g.snapshot();const level=s.p.towerLevel,half=(s.towerCourses[0]?.length-1)/2;if(level>1&&s.p.towerX===0&&!s.stairTransit&&s.towerCourses[level-1]?.[half+1]==='floor'&&s.towerCourses[level-2]?.[half+1]==='air'){found=true;break}}
 assert.ok(found,'find an open cell beneath a tower floor');move(g,'ArrowRight');s=g.snapshot();assert.equal(s.p.towerX,1);const level=s.p.towerLevel;
 g.input('ArrowDown',true);g.input('ArrowDown',false);s=g.snapshot();assert.ok(s.stairTransit?.tower);for(let i=0;i<8;i++)g.update(1/60,false);s=g.snapshot();assert.equal(s.p.towerLevel,level-1);assert.equal(s.p.towerX,1);
}));


test('manual off-ladder tower climb places an anchored rung and survives gravity',()=>seeded(42,()=>{
 const g=miner();let s,found=false;for(let i=0;i<60*600;i++){g.update(1/60,true);if(i%3)continue;s=g.snapshot();const level=s.p.towerLevel,half=(s.towerCourses[0]?.length-1)/2;if(level>0&&level<s.towerHeight&&s.p.towerX===0&&!s.stairTransit&&s.ladder>0&&s.towerCourses[level-1]?.[half+1]==='floor'&&s.towerCourses[level]?.[half+1]==='air'){found=true;break}}
 assert.ok(found,'find a tower floor with open air above');move(g,'ArrowRight');s=g.snapshot();const level=s.p.towerLevel,stock=s.ladder,x=s.p.x;assert.equal(s.p.towerX,1);
 g.input('ArrowUp',true);g.input('ArrowUp',false);s=g.snapshot();assert.equal(s.towerWorld[1-level][x],'ladder');assert.equal(s.ladder,stock-1);assert.ok(s.stairTransit?.tower);
 for(let i=0;i<8;i++)g.update(1/60,false);s=g.snapshot();assert.equal(s.p.towerLevel,level+1);assert.equal(s.p.towerX,1);g.update(.3,false);assert.equal(g.snapshot().p.towerLevel,level+1,'new rung holds against gravity');
}));


test('tower floor is passable from an off-center ladder',()=>{
 const courses=[['wall','floor','ladder','air','wall'],['wall','ladder','ladder','air','wall']],p={towerLevel:2,towerX:-1,x:3,y:0};
 assert.equal(minerTowerMove(courses,p,0,1),true);assert.equal(p.towerLevel,1);assert.equal(p.towerX,-1);
});


test('manual tower climb weaves silk into anchored rope and extends its top',()=>{
 const courses=[['wall','air','ladder','floor','wall'],['wall','air','ladder','air','wall'],['wall','air','ladder','air','wall']];
 const g=miner(()=>{},{initialTower:{courses,level:1,x:1,stock:{ladder:0,wood:0,stone:0,silk:1,rope:0}}});
 g.input('ArrowUp',true);g.input('ArrowUp',false);let s=g.snapshot();assert.equal(s.silk,0);assert.equal(s.rope,1);assert.equal(s.towerWorld[0][5],'rope');
 for(let i=0;i<8;i++)g.update(1/60,false);s=g.snapshot();assert.equal(s.p.towerLevel,2);assert.equal(s.p.towerX,1);
 g.input('ArrowUp',true);g.input('ArrowUp',false);s=g.snapshot();assert.equal(s.rope,0);assert.equal(s.towerWorld[-1][5],'rope','rope top extends before ascent');
 for(let i=0;i<8;i++)g.update(1/60,false);g.update(.3,false);s=g.snapshot();assert.equal(s.p.towerLevel,3);assert.equal(s.p.towerX,1);
});

test('manual off-center tower descent enters a bridge floor',()=>{
 const courses=[['wall','floor','ladder','air','wall'],['wall','ladder','ladder','air','wall']],g=miner(()=>{},{initialTower:{courses,level:2,x:-1,stock:{ladder:0,wood:0,stone:0,silk:0,rope:0}}});
 g.input('ArrowDown',true);g.input('ArrowDown',false);assert.ok(g.snapshot().stairTransit?.tower);for(let i=0;i<8;i++)g.update(1/60,false);
 const s=g.snapshot();assert.equal(s.p.towerLevel,1);assert.equal(s.p.towerX,-1);assert.equal(s.towerWorld[1][3],'floor');
});


test('manual central tower climb extends rope and can enter a bridge floor',()=>{
 const courses=[['wall','air','rope','air','wall'],['wall','air','air','air','wall'],['wall','air','floor','air','wall']];
 const g=miner(()=>{},{initialTower:{courses,level:1,x:0,stock:{ladder:0,wood:0,stone:0,silk:1,rope:0}}});
 g.input('ArrowUp',true);g.input('ArrowUp',false);let s=g.snapshot();assert.equal(s.towerWorld[0][4],'rope');assert.equal(s.silk,0);assert.equal(s.rope,1);
 for(let i=0;i<8;i++)g.update(1/60,false);s=g.snapshot();assert.equal(s.p.towerLevel,2);
 g.input('ArrowUp',true);g.input('ArrowUp',false);assert.ok(g.snapshot().stairTransit?.tower);for(let i=0;i<8;i++)g.update(1/60,false);s=g.snapshot();assert.equal(s.p.towerLevel,3);assert.equal(s.towerWorld[-1][4],'floor');
});


test('tower center falls when neither the current cell nor below supports it',()=>{
 const rows=[['wall','air','ladder','air','wall'],['wall','air','air','air','wall'],['wall','air','air','air','wall']],p={towerLevel:3,towerX:0,x:4,y:-1};
 assert.equal(minerTowerGravity(rows,p),0);assert.equal(p.towerLevel,2);assert.equal(minerTowerGravity(rows,p),0);assert.equal(p.towerLevel,2,'ladder below catches the fall');
});


test('manual miner falls from an unsupported central tower cell',()=>{
 const courses=[['wall','air','ladder','air','wall'],['wall','air','air','air','wall'],['wall','air','air','air','wall']],g=miner(()=>{},{initialTower:{courses,level:3,x:0,stock:{ladder:0,wood:0,stone:0,silk:0,rope:0}}});
 g.update(.12,false);let s=g.snapshot();assert.equal(s.p.towerLevel,2);g.update(.12,false);s=g.snapshot();assert.equal(s.p.towerLevel,2,'the remaining ladder catches the fall');
});


test('manual miner is supported by a tower wall or window underneath',()=>{
 for(const block of ['wall','window']){const courses=[['wall',block,'ladder','air','wall'],['wall','air','ladder','air','wall']],g=miner(()=>{},{initialTower:{courses,level:2,x:-1,stock:{ladder:0,wood:0,stone:0,silk:0,rope:0}}});
  g.update(.24,false);const s=g.snapshot();assert.equal(s.p.towerLevel,2,`${block} below supports the miner`);assert.equal(s.p.towerX,-1)}
});

test('manual miner climbs into open air above the top tower ladder',()=>{
 const courses=[['wall','air','ladder','air','wall']],g=miner(()=>{},{initialTower:{courses,level:1,x:0,stock:{ladder:0,wood:0,stone:0,silk:0,rope:0}}});
 g.input('ArrowUp',true);g.input('ArrowUp',false);assert.ok(g.snapshot().stairTransit?.tower);for(let i=0;i<8;i++)g.update(1/60,false);
 let s=g.snapshot();assert.equal(s.p.towerLevel,2);assert.equal(s.p.y,0);g.update(.24,false);s=g.snapshot();assert.equal(s.p.towerLevel,2,'ladder below supports the miner');
});


test('seeded AI detects a natural underground cycle, escapes, and completes the tower',()=>seeded(42,()=>{
 const g=miner();let cycle=null,escaped=false,reached=false,advanced=false,target=null,lastBreaks=0,s;for(let i=0;i<60*1800;i++){g.update(1/60,true);if(i%3)continue;s=g.snapshot();assert.equal(s.gameOver,false,'miner survives the recovery');if(s.cycleBreaks>lastBreaks){lastBreaks=s.cycleBreaks;target=s.cycleTarget;if(!cycle)cycle={x:s.p.x,y:s.p.y,height:s.towerHeight};assert.ok(target,'a physical escape target is selected')}if(cycle){escaped||=Math.abs(s.p.x-cycle.x)+Math.abs(s.p.y-cycle.y)>=3;reached||=!!target&&s.p.x===target.x&&s.p.y===target.y;advanced||=s.towerHeight>cycle.height;if(s.towerHeight===60)break}}assert.ok(cycle,'the run encounters and detects a real cycle');assert.ok(escaped&&reached,'the miner physically reaches an escape target');assert.ok(advanced,'tower construction resumes');assert.equal(s.towerHeight,60);
}));

test('manual miner extends ladders above a built tower without adding courses',()=>{
 const courses=[['wall','air','ladder','air','wall']],g=miner(()=>{},{initialTower:{courses,level:1,x:0,stock:{ladder:2,wood:0,stone:0,silk:0,rope:0}}});
 for(let level=2;level<=4;level++){g.input('ArrowUp',true);g.input('ArrowUp',false);assert.ok(g.snapshot().stairTransit?.tower);for(let i=0;i<8;i++)g.update(1/60,false);assert.equal(g.snapshot().p.towerLevel,level)}
 let s=g.snapshot();assert.equal(s.towerHeight,1);assert.equal(s.ladder,0);assert.equal(s.towerWorld[0][4],'ladder');assert.equal(s.towerWorld[-1][4],'ladder');g.update(.24,false);assert.equal(g.snapshot().p.towerLevel,4,'the upper ladder supports the miner');
 g.input('ArrowUp',true);g.input('ArrowUp',false);assert.equal(g.snapshot().stairTransit,null,'further ascent requires another rung');
});


test('manual miner can walk beyond the tower edge in open sky and fall',()=>{
 const courses=[['floor','floor','ladder','floor','floor']],g=miner(()=>{},{initialTower:{courses,level:2,x:0,stock:{ladder:0,wood:0,stone:0,silk:0,rope:0}}});
 move(g,'ArrowRight');move(g,'ArrowRight');let s=g.snapshot();assert.equal(s.p.towerX,2);assert.equal(s.p.towerLevel,2);
 g.input('ArrowRight',true);g.input('ArrowRight',false);assert.ok(g.snapshot().stairTransit?.tower);for(let i=0;i<8;i++)g.update(1/60,false);
 s=g.snapshot();assert.equal(s.p.towerX,3);assert.equal(s.p.x,7);assert.equal(s.p.towerLevel,2,'the step reaches open sky before falling');
 for(let i=0;i<30&&g.snapshot().p.towerLevel>0;i++)g.update(1/60,false);s=g.snapshot();assert.equal(s.p.towerLevel,0);assert.equal(s.p.x,7,'fall preserves the outside column');
});


test('sky rungs outside the tower footprint are rendered',()=>{
 const courses=[['wall','air','ladder','air','wall']],rects=[],ctx={fillRect(x,y,w,h){rects.push({x,y,w,h})}};
 drawMinerTower(ctx,courses,{towerLevel:2,towerX:3},{0:{7:'ladder'}});assert.ok(rects.some(r=>r.x===180&&r.w===3&&r.h===22));
});


test('reference terrain uses one seeded hash and source surface coordinates',()=>{
 assert.equal(minerBaseTile(4,2,99),4);assert.equal(minerBaseTile(15,2,99),4);assert.equal(minerBaseTile(10,2,99),0);assert.equal(minerBaseTile(10,3,99),20);assert.equal(minerBaseTile(10,4,99),21);assert.equal(minerBaseTile(9,100,99),0);assert.equal(minerBaseTile(19,200,99),0);assert.equal(minerBaseTile(-1,3,99),10);const g=miner();const s=g.snapshot();assert.equal(s.p.x,10);assert.equal(s.p.y,2);assert.equal(s.world[2][4],4);assert.equal(s.world[2][15],4);
});

test('grass and dirt have reference hardness and do not drop stone',()=>{
 assert.equal(minerMiningSeconds(20,0),Math.ceil(20*1.7)/60);assert.equal(minerMiningSeconds(21,0),Math.ceil(18*1.7)/60);assert.ok(minerMiningSeconds(1,0)>minerMiningSeconds(20,0));
 const g=miner();let s=g.snapshot();assert.equal(s.world[3][10],20);g.input('x',true);g.input('ArrowDown',true);g.input('ArrowDown',false);g.input('x',false);s=g.snapshot();assert.equal(s.mining.total,minerMiningSeconds(20,0));g.update(s.mining.total+.001,false);s=g.snapshot();assert.equal(s.world[3][10],0);assert.equal(s.stone,0);g.update(.2,false);assert.equal(g.snapshot().p.y,3);g.input('x',true);g.input('ArrowDown',true);g.input('ArrowDown',false);g.input('x',false);s=g.snapshot();assert.equal(s.mining.total,minerMiningSeconds(21,0));g.update(s.mining.total+.001,false);s=g.snapshot();assert.equal(s.world[4][10],0);assert.equal(s.stone,0);
});

test('weather uses the same seed as the generated world',()=>seeded(42,()=>{
 const g=miner(),s=g.snapshot();const expected=1+Math.floor(((Math.imul(42,1664525)+1013904223)>>>0)/2**32*9999);assert.equal(s.skyWeather.seed,expected);assert.equal(s.skyWeather.timer,minerSkyDelay(expected,0));assert.equal(s.world[100][9],minerBaseTile(9,100,expected));
}));

test('AI carries stone home from shallow ground through a physical route',()=>{
 const w=Array.from({length:60},(_,y)=>Array(20).fill(y<3?0:1));w[3][10]=20;w[4][10]=21;w[5][10]=0;const courses=[['wall','air','ladder','air','wall']],home={x:17,y:2},deep={x:3,y:40},g=miner(()=>{},{initialWorld:w,initialPosition:{x:10,y:5},initialTower:{courses,level:0,x:0,stock:{ladder:4,wood:0,stone:40,silk:0,rope:0}},initialGates:{home,deep:[deep]},dynamicSpawns:false});let s,planned=false,cleared=false;for(let i=0;i<60*30;i++){g.update(1/60,true);s=g.snapshot();planned||=!!s.homing?.camp;cleared||=s.world[4][10]===0;if(planned&&cleared&&s.p.y===2)break}assert.ok(planned,'commits a shallow route');assert.ok(cleared,'physically mines the dirt obstruction');assert.equal(s.p.y,2,'reaches the surface');
});

test('AI seeks iron six cells below and mines it from above to craft a kit',()=>{
 const w=Array.from({length:34},(_,y)=>Array(10).fill(y<3?0:1));for(let y=10;y<=15;y++)w[y][5]=9;w[16][5]=3;const g=miner(()=>{},{initialWorld:w,initialPosition:{x:5,y:10},initialCombat:{tool:2,ammo:0,iron:2,coal:1},dynamicSpawns:false});let s;for(let i=0;i<60*30;i++){g.update(1/60,true);s=g.snapshot();if(s.tool===3)break}assert.equal(s.world[16][5],0,'the player physically mines the iron tile');assert.equal(s.tool,3,'the acquired iron completes the iron kit');
});

test('quarry retains its reachable stone target after climbing above the bottom threshold',()=>{
 const w=Array.from({length:34},()=>Array(10).fill(1));for(let y=0;y<3;y++)w[y].fill(0);w[4].fill(0);for(const x of [4,5,6])w[3][x]=0;
 const courses=[['wall','air','ladder','air','wall']],g=miner(()=>{},{initialWorld:w,initialTower:{courses,level:0,x:1,stock:{ladder:4,wood:0,stone:1,silk:0,rope:0}},initialPosition:{x:5,y:4},dynamicSpawns:false});
 let target=null,above=false,miningStock=null,collected=false;for(let i=0;i<60*20;i++){g.update(1/60,true);const s=g.snapshot();if(!target&&s.quarryTarget)target=structuredClone(s.quarryTarget);if(target&&s.p.y<4&&s.world[target.ore.y]?.[target.ore.x]===1){above=true;assert.deepEqual({x:s.quarryTarget.x,y:s.quarryTarget.y,ore:s.quarryTarget.ore},{x:target.x,y:target.y,ore:target.ore},'target survives crossing the threshold')}if(target&&s.mining?.x===target.ore.x&&s.mining?.y===target.ore.y&&miningStock===null)miningStock=s.stone;if(target&&miningStock!==null&&s.world[target.ore.y]?.[target.ore.x]===0){assert.equal(s.stone,miningStock+1,'mined stone enters inventory');collected=true;break}}
 assert.ok(target&&above&&collected,'AI climbs, mines, and collects the selected stone');
});


test('quarry target uses decision ticks and pauses while mining',()=>{
 const w=Array.from({length:34},()=>Array(10).fill(1));for(let y=0;y<3;y++)w[y].fill(0);w[4].fill(0);for(const x of [4,5,6])w[3][x]=0;
 const courses=[['wall','air','ladder','air','wall']],g=miner(()=>{},{initialWorld:w,initialTower:{courses,level:0,x:1,stock:{ladder:4,wood:0,stone:1,silk:0,rope:0}},initialPosition:{x:5,y:4},dynamicSpawns:false});
 let s,selected=false;for(let i=0;i<1200;i++){g.update(1/60,true);s=g.snapshot();if(s.quarryTarget&&!selected){assert.equal(s.quarryTarget.ttl,480);selected=true}if(selected&&s.mining&&s.quarryTarget){const ttl=s.quarryTarget.ttl;g.update(1/60,true);assert.equal(g.snapshot().quarryTarget.ttl,ttl,'mining does not spend a decision tick');return}}
 assert.fail('expected quarry selection followed by a physical mine');
});

test('quarry avoids a stone standing place exposed to overhead lava',()=>{
 const w=Array.from({length:12},()=>Array(10).fill(1));w[5][4]=w[5][5]=w[5][6]=0;w[4][6]=7;w[5][7]=1;w[5][3]=1;
 const route=minerQuarryRoute(w,{x:5,y:5},{ladder:0,wood:0,stone:1,rope:0,silk:0,tool:0});assert.ok(route);assert.notDeepEqual(route.gate,{x:6,y:5});assert.deepEqual(route.ore,{x:3,y:5});
});

test('AI harvests safe quarry stone instead of oscillating beneath lava',()=>{
 const w=Array.from({length:34},()=>Array(10).fill(1));for(let y=0;y<3;y++)w[y].fill(0);for(const x of [4,5,6])w[5][x]=0;w[4][6]=7;
 const courses=[['wall','air','ladder','air','wall']],g=miner(()=>{},{initialWorld:w,initialTower:{courses,level:0,x:1,stock:{ladder:0,wood:0,stone:1,silk:0,rope:0}},initialPosition:{x:5,y:5},dynamicSpawns:false});
 let harvested=false;for(let i=0;i<600;i++){g.update(1/60,true);const s=g.snapshot();if(s.quarryTarget)assert.notDeepEqual({x:s.quarryTarget.x,y:s.quarryTarget.y},{x:6,y:5});if(s.quarryMines&&s.stone>1){harvested=true;break}}assert.ok(harvested,'physically mines and collects a safe adjacent stone');
});

test('quarry can target stone at the world edge from an interior standing cell',()=>{
 const w=Array.from({length:8},()=>Array(6).fill(3));w[4][4]=0;w[4][5]=1;w[5][4]=1;
 const route=minerQuarryRoute(w,{x:4,y:4},{ladder:0,wood:0,stone:0,rope:0,silk:0,tool:0});assert.ok(route);assert.deepEqual(route.gate,{x:4,y:4});assert.deepEqual(route.ore,{x:5,y:4});
});

test('quarry chooses the safer standing cell when a trapped enemy is nearby',()=>{
 const w=Array.from({length:34},()=>Array(10).fill(1));for(let y=0;y<3;y++)w[y].fill(0);for(let x=2;x<=7;x++)w[4][x]=0;
 const courses=[['wall','air','ladder','air','wall']],enemy={kind:'ZOMBIE',x:2,y:2,hp:3,t:0,age:0,shotCd:1.8,stun:100};
 const g=miner(()=>{},{initialWorld:w,initialTower:{courses,level:0,x:0,stock:{ladder:4,wood:0,stone:1,silk:0,rope:0}},initialPosition:{x:4,y:4},initialEnemies:[enemy],dynamicSpawns:false});
 let s;for(let i=0;i<60*4;i++){g.update(1/60,true);s=g.snapshot();if(s.quarryTarget)break}assert.ok(s.quarryTarget);assert.equal(s.quarryTarget.x,7,'route prices danger near the left-hand stone');assert.equal(s.quarryTarget.ore.x,8);
});


test('AI escapes a lava pool toward supported dry ground without stone',()=>{
 const w=Array.from({length:34},()=>Array(10).fill(1));for(let y=0;y<3;y++)w[y].fill(0);w[4][5]=7;w[4][4]=0;
 const g=miner(()=>{},{initialWorld:w,initialPosition:{x:5,y:4},dynamicSpawns:false});g.update(1/60,true);let s=g.snapshot();assert.ok(s.stairTransit);assert.deepEqual({x:s.stairTransit.x,y:s.stairTransit.y},{x:4,y:4});
 for(let i=0;i<8;i++)g.update(1/60,true);s=g.snapshot();assert.equal(s.p.x,4);assert.equal(s.p.y,4);assert.equal(s.stone,0);
});


test('AI can excavate a solid standing cell en route to a stone target',()=>{
 const w=Array.from({length:34},()=>Array(10).fill(1));for(let y=0;y<3;y++)w[y].fill(0);w[4][5]=0;w[4][4]=w[4][6]=10;
 const courses=[['wall','air','ladder','air','wall']],g=miner(()=>{},{initialWorld:w,initialTower:{courses,level:0,x:1,stock:{ladder:4,wood:0,stone:1,silk:0,rope:0}},initialPosition:{x:5,y:4},dynamicSpawns:false});
 let goal=null,opened=false,mined=false;for(let i=0;i<60*20;i++){g.update(1/60,true);const s=g.snapshot();if(!goal&&s.quarryTarget&&w[s.quarryTarget.y][s.quarryTarget.x]===1)goal=structuredClone(s.quarryTarget);if(goal&&s.world[goal.y][goal.x]===0)opened=true;if(goal&&opened&&s.quarryMines>0){mined=true;break}}
 assert.ok(goal&&opened&&mined,'miner opens a solid route and mines its selected stone');
});


test('AI begins mining a bank when lava has no dry exit',()=>{
 const w=Array.from({length:34},()=>Array(10).fill(1));for(let y=0;y<3;y++)w[y].fill(0);w[4][5]=7;
 const g=miner(()=>{},{initialWorld:w,initialPosition:{x:5,y:4},dynamicSpawns:false});g.update(1/60,true);const s=g.snapshot();assert.ok(s.mining,'the miner starts digging instead of waiting in lava');assert.equal(s.mining.v,1);assert.equal(Math.abs(s.mining.x-s.p.x)+Math.abs(s.mining.y-s.p.y),1);
});


test('lava flooding during a mine cancels it and starts a dry escape',()=>{
 const w=Array.from({length:34},()=>Array(10).fill(1));for(let y=0;y<3;y++)w[y].fill(0);w[4][5]=w[4][4]=0;w[4][6]=7;
 const g=miner(()=>{},{initialWorld:w,initialPosition:{x:5,y:4},dynamicSpawns:false});g.input('x',true);g.input('ArrowDown',true);g.input('ArrowDown',false);g.input('x',false);assert.ok(g.snapshot().mining);
 for(let i=0;i<4;i++)g.update(1/60,true);const s=g.snapshot();assert.equal(s.world[4][5],7);assert.equal(s.mining,null,'flood interrupts the mine');assert.ok(s.stairTransit);assert.deepEqual({x:s.stairTransit.x,y:s.stairTransit.y},{x:4,y:4});
});

test('AI sidesteps supported ground when lava is directly overhead',()=>{
 const w=Array.from({length:34},()=>Array(10).fill(1));for(let y=0;y<3;y++)w[y].fill(0);w[4][5]=w[4][4]=0;w[3][5]=7;
 const g=miner(()=>{},{initialWorld:w,initialPosition:{x:5,y:4},dynamicSpawns:false});g.update(1/60,true);const s=g.snapshot();assert.ok(s.stairTransit);assert.deepEqual({x:s.stairTransit.x,y:s.stairTransit.y},{x:4,y:4});
});


test('manual miner can traverse and view the full twenty-column surface',()=>seeded(42,()=>{
 const g=miner();assert.equal(g.snapshot().world[0].length,20);reachRightTree(g);mine(g,'ArrowRight');move(g,'ArrowRight');let s=g.snapshot();assert.equal(s.p.x,15);assert.equal(s.p.y,2);
 const rects=[],ctx=new Proxy({fillRect(x,y,w,h){rects.push({x,y,w,h})}},{get:(o,k)=>o[k]??(()=>{}),set:(o,k,v)=>(o[k]=v,true)});g.draw(ctx);assert.ok(rects.some(r=>r.w===14&&r.h===12&&r.x>=0&&r.x<240),'camera keeps the player on screen');
 g.input(' ',true);g.input(' ',false);assert.equal(g.snapshot().torchStock,s.torchStock-1,'manual actions work in the eastern half');
}));


test('AI builds a physical bridge beneath a lava stair landing',()=>{
 const w=Array.from({length:240},()=>Array(10).fill(3));for(let y=0;y<3;y++)w[y].fill(0);w[4][5]=w[4][6]=w[5][6]=0;w[6][6]=7;
 const courses=[['wall','air','ladder','air','wall']],g=miner(()=>{},{initialWorld:w,initialTower:{courses,level:0,x:1,stock:{ladder:0,wood:0,stone:2,silk:0,rope:0}},initialPosition:{x:5,y:4},dynamicSpawns:false});
 for(let i=0;i<60;i++){g.update(1/60,true);if(g.snapshot().stairBridges)break}const s=g.snapshot();assert.equal(s.stairBridges,1);assert.equal(s.world[6][6],8);assert.equal(s.stone,0);
});


test('manual miner reaches and mines ore in the eastern underground',()=>{
 const w=Array.from({length:240},()=>Array(20).fill(1));for(let y=0;y<3;y++)w[y].fill(0);w[4][14]=w[4][15]=0;w[4][16]=2;
 const g=miner(()=>{},{initialWorld:w,initialPosition:{x:14,y:4},dynamicSpawns:false});move(g,'ArrowRight');let s=g.snapshot();assert.equal(s.p.x,15);const coal=s.coal;
 g.input('x',true);g.input('ArrowRight',true);g.input('ArrowRight',false);g.input('x',false);s=g.snapshot();assert.equal(s.mining?.v,2);g.update(s.mining.total+.01,false);s=g.snapshot();assert.equal(s.world[4][16],0);assert.equal(s.coal,coal+1);
});

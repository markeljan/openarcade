import test from 'node:test';
import assert from 'node:assert/strict';
import {miner,minerMiningSeconds,minerFluidStep,minerSupported,minerGravityStep,minerClimbUp,minerProjectileStep,minerLineClear,minerEnemyRoute,minerGolemStep,minerSkeletonShot} from '../src/feature-games4.js';
function seeded(seed, fn){const original=Math.random;Math.random=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/2**32);try{return fn()}finally{Math.random=original}}
function observer(game){const labels=[];const ctx=new Proxy({fillText(s){labels.push(s)}},{get:(o,k)=>o[k]??(()=>{}),set:(o,k,v)=>(o[k]=v,true)});return ()=>{labels.length=0;game.draw(ctx);return [...labels]}}
function mine(game,d){game.input('x',true);game.input(d,true);game.input('x',false);game.update(3,false)}
test('preview earns the beacon and defeats the golem across seeds',()=>{for(const seed of [1,7,42,99,12345])seeded(seed,()=>{const game=miner(),snapshot=observer(game);let won=false;for(let i=0;i<60*180&&!won;i++){game.update(1/60,true);if(i%60===0)won=snapshot().some(s=>/KILLS [1-9]/.test(s))}assert.ok(won,`seed ${seed} must reach and defeat the golem`)})});
test('manual cave-enemy defeat persists until restart',()=>seeded(42,()=>{const game=miner(),snapshot=observer(game);for(const d of ['ArrowLeft','ArrowRight','ArrowUp'])mine(game,d);for(let i=0;i<20;i++){mine(game,'ArrowDown');game.input('ArrowDown',true);game.update(.01,false)}assert.ok(snapshot().some(s=>s.startsWith('ZOMBIE ')));for(let i=0;i<12;i++)game.update(1,false);assert.ok(snapshot().includes('RUN OVER'));for(let i=0;i<10;i++)game.update(1,false);assert.ok(snapshot().includes('RUN OVER'),'manual loss must not silently restart');game.reset();assert.ok(!snapshot().includes('RUN OVER'));assert.match(snapshot().find(s=>s.startsWith('DEPTH')),/DEPTH 0/)}));

test('mining wears the pick and the surface camp repairs it',()=>seeded(42,()=>{
 const game=miner(),snapshot=observer(game);
 for(const d of ['ArrowLeft','ArrowRight','ArrowUp'])mine(game,d);
 assert.ok(snapshot().includes('PICK DUR 119/120'));
 game.input('c',true);
 assert.ok(snapshot().includes('PICK DUR 120/120'));
 mine(game,'ArrowDown');
 assert.ok(snapshot().includes('PICK DUR 119/120'));
 game.update(.2,false);game.input('ArrowUp',true);
 game.update(1.5,false);
 assert.ok(snapshot().includes('PICK DUR 120/120'));
}));


test('manual mining takes time and completes after the key is released',()=>seeded(42,()=>{
 const game=miner(),snapshot=observer(game);
 game.input('x',true);game.input('ArrowLeft',true);game.input('x',false);
 game.update(1,false);
 assert.match(snapshot().find(s=>s.includes('PICK')),/W0 /);
 game.update(.14,false);
 assert.match(snapshot().find(s=>s.includes('PICK')),/W1 /);
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
 const g=miner();g.input('x',true);g.input('ArrowDown',true);g.input('x',false);g.update(3,false);g.update(.2,false);let s=g.snapshot();assert.equal(s.p.y,3);assert.equal(s.ladder,2);
 g.input('ArrowUp',true);s=g.snapshot();assert.equal(s.p.y,2);assert.equal(s.world[3][5],9);assert.equal(s.ladder,1);g.update(.3,false);assert.equal(g.snapshot().p.y,2);
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
 const game=miner();for(const d of ['ArrowLeft','ArrowRight','ArrowUp'])mine(game,d);for(let i=0;i<20;i++){mine(game,'ArrowDown');game.input('ArrowDown',true);game.update(.01,false)}
 let before=game.snapshot();assert.ok(before.mob);game.input('x',true);game.input('x',false);let fired=game.snapshot();assert.equal(fired.ammo,before.ammo-1);assert.equal(fired.mob.hp,before.mob.hp);assert.equal(fired.projectiles.length,1);
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
 const g=miner();for(const d of ['ArrowLeft','ArrowRight','ArrowUp'])mine(g,d);
 let before;
 for(let i=0;i<60;i++){
  g.input('x',true);g.input('ArrowDown',true);g.input('x',false);
  for(let j=0;j<30;j++){g.input('x',true);g.update(.1,false)}
  g.input('x',false);g.input('ArrowDown',true);g.update(.01,false);
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

test('manual descent encounters a skeleton that fires a travelling arrow',()=>seeded(42,()=>{
 const g=miner();for(const d of ['ArrowLeft','ArrowRight','ArrowUp'])mine(g,d);let found=false;
 for(let i=0;i<80&&!found;i++){
  g.input('x',true);g.input('ArrowDown',true);g.input('x',false);
  for(let j=0;j<30;j++){
   if(g.snapshot().mob?.kind==='SKELETON'){found=true;break}
   g.input('x',true);g.update(.1,false);
  }
  if(!found){g.input('x',false);g.input('ArrowDown',true);g.update(.01,false)}
 }
 assert.ok(found);g.input('x',false);let arrow;
 for(let i=0;i<50&&!arrow;i++){g.update(.05,false);arrow=g.snapshot().projectiles.find(p=>p.kind==='arrow')}
 assert.ok(arrow,'skeleton launches an arrow before approaching');assert.equal(arrow.dmg,1);
}));

import test from 'node:test';
import assert from 'node:assert/strict';
import {createHiveHeist} from '../src/feature-games21.js';
test('waggle recruits a worker to the visited flower after the dance',()=>{
 const game=createHiveHeist();function move(x,y){for(const [axis,goal,neg,pos] of [['x',x,'ArrowLeft','ArrowRight'],['y',y,'ArrowUp','ArrowDown']])for(let i=0;i<500&&Math.abs(game.snapshot().bee[axis]-goal)>4;i++){const k=game.snapshot().bee[axis]<goal?pos:neg;game.input(k,true);game.update(.025,false);game.input(k,false)}}
 move(152,538);game.input('x',true);game.input('x',false);assert.ok(game.snapshot().dance>0);assert.equal(game.snapshot().worker,null,'dance without a visited flower recruited a worker');for(let i=0;i<30;i++)game.update(.025,false);
 const flower=game.snapshot().flowers[0];move(flower.x,flower.y);game.input(' ',true);game.input(' ',false);assert.equal(game.snapshot().lastFlower,0);move(152,538);game.input('x',true);game.input('x',false);let s=game.snapshot();assert.equal(s.worker.phase,'listen');assert.equal(s.worker.target.id,0);const x=s.bee.x,workerX=s.worker.x;game.input('ArrowRight',true);for(let i=0;i<10;i++)game.update(.025,false);game.input('ArrowRight',false);assert.ok(Math.abs(game.snapshot().bee.x-x)<=14,'dance left its figure-eight area');assert.notEqual(game.snapshot().bee.x,x,'dance did not animate');assert.equal(game.snapshot().worker.phase,'listen');assert.notEqual(game.snapshot().worker.x,workerX,'worker did not approach the dancer');
 let source=false,match=false,fruit=false;for(let i=0;i<500;i++){game.update(.05,false);s=game.snapshot();source ||= s.worker?.phase==='source';match ||= s.worker?.phase==='match';fruit ||= s.flowers.some(f=>f.fruit>0);if(source&&match&&fruit&&!s.worker)break}assert.ok(source&&match&&fruit);assert.equal(s.honey,1);
});
test('player deposits build comb and open further flowers at three new cells',()=>{
 const game=createHiveHeist();let saw=false;
 for(let i=0;i<8000;i++){game.update(.05,true);const s=game.snapshot();assert.equal(s.cells,Math.min(26,1+Math.floor(s.deposits/2)));if(s.stage===1){assert.ok(s.deposits>=6);assert.ok(s.flowers.filter(f=>f.area<=1).every(f=>f.open));assert.ok(s.flowers.some(f=>f.area===2&&!f.open));saw=true;break}}
 assert.ok(saw);
});

function assertBroodEmergesAndForages(game,auto){
 let b=game.snapshot().nursery.brood[0];assert.equal(b.phase,'emerge');const start={x:b.x,y:b.y}, flower=b.flower;
 for(let i=0;i<100&&b.phase==='emerge';i++){game.update(.025,auto);b=game.snapshot().nursery.brood[0]}
 assert.equal(b.phase,'flight');assert.ok(Math.hypot(b.x-214,b.y-540)<12);assert.ok(b.x<start.x&&b.y<start.y);
 for(let i=0;i<300&&b.flower===flower;i++){game.update(.025,auto);b=game.snapshot().nursery.brood[0]}
 assert.equal(b.flower,flower+2);
}
test('guarded nursery consumes carried nectar and hatches after incubation',()=>{
 const game=createHiveHeist();let ready=false;for(let i=0;i<8000;i++){game.update(.05,true);const s=game.snapshot();if(s.deposits>=2&&s.bee.nectar>=2&&s.nursery.phase==='hungry'&&s.nursery.route===0){ready=true;break}}assert.ok(ready);
 const move=(x,y)=>{for(const [axis,goal,neg,pos] of [['x',x,'ArrowLeft','ArrowRight'],['y',y,'ArrowUp','ArrowDown']]){for(let i=0;i<400&&Math.abs(game.snapshot().bee[axis]-goal)>4;i++){const k=game.snapshot().bee[axis]<goal?pos:neg;game.input(k,true);game.update(.025,false);game.input(k,false)}}};
 move(168,538);assert.equal(game.snapshot().nursery.route,1);move(224,540);assert.equal(game.snapshot().nursery.route,2);move(252,590);let before=game.snapshot().bee.nectar;game.input(' ',true);game.input(' ',false);let s=game.snapshot();assert.equal(s.nursery.phase,'fed');assert.equal(s.bee.nectar,before-1);assert.equal(s.hatched,0);for(let i=0;i<80&&!game.snapshot().hatched;i++)game.update(.025,false);s=game.snapshot();assert.equal(s.hatched,1);assert.equal(s.nursery.brood.length,1);assertBroodEmergesAndForages(game,false);
});

test('autoplay completes the guarded nursery sequence',()=>{
 const game=createHiveHeist();let hatched=false;for(let i=0;i<8000;i++){game.update(.05,true);if(game.snapshot().hatched){hatched=true;break}}assert.ok(hatched);assert.equal(game.snapshot().nursery.feeds,1);assertBroodEmergesAndForages(game,true);
});

test('manual scent is reserved for a telegraphed raid and diverts a wasp',()=>{const g=createHiveHeist();g.input('z',true);let s=g.snapshot();assert.equal(s.bee.scent,2);assert.equal(s.decoy,null);assert.equal(s.wasps.length,2);for(let i=0;i<400;i++){g.update(.025,false);s=g.snapshot();if(s.wasps[0].phase==='windup')break}assert.equal(s.wasps[0].phase,'windup');g.input('z',true);s=g.snapshot();assert.equal(s.bee.scent,1);assert.ok(s.decoy);let diverted=false,retreated=false;for(let i=0;i<300;i++){g.update(.025,false);s=g.snapshot();if(s.wasps[0].phase==='divert')diverted=true;if(diverted&&s.wasps[0].phase==='retreat'){retreated=true;break}}assert.ok(diverted);assert.ok(retreated);assert.equal(s.damage,0,'lured wasp damaged the hive');});
test('unanswered wasp completes a raid and damages the hive',()=>{const g=createHiveHeist();let saw=false,s;for(let i=0;i<600;i++){g.update(.025,false);s=g.snapshot();saw ||= s.wasps[0].phase==='windup';if(s.damage>0)break}assert.ok(saw,'raid had no windup');assert.equal(s.damage,1);assert.equal(s.wasps[0].phase,'retreat')});
test('manual compatible pollen revives a blossom and it replenishes nectar on its cycle',()=>{const g=createHiveHeist();const move=(x,y)=>{for(const [axis,goal,neg,pos] of [['x',x,'ArrowLeft','ArrowRight'],['y',y,'ArrowUp','ArrowDown']])for(let i=0;i<600&&Math.abs(g.snapshot().bee[axis]-goal)>4;i++){const k=g.snapshot().bee[axis]<goal?pos:neg;g.input(k,true);g.update(.025,false);g.input(k,false)}};const tap=()=>{g.input(' ',true);g.input(' ',false);for(let i=0;i<16;i++)g.update(.025,false)};let s=g.snapshot();const source=s.flowers[0],target=s.flowers[4];move(source.x,source.y);tap();assert.equal(g.snapshot().bee.pollen,source.type);move(target.x,target.y);tap();s=g.snapshot();assert.equal(s.flowers[4].pollinated,1);assert.equal(s.flowers[4].nectar,3);tap();s=g.snapshot();assert.equal(s.flowers[4].nectar,2);for(let i=0;i<320&&g.snapshot().flowers[4].nectar<3;i++)g.update(.025,false);assert.equal(g.snapshot().flowers[4].nectar,3);});
test('AI eventually unlocks the final meadow without opening it prematurely',()=>{const g=createHiveHeist();let reached=false;for(let i=0;i<20000;i++){g.update(.05,true);const s=g.snapshot();if(s.stage===1)assert.ok(s.flowers.some(f=>f.area===2&&!f.open));if(s.stage===2){assert.ok(s.flowers.every(f=>f.open));assert.ok(s.cells>=8);reached=true;break}}assert.ok(reached);});

test('late-stage busy hive attracts a third patrol after nineteen deposits',()=>{const g=createHiveHeist();let s;for(let i=0;i<50000;i++){g.update(.05,true);s=g.snapshot();if(s.deposits>18)break}assert.ok(s.deposits>18);assert.equal(s.stage,2);assert.equal(s.wasps.length,3);assert.equal(s.wasps[2].phase,'patrol');});

test('bee accelerates and coasts with reference flight response',()=>{
 const g=createHiveHeist();g.input('ArrowRight',true);g.update(1/60,false);let s=g.snapshot();assert.ok(Math.abs(s.bee.vx-50.304)<1e-9);assert.ok(Math.abs(s.bee.x-160.8384)<1e-9);g.input('ArrowRight',false);g.update(1/60,false);s=g.snapshot();assert.ok(Math.abs(s.bee.vx-34.20672)<1e-8);assert.ok(s.bee.x>160.8384,'bee should coast after release');
});
test('held action gathers on arrival and transfers pollen without a cooldown',()=>{const g=createHiveHeist();g.input(' ',true);g.input('ArrowUp',true);let gathered=false,transferred=false;for(let i=0;i<500;i++){g.update(1/60,false);const s=g.snapshot();gathered||=s.bee.pollen!==null;transferred||=s.flowers.some(f=>f.pollinated>0);if(transferred)break}g.input('ArrowUp',false);g.input(' ',false);assert.ok(gathered,'held action did not gather a blossom on arrival');assert.ok(transferred,'held action did not transfer matching pollen')});
test('releasing action before reaching a blossom does not gather',()=>{const g=createHiveHeist();g.input(' ',true);g.input(' ',false);g.input('ArrowUp',true);let near=false;for(let i=0;i<180;i++){g.update(1/60,false);const s=g.snapshot();if(Math.hypot(s.bee.x-s.flowers[5].x,s.bee.y-s.flowers[5].y)<20){near=true;break}}g.input('ArrowUp',false);assert.ok(near);assert.equal(g.snapshot().bee.pollen,null)});

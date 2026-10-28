import test from 'node:test';
import assert from 'node:assert/strict';
import {createHiveHeist} from '../src/feature-games21.js';
test('waggle recruits a worker to the visited flower after the dance',()=>{
 const game=createHiveHeist();function move(x,y){for(const [axis,goal,neg,pos] of [['x',x,'ArrowLeft','ArrowRight'],['y',y,'ArrowUp','ArrowDown']])for(let i=0;i<500&&Math.abs(game.snapshot().bee[axis]-goal)>4;i++){const k=game.snapshot().bee[axis]<goal?pos:neg;game.input(k,true);game.update(.025,false);game.input(k,false)}}
 move(152,538);game.input('x',true);assert.ok(game.snapshot().dance>0);assert.equal(game.snapshot().worker,null,'dance without a visited flower recruited a worker');for(let i=0;i<30;i++)game.update(.025,false);
 move(70,180);game.input(' ',true);game.input(' ',false);assert.equal(game.snapshot().lastFlower,0);move(152,538);game.input('x',true);let s=game.snapshot();assert.equal(s.worker.phase,'listen');assert.equal(s.worker.target.id,0);const x=s.bee.x,workerX=s.worker.x;game.input('ArrowRight',true);for(let i=0;i<10;i++)game.update(.025,false);game.input('ArrowRight',false);assert.equal(game.snapshot().bee.x,x,'dance did not hold position');assert.equal(game.snapshot().worker.phase,'listen');assert.notEqual(game.snapshot().worker.x,workerX,'worker did not approach the dancer');
 let source=false,match=false,fruit=false;for(let i=0;i<500;i++){game.update(.05,false);s=game.snapshot();source ||= s.worker?.phase==='source';match ||= s.worker?.phase==='match';fruit ||= s.flowers.some(f=>f.fruit>0);if(source&&match&&fruit&&!s.worker)break}assert.ok(source&&match&&fruit);assert.equal(s.honey,1);
});
test('player deposits build comb and open further flowers at three new cells',()=>{
 const game=createHiveHeist();let saw=false;
 for(let i=0;i<8000;i++){game.update(.05,true);const s=game.snapshot();assert.equal(s.cells,Math.min(26,1+Math.floor(s.deposits/2)));if(s.stage===1){assert.ok(s.deposits>=6);assert.ok(s.flowers.every(f=>f.open));saw=true;break}}
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

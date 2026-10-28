import test from 'node:test';
import assert from 'node:assert/strict';
import {createReefGame} from '../src/feature-games38.js';
const tick=(g,n,auto=false)=>{for(let i=0;i<n;i++)g.update(1/60,auto)};
test('manual harpoon travels and misses without an intersecting fish',()=>{const g=createReefGame();g.input(' ',true);let s=g.snapshot();assert.equal(s.bag,0);assert.ok(s.harpoon);tick(g,40);s=g.snapshot();assert.equal(s.bag,0);assert.equal(s.harpoon,null);assert.equal(s.notice,'SHOT MISSED')});
test('preview lands catches and serves them before purchasing a deeper tank',()=>{const g=createReefGame();let sawBag=false,sawService=false;for(let i=0;i<18000;i++){g.update(1/60,true);const s=g.snapshot();if(s.bag>0)sawBag=true;if(s.phase==='service'&&s.catches.length)sawService=true;if(s.tier>1){assert.ok(sawBag);assert.ok(sawService);assert.ok(s.served>=3);return}}assert.fail('preview did not complete first tier')});
function moveTo(g,target){for(let i=0;i<600;i++){let s=g.snapshot(),dx=target.x-s.hero.x,dy=target.y-s.hero.y;if(Math.hypot(dx,dy)<25)break;for(const [key,on] of [['ArrowLeft',dx< -8],['ArrowRight',dx>8],['ArrowUp',dy< -8],['ArrowDown',dy>8]])g.input(key,on);g.update(1/60,false)}for(const k of ['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'])g.input(k,false);tick(g,30)}
const action=g=>{g.input(' ',true);g.input(' ',false);tick(g,30)};
test('manual service preserves catch identity through dish and waiting diner',()=>{const g=createReefGame();let s;for(let i=0;i<8000;i++){g.update(1/60,true);s=g.snapshot();if(s.phase==='service')break}assert.equal(s.phase,'service');assert.equal(new Set(s.catches.map(x=>x.id)).size,s.catches.length);assert.equal(s.diners.length,3);assert.equal(s.rice,6);assert.ok(s.diners.some(d=>d.state==='arriving'));moveTo(g,{x:65,y:250});action(g);s=g.snapshot();assert.equal(s.step,1);const id=s.carried.id;moveTo(g,{x:160,y:250});action(g);assert.equal(g.snapshot().step,2);assert.equal(g.snapshot().rice,4);assert.equal(g.snapshot().riceUsed,2);moveTo(g,{x:255,y:250});action(g);s=g.snapshot();assert.equal(s.step,3);assert.equal(s.dishes.at(-1).fishId,id);assert.equal(s.dishes.at(-1).rice,2);const diner=s.diners.find(d=>d.state==='waiting'&&d.wants===s.carried.type);assert.ok(diner);moveTo(g,diner);action(g);s=g.snapshot();const dish=s.dishes.find(d=>d.fishId===id);assert.equal(dish.dinerId,diner.id);assert.equal(s.diners.find(d=>d.id===diner.id).dishId,dish.id);assert.equal(s.phase,'service','remaining orders should keep service open')});
test('partial catch serves one diner and resolves unfillable orders',()=>{const g=createReefGame();let s;for(let i=0;i<5000;i++){g.update(1/60,true);s=g.snapshot();if(s.bag===1)break}assert.equal(s.bag,1);moveTo(g,{x:50,y:150});action(g);s=g.snapshot();assert.equal(s.phase,'service');assert.equal(s.catches.length,1);for(let i=0;i<3000;i++){g.update(1/60,true);s=g.snapshot();if(s.phase==='gear')break}assert.equal(s.phase,'gear');assert.equal(s.diners.filter(d=>d.state==='happy').length,1);assert.equal(s.diners.filter(d=>d.state==='left').length,2);assert.equal(s.dishes.length,1)});

test('diners walk to seats before their orders become waiting',()=>{const g=createReefGame();let s;for(let i=0;i<8000;i++){g.update(1/60,true);s=g.snapshot();if(s.phase==='service')break}const first=s.diners[0],start={x:first.x,y:first.y};assert.equal(first.state,'arriving');assert.notDeepEqual(start,{x:first.seatX,y:first.seatY});tick(g,30);s=g.snapshot();assert.equal(s.diners[0].state,'arriving');assert.notDeepEqual({x:s.diners[0].x,y:s.diners[0].y},start);for(let i=0;i<300&&s.diners[0].state==='arriving';i++){g.update(1/60,false);s=g.snapshot()}assert.equal(s.diners[0].state,'waiting');assert.equal(s.diners[0].x,s.diners[0].seatX);assert.equal(s.diners[0].y,s.diners[0].seatY)});
test('manual preparation and serving keep their timed phases',()=>{const g=createReefGame();let s;for(let i=0;i<8000;i++){g.update(1/60,true);s=g.snapshot();if(s.phase==='service')break}assert.equal(s.phase,'service');moveTo(g,{x:65,y:250});action(g);moveTo(g,{x:160,y:250});action(g);moveTo(g,{x:255,y:250});g.input(' ',true);g.input(' ',false);s=g.snapshot();assert.equal(s.step,4);assert.ok(s.work);assert.equal(s.dishes.length,0);tick(g,10);assert.ok(g.snapshot().work,'dish appeared before preparation finished');tick(g,10);s=g.snapshot();assert.equal(s.step,3);assert.equal(s.work,null);assert.equal(s.dishes.length,1);const diner=s.diners.find(d=>d.state==='waiting'&&d.wants===s.carried.type);assert.ok(diner);moveTo(g,diner);g.input(' ',true);g.input(' ',false);s=g.snapshot();assert.ok(s.serving);assert.equal(s.serving.dishId,s.dishes[0].id);tick(g,5);assert.ok(g.snapshot().serving);tick(g,8);assert.equal(g.snapshot().serving,null)});

test('a hooked fish travels back before entering the bag',()=>{
 const game=createReefGame();let state;
 for(let i=0;i<5000;i++){game.update(1/60,true);state=game.snapshot();if(state.harpoon?.fishId)break}
 assert.ok(state.harpoon?.fishId,'no hooked fish observed');const id=state.harpoon.fishId,before=state.bag,fish=state.fish.find(f=>f.id===id);assert.ok(fish.hooked);assert.ok(!state.catches.some(f=>f.id===id));
 for(let i=0;i<120&&game.snapshot().bag===before;i++)game.update(1/60,false);
 state=game.snapshot();assert.equal(state.bag,before+1);assert.ok(state.catches.some(f=>f.id===id));assert.equal(state.harpoon,null);
});

test('manual harpoon hits a reef before reaching fish',()=>{
 const game=createReefGame();game.input('ArrowDown',true);game.update(1/60,false);game.input('ArrowDown',false);game.input(' ',true);game.input(' ',false);
 for(let i=0;i<20&&game.snapshot().harpoon;i++)game.update(1/60,false);
 const state=game.snapshot();assert.equal(state.notice,'REEF BLOCKED');assert.equal(state.bag,0);
});
test('predator telegraphs a fixed target before committing its strike',()=>{
 const game=createReefGame();game.input('ArrowDown',true);let state;
 for(let i=0;i<300;i++){game.update(1/60,false);state=game.snapshot();if(state.predator.state==='warn')break}
 assert.equal(state.predator.state,'warn');const target={x:state.predator.tx,y:state.predator.ty};game.input('ArrowDown',false);game.input('ArrowRight',true);
 for(let i=0;i<80;i++){game.update(1/60,false);state=game.snapshot();if(state.predator.state==='strike')break}
 assert.equal(state.predator.state,'strike');assert.deepEqual({x:state.predator.tx,y:state.predator.ty},target);assert.ok(state.hero.x>target.x);
});

test('second dive warns before the lionfish fires three spines',()=>{
 const game=createReefGame();let state,seenWarn=false,seenSpines=false;
 for(let i=0;i<40000;i++){game.update(1/60,true);state=game.snapshot();if(state.tier===2&&state.phase==='dive'){seenWarn ||= state.predator.state==='warn';if(state.spines.length===3){seenSpines=true;break}}}
 assert.ok(seenWarn,'second-tier warning was not observed');assert.ok(seenSpines,'lionfish did not fire a three-spine spread');
});

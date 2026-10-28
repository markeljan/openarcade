import test from 'node:test';
import assert from 'node:assert/strict';
import {createReefGame,reefCanHook,reefShouldReturn} from '../src/feature-games38.js';
const tick=(g,n,auto=false)=>{for(let i=0;i<n;i++)g.update(1/60,auto)};
test('manual harpoon travels and misses without an intersecting fish',()=>{const g=createReefGame();g.input(' ',true);let s=g.snapshot();assert.equal(s.bag,0);assert.ok(s.harpoon);tick(g,40);s=g.snapshot();assert.equal(s.bag,0);assert.equal(s.harpoon,null);assert.equal(s.notice,'SHOT MISSED')});
test('preview lands catches and serves them before purchasing a deeper tank',()=>{const g=createReefGame();let sawBag=false,sawService=false;for(let i=0;i<18000;i++){g.update(1/60,true);const s=g.snapshot();if(s.bag>0)sawBag=true;if(s.phase==='service'&&s.catches.length)sawService=true;if(s.tier>1){assert.ok(sawBag);assert.ok(sawService);assert.ok(s.served>=3);return}}assert.fail('preview did not complete first tier')});
function moveTo(g,target){for(let i=0;i<600;i++){let s=g.snapshot(),dx=target.x-s.hero.x,dy=target.y-s.hero.y;if(Math.hypot(dx,dy)<25)break;for(const [key,on] of [['ArrowLeft',dx< -8],['ArrowRight',dx>8],['ArrowUp',dy< -8],['ArrowDown',dy>8]])g.input(key,on);g.update(1/60,false)}for(const k of ['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'])g.input(k,false);tick(g,30)}
const action=g=>{g.input(' ',true);g.input(' ',false);tick(g,30)};
test('manual service preserves catch identity through dish and waiting diner',()=>{const g=createReefGame();let s;for(let i=0;i<8000;i++){g.update(1/60,true);s=g.snapshot();if(s.phase==='service')break}assert.equal(s.phase,'service');assert.equal(new Set(s.catches.map(x=>x.id)).size,s.catches.length);assert.equal(s.diners.length,3);assert.equal(s.rice,6);assert.ok(s.diners.some(d=>d.state==='arriving'));moveTo(g,{x:65,y:250});action(g);s=g.snapshot();assert.equal(s.step,1);const id=s.carried.id;moveTo(g,{x:160,y:250});action(g);assert.equal(g.snapshot().step,2);assert.equal(g.snapshot().rice,4);assert.equal(g.snapshot().riceUsed,2);moveTo(g,{x:255,y:250});action(g);s=g.snapshot();assert.equal(s.step,3);assert.equal(s.dishes.at(-1).fishId,id);assert.equal(s.dishes.at(-1).rice,2);const diner=s.diners.find(d=>d.state==='waiting'&&d.wants===s.carried.type);assert.ok(diner);moveTo(g,diner);action(g);s=g.snapshot();const dish=s.dishes.find(d=>d.fishId===id);assert.equal(dish.dinerId,diner.id);assert.equal(s.diners.find(d=>d.id===diner.id).dishId,dish.id);assert.equal(s.phase,'service','remaining orders should keep service open')});
test('partial catch serves one diner and resolves unfillable orders',()=>{const g=createReefGame();let s;for(let i=0;i<5000;i++){g.update(1/60,true);s=g.snapshot();if(s.bag===1)break}assert.equal(s.bag,1);moveTo(g,{x:100,y:180});moveTo(g,{x:50,y:150});action(g);s=g.snapshot();assert.equal(s.phase,'service');assert.equal(s.catches.length,1);for(let i=0;i<3000;i++){g.update(1/60,true);s=g.snapshot();if(s.phase==='gear')break}assert.equal(s.phase,'gear');assert.equal(s.diners.filter(d=>d.state==='happy').length,1);assert.equal(s.diners.filter(d=>d.state==='left').length,2);assert.equal(s.dishes.length,1)});

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
 const game=createReefGame();game.input('ArrowLeft',true);tick(game,40);game.input('ArrowLeft',false);game.input('ArrowDown',true);game.update(1/60,false);game.input('ArrowDown',false);game.input(' ',true);game.input(' ',false);
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

test('dive depth and tank capacity grow with gear tier',()=>{
 const first=createReefGame();first.input('ArrowDown',true);for(let i=0;i<600;i++)first.update(1/60,false);assert.ok(first.snapshot().hero.y<=440);
 const game=createReefGame();let state;for(let i=0;i<40000;i++){game.update(1/60,true);state=game.snapshot();if(state.tier===2&&state.phase==='dive')break}
 assert.equal(state.tier,2);assert.equal(state.phase,'dive');assert.ok(state.oxygen>100);assert.ok(state.fish.filter(f=>f.tier===2).every(f=>f.y>=422));
});


test('fish from all three depth tiers coexist and stronger fish require upgraded gear',()=>{
 const game=createReefGame(),fish=game.snapshot().fish;
 assert.deepEqual([1,2,3].map(t=>fish.filter(f=>f.tier===t).length),[5,5,6]);
 assert.equal(new Set(fish.map(f=>f.id)).size,16);
 assert.equal(reefCanHook(fish.find(f=>f.tier===2),1),false);
 assert.equal(reefCanHook(fish.find(f=>f.tier===2),2),true);
 let state;for(let i=0;i<5000;i++){game.update(1/60,true);state=game.snapshot();if(state.bag)break}
 assert.ok(state.bag>0);assert.ok(state.catches.every(f=>f.type===0),'first-tier AI collected a deeper catch');
});

test('fish identity survives service and AI starts next dive without resetting the habitat',()=>{
 const game=createReefGame(),initial=game.snapshot().fish.map(f=>f.id);let state,landed=[];
 for(let i=0;i<12000;i++){game.update(1/60,true);state=game.snapshot();if(state.phase==='service'){landed=state.catches.map(f=>f.id);break}}
 assert.ok(landed.length);for(let i=0;i<30000;i++){game.update(1/60,true);state=game.snapshot();if(state.phase==='dive'&&state.tier===2)break}
 assert.equal(state.phase,'dive');assert.equal(state.tier,2);
 for(const id of initial)assert.ok(state.fish.some(f=>f.id===id),`original fish ${id} disappeared`);
 for(const id of landed)assert.equal(state.fish.find(f=>f.id===id).caught,true,'served fish returned to water');
 assert.ok(state.fish.filter(f=>f.tier===2&&!f.caught).length>=3);
});
test('manual departure preserves the remaining fish after service',()=>{
 const game=createReefGame();let state;for(let i=0;i<12000;i++){game.update(1/60,true);state=game.snapshot();if(state.phase==='gear')break}
 assert.equal(state.phase,'gear');const ids=state.fish.map(f=>f.id);moveTo(game,{x:255,y:250});game.input('x',true);game.input('x',false);assert.equal(game.snapshot().gearReady,true);moveTo(game,{x:50,y:150});game.input('z',true);game.input('z',false);state=game.snapshot();assert.equal(state.phase,'dive');for(const id of ids)assert.ok(state.fish.some(f=>f.id===id));
});

test('audio events follow harpoon, catch and service transitions without repeating per frame',()=>{
 const events=[],game=createReefGame(event=>events.push(event));game.input(' ',true);game.input(' ',false);assert.deepEqual(events,['shoot']);tick(game,40);assert.equal(events.filter(e=>e==='shoot').length,1);
 for(let i=0;i<12000&&!events.includes('gallery');i++)game.update(1/60,true);
 assert.ok(events.includes('pickup'),'bagged fish cue missing');assert.ok(events.includes('repair'),'surface cue missing');assert.ok(events.includes('shape'),'preparation cue missing');assert.ok(events.includes('fired'),'dish-ready cue missing');assert.ok(events.includes('gallery'),'served-diner cue missing');
});

test('moonfin banquet requires three served diners and preserves fish identities before reset',()=>{const old=Math.random;let seed=42;Math.random=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/2**32);try{const g=createReefGame();let s;for(let i=0;i<15000;i++){g.update(1/60,true);s=g.snapshot();if(s.phase==='service'&&s.tier===3&&s.roundServed===2&&s.step===0&&s.catches.some(f=>s.diners.some(d=>d.state==='waiting'&&d.wants===f.type)))break}assert.equal(s.roundServed,2);for(const station of g.snapshot().serviceRoom.stations){moveTo(g,station);action(g)}s=g.snapshot();const diner=s.diners.find(d=>d.state==='waiting'&&d.wants===s.carried?.type);assert.ok(diner);moveTo(g,diner);action(g);for(let i=0;i<30&&g.snapshot().phase==='service';i++)g.update(1/60,false);s=g.snapshot();assert.equal(s.phase,'feast');assert.equal(s.finish.happy,3);assert.equal(new Set(s.finish.fishIds).size,3);assert.ok(s.diners.some(d=>d.wants===3&&d.state==='happy'));tick(g,66);s=g.snapshot();assert.equal(s.phase,'dive');assert.equal(s.tier,1)}finally{Math.random=old}});
test('automatic diver prioritizes moonfin and completes the banquet',()=>{const old=Math.random;let seed=42;Math.random=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/2**32);try{const g=createReefGame();let feast=false,moonfin=false;for(let i=0;i<15000;i++){g.update(1/60,true);const s=g.snapshot();if(s.tier===3&&s.catches.some(f=>f.type===3))moonfin=true;if(s.phase==='feast'){feast=true;assert.equal(s.finish.happy,3);break}}assert.ok(moonfin);assert.ok(feast)}finally{Math.random=old}});

test('full service requires gear before departure; partial service permits a retry',()=>{
 const full=createReefGame();let s;
 for(let i=0;i<12000;i++){full.update(1/60,true);s=full.snapshot();if(s.phase==='gear')break}
 assert.equal(s.roundServed,3);assert.equal(s.gearReady,false);
 moveTo(full,{x:50,y:150});full.input('z',true);full.input('z',false);assert.equal(full.snapshot().phase,'gear');
 moveTo(full,{x:255,y:250});full.input('x',true);full.input('x',false);s=full.snapshot();assert.equal(s.tier,2);assert.equal(s.gearReady,true);const coins=s.coins;
 full.input('x',true);full.input('x',false);assert.equal(full.snapshot().tier,2);assert.equal(full.snapshot().coins,coins);
 moveTo(full,{x:50,y:150});full.input('z',true);full.input('z',false);assert.equal(full.snapshot().phase,'dive');assert.equal(full.snapshot().gearReady,false);
 const partial=createReefGame();for(let i=0;i<5000;i++){partial.update(1/60,true);if(partial.snapshot().bag===1)break}
 moveTo(partial,{x:100,y:180});moveTo(partial,{x:50,y:150});action(partial);for(let i=0;i<3000;i++){partial.update(1/60,true);if(partial.snapshot().phase==='gear')break}
 assert.equal(partial.snapshot().roundServed,1);assert.equal(partial.snapshot().gearReady,true);
 moveTo(partial,{x:50,y:150});partial.input('z',true);partial.input('z',false);assert.equal(partial.snapshot().phase,'dive');assert.equal(partial.snapshot().tier,1);
});

test('oxygen exhaustion loses the catch and returns the diver by buoy before replenishing fish',()=>{
 const g=createReefGame();let s;for(let i=0;i<5000;i++){g.update(1/60,true);s=g.snapshot();if(s.bag)break}assert.ok(s.bag);
 const lost=s.catches.map(f=>f.id);g.input('ArrowDown',true);for(let i=0;i<5000;i++){g.update(1/60,false);s=g.snapshot();if(s.phase==='rescue')break}
 assert.equal(s.phase,'rescue');assert.equal(s.oxygen,0);assert.equal(s.bag,0);assert.deepEqual(s.catches,[]);assert.ok(s.hero.y>200);const start={...s.hero},count=s.fish.length;
 g.input(' ',true);g.input(' ',false);tick(g,5);s=g.snapshot();assert.equal(s.phase,'rescue');assert.ok(Math.hypot(s.hero.x-50,s.hero.y-150)<Math.hypot(start.x-50,start.y-150));assert.equal(s.harpoon,null);
 for(let i=0;i<500&&g.snapshot().phase==='rescue';i++)g.update(1/60,false);s=g.snapshot();assert.equal(s.phase,'dive');assert.equal(s.oxygen,100);assert.equal(s.fish.length,count+3);for(const id of lost)assert.equal(s.fish.find(f=>f.id===id).caught,true);
 g.input('ArrowDown',false);for(let i=0;i<8000&&g.snapshot().bag===0;i++)g.update(1/60,true);assert.ok(g.snapshot().bag>0,'AI should resume catching after buoy recovery');
});
test('manual burst follows aim briefly and cannot repeat until its cooldown expires',()=>{const g=createReefGame(),start=g.snapshot();g.input('x',true);g.input('x',false);let s=g.snapshot();assert.ok(Math.abs(s.oxygen-(start.oxygen-14*100/690))<1e-9);assert.equal(s.burst,9/60);assert.equal(s.burstCooldown,95/60);g.input('x',true);g.input('x',false);assert.equal(g.snapshot().oxygen,s.oxygen,'repeat during cooldown is free and ignored');g.update(.05,false);s=g.snapshot();assert.ok(s.hero.x>start.hero.x,'neutral burst follows the aim');for(let i=0;i<31;i++)g.update(.05,false);s=g.snapshot();assert.equal(s.burst,0);assert.equal(s.burstCooldown,0);const before=s.oxygen;g.input('x',true);g.input('x',false);assert.ok(Math.abs(g.snapshot().oxygen-(before-14*100/690))<1e-9)});

test('each service tier uses its own stations and seats while AI serves',()=>{
 const old=Math.random;let seed=42;Math.random=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/2**32);try{const g=createReefGame(),rooms=new Map();for(let i=0;i<25000;i++){g.update(1/60,true);const s=g.snapshot();if(s.phase==='service'&&!rooms.has(s.tier)){rooms.set(s.tier,s.serviceRoom);assert.deepEqual(s.diners.map(d=>({x:d.seatX,y:d.seatY})),s.serviceRoom.seats)}if(rooms.size===3&&s.phase==='feast')break}assert.equal(rooms.size,3);assert.notDeepEqual(rooms.get(1).stations,rooms.get(2).stations);assert.notDeepEqual(rooms.get(2).stations,rooms.get(3).stations);assert.equal(g.snapshot().phase,'feast')}finally{Math.random=old}
});

test('diver is blocked by reef and can swim around it',()=>{
 const g=createReefGame();g.input('ArrowLeft',true);tick(g,40);g.input('ArrowLeft',false);g.input('ArrowDown',true);for(let i=0;i<90;i++){g.update(1/60,false);const h=g.snapshot().hero;assert.ok(Math.hypot(h.x-6,h.y-304)>=50-1e-6)}let s=g.snapshot();assert.ok(s.hero.x>20,'reef should deflect the swimmer');g.input('ArrowDown',false);g.input('ArrowRight',true);tick(g,40);g.input('ArrowRight',false);g.input('ArrowDown',true);tick(g,100);g.input('ArrowDown',false);assert.ok(g.snapshot().hero.y>320);
});

test('diver accelerates, coasts and shares momentum with AI swimming',()=>{
 const g=createReefGame();g.input('ArrowRight',true);g.update(1/60,false);const first=g.snapshot().hero;assert.ok(first.vx>0);for(let i=0;i<12;i++)g.update(1/60,false);const moving=g.snapshot().hero;assert.ok(moving.vx>first.vx);g.input('ArrowRight',false);g.update(1/60,false);const coast=g.snapshot().hero;assert.ok(coast.x>moving.x);assert.ok(coast.vx>0&&coast.vx<moving.vx);
 const ai=createReefGame();for(let i=0;i<60;i++)ai.update(1/60,true);assert.ok(Math.hypot(ai.snapshot().hero.vx,ai.snapshot().hero.vy)>0);
});

test('predator patrols its accessible depth and finishes a committed strike after contact',()=>{
 const g=createReefGame();assert.equal(g.snapshot().predator.y,392);g.input('ArrowRight',true);tick(g,70);g.input('ArrowRight',false);g.input('ArrowDown',true);tick(g,90);g.input('ArrowDown',false);
 let s;for(let i=0;i<600;i++){g.update(1/60,false);s=g.snapshot();if(s.notice==='PREDATOR HIT')break}assert.equal(s.notice,'PREDATOR HIT');assert.equal(s.predator.state,'strike');const p={x:s.predator.x,y:s.predator.y};g.update(1/60,false);s=g.snapshot();assert.ok(Math.hypot(s.predator.x-p.x,s.predator.y-p.y)>0);assert.equal(s.predator.state,'strike');
});

test('harpoon speed increases with each tank and has a 24-frame flight window',()=>{
 const g=createReefGame();g.input(' ',true);g.input(' ',false);let shot=g.snapshot().harpoon;assert.equal(Math.hypot(shot.vx,shot.vy),396);assert.equal(shot.life,24/60);
 for(const [tier,speed] of [[2,462],[3,528]]){let s;for(let i=0;i<20000;i++){g.update(1/60,true);s=g.snapshot();if(s.phase==='dive'&&s.tier===tier&&!s.harpoon)break}assert.equal(s.tier,tier);tick(g,40);g.input(' ',true);g.input(' ',false);shot=g.snapshot().harpoon;assert.ok(shot);assert.ok(Math.abs(Math.hypot(shot.vx,shot.vy)-speed)<1e-8);assert.equal(shot.life,24/60)}
});

test('fish schools stay at their tier depth and patrol bounded lanes',()=>{
 const g=createReefGame(),initial=g.snapshot().fish;for(const tier of [1,2,3]){const school=initial.filter(f=>f.tier===tier);assert.ok(Math.max(...school.map(f=>f.homeY))-Math.min(...school.map(f=>f.homeY))<=16)}
 for(let i=0;i<600;i++)g.update(1/60,false);const fish=g.snapshot().fish;for(const f of fish){assert.ok(f.x>=(f.tier===3?114:78)&&f.x<=(f.tier===3?238:260));assert.ok(Math.abs(f.y-f.homeY)<=5+1e-8)}assert.ok(fish.some(f=>Math.abs(f.y-f.homeY)>1));
});

test('unsold fish stays in the cold box across a manual or AI dive',()=>{
 const old=Math.random;try{for(const auto of [false,true]){let seed=42;Math.random=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/2**32);const g=createReefGame();let s;for(let i=0;i<10000;i++){g.update(1/60,true);s=g.snapshot();if(s.phase==='service')break}assert.equal(s.phase,'service');for(let i=0;i<2500;i++){g.update(1/60,false);s=g.snapshot();if(s.phase==='gear')break}assert.equal(s.phase,'gear');assert.ok(s.catches.length);const ids=s.catches.map(f=>f.id);
 if(auto){for(let i=0;i<2000&&g.snapshot().phase==='gear';i++)g.update(1/60,true)}else{moveTo(g,{x:50,y:150});g.input('z',true);g.input('z',false)}s=g.snapshot();assert.equal(s.phase,'dive');assert.deepEqual(s.pantry.map(f=>f.id),ids);
 for(let i=0;i<15000;i++){g.update(1/60,true);s=g.snapshot();if(s.phase==='service')break}assert.equal(s.phase,'service');for(const id of ids)assert.ok(s.catches.some(f=>f.id===id));
 }}finally{Math.random=old}
});

test('each reef tier exposes its own source-shaped collision geometry',()=>{
 const old=Math.random;let seed=42;Math.random=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/2**32);try{const g=createReefGame(),seen=new Map();for(let i=0;i<25000;i++){g.update(1/60,true);const s=g.snapshot();if(s.phase==='dive'&&!seen.has(s.tier))seen.set(s.tier,s.reefs);if(seen.size===3)break}assert.deepEqual([...seen.values()].map(r=>r.length),[6,5,5]);assert.deepEqual(seen.get(1)[0],{x:6,y:304,r:40});assert.deepEqual(seen.get(2)[0],{x:0,y:218,r:50});assert.deepEqual(seen.get(3)[0],{x:318,y:230,r:52})}finally{Math.random=old}
});

test('reef and restaurant render their tier names and preparation stations',()=>{
 const old=Math.random;let seed=42;Math.random=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/2**32);try{const g=createReefGame(),seen=new Set(),labels=[],ctx=new Proxy({fillText(value){labels.push(value)}},{get:(o,k)=>o[k]??(()=>{}),set:(o,k,v)=>(o[k]=v,true)});for(let i=0;i<25000;i++){g.update(1/60,true);const s=g.snapshot(),key=s.tier+':'+s.phase;if((s.phase==='dive'||s.phase==='service')&&!seen.has(key)){labels.length=0;g.draw(ctx);const title=s.phase==='dive'?['FAN CORAL','KELP CATHEDRAL','BLUE BASILICA'][s.tier-1]:['SUNLIT TABLE','KELP SUPPER','MOONFIN FEAST'][s.tier-1];assert.ok(labels.includes(title));if(s.phase==='service')for(const name of ['ICE','RICE','BOARD'])assert.ok(labels.includes(name));seen.add(key)}if(seen.size===6)break}assert.equal(seen.size,6)}finally{Math.random=old}
});

test('AI answers an imminent predator warning with a directional burst',()=>{
 const old=Math.random;let seed=42;Math.random=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/2**32);try{const events=[],g=createReefGame(e=>events.push(e));let response;for(let i=0;i<8000;i++){const before=events.length;g.update(1/60,true);if(events.slice(before).includes('dodge')){response=g.snapshot();break}}assert.ok(response,'AI should burst in response to a warning');assert.equal(response.predator.state,'warn');assert.ok(response.burstCooldown>0);assert.ok(response.burst>0);assert.ok(response.burstDir.y<0)}finally{Math.random=old}
});

test('AI leads a swimming fish instead of aiming at its old position',()=>{
 const old=Math.random;let seed=42;Math.random=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/2**32);try{const g=createReefGame();let s;for(let i=0;i<3000;i++){g.update(1/60,true);s=g.snapshot();if(s.harpoon&&!s.harpoon.fishId)break}assert.ok(s.harpoon);const p=s.harpoon,f=s.fish.find(f=>f.tier===s.tier&&!f.caught&&!f.hooked);assert.ok(f);const ox=p.x-p.vx/396*16,oy=p.y-p.vy/396*16,distance=Math.hypot(f.x-ox,f.y-oy),leadX=Math.max(78,Math.min(260,f.x+f.v*distance/396)),dx=leadX-ox,dy=f.y-oy,length=Math.hypot(dx,dy);assert.ok(Math.abs(p.vx/396-dx/length)<1e-8);assert.ok(Math.abs(p.vy/396-dy/length)<1e-8);assert.ok(Math.abs(leadX-f.x)>1)}finally{Math.random=old}
});

test('manual harpoon starts at the muzzle and expires on leaving the water',()=>{
 const g=createReefGame(),before=g.snapshot();g.input(' ',true);g.input(' ',false);let s=g.snapshot();assert.equal(s.harpoon.x,before.hero.x+16);assert.equal(s.harpoon.y,before.hero.y);
 const edge=createReefGame();edge.input('ArrowLeft',true);tick(edge,80);edge.input('ArrowLeft',false);edge.input(' ',true);edge.input(' ',false);assert.ok(edge.snapshot().harpoon);edge.update(1/60,false);s=edge.snapshot();assert.equal(s.harpoon,null);assert.equal(s.notice,'SHOT MISSED');
});

test('manual and AI chef remain at the board for the full preparation',()=>{
 const g=createReefGame();for(let i=0;i<8000&&g.snapshot().phase!=='service';i++)g.update(1/60,true);moveTo(g,{x:65,y:250});action(g);moveTo(g,{x:160,y:250});action(g);moveTo(g,{x:255,y:250});g.input(' ',true);g.input(' ',false);assert.ok(g.snapshot().work);const start=g.snapshot().hero;g.input('ArrowRight',true);tick(g,18);assert.deepEqual(g.snapshot().hero,start);tick(g,1);assert.equal(g.snapshot().work,null);assert.deepEqual(g.snapshot().hero,start);tick(g,1);assert.ok(g.snapshot().hero.x>start.x);g.input('ArrowRight',false);
 const ai=createReefGame();for(let i=0;i<10000&&!ai.snapshot().work;i++)ai.update(1/60,true);assert.ok(ai.snapshot().work);const aiStart=ai.snapshot().hero;for(let i=0;i<19;i++){ai.update(1/60,true);assert.deepEqual(ai.snapshot().hero,aiStart)}assert.equal(ai.snapshot().work,null);
});

test('return threshold increases with depth and only sends a diver home with a catch',()=>{
 assert.equal(reefShouldReturn(0,1,600,3),false);assert.equal(reefShouldReturn(3,100,150,1),true);assert.equal(reefShouldReturn(1,20,150,1),false);assert.equal(reefShouldReturn(1,20,600,3),true);assert.equal(reefShouldReturn(1,40,600,3),false);
});

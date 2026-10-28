import test from 'node:test';
import assert from 'node:assert/strict';
import { harbor, harborDepartureEligible } from '../src/feature-games30.js';

test('balanced tide eligibility requires both outer bays and a window load',()=>{
 const holds=[[{mass:2}],[],[{mass:3}]];
 assert.equal(harborDepartureEligible(holds,[{windowOpen:true}]),true);
 assert.equal(harborDepartureEligible(holds,[{windowOpen:false}]),false);
 assert.equal(harborDepartureEligible([[{mass:3}],[],[]],[{windowOpen:true}]),false);
 assert.equal(harborDepartureEligible([[{mass:3},{mass:3}],[],[{mass:1}]],[{windowOpen:true}]),false);
});

test('workers warn and cross while autoplay loads manifests and launches ships',()=>{
 const game=harbor();let warned=false,crossed=false,loaded=false,departure=false,steady=false;
 for(let i=0;i<36000;i++){
  game.update(1/60,true);const s=game.snapshot();
  warned ||= s.workers.some(w=>w.state==='warn');crossed ||= s.workers.some(w=>w.state==='cross');
  loaded ||= s.manifest.entries.length>0;steady ||= s.steadyLoads>0;
  if(s.manifest.lastDeparture){departure=true;assert.ok(s.manifest.lastDeparture.bays.flat().length>=4);break;}
 }
 assert.ok(warned&&crossed&&loaded&&departure&&steady);
});

test('manual crane builds momentum, hooks cargo and settles after a turn',()=>{
 const game=harbor();const key=(k,on)=>game.input(k,on);
 key('ArrowLeft',true);for(let i=0;i<13;i++)game.update(1/60,false);key('ArrowLeft',false);
 key('ArrowDown',true);for(let i=0;i<111;i++)game.update(1/60,false);key('ArrowDown',false);
 game.input(' ',true);game.input(' ',false);let state=game.snapshot();assert.ok(state.crane.carry,'manual hook did not pick up a box');
 key('ArrowUp',true);for(let i=0;i<100;i++)game.update(1/60,false);key('ArrowUp',false);
 key('ArrowRight',true);for(let i=0;i<50;i++)game.update(1/60,false);key('ArrowRight',false);state=game.snapshot();assert.ok(Math.abs(state.angle)>.001,'acceleration did not swing cargo');
 for(let i=0;i<300;i++)game.update(1/60,false);state=game.snapshot();assert.ok(Math.abs(state.angle)<.02,'swing did not settle');
});

test('manual rehandling removes only the top cargo and replaces its manifest entry',()=>{
 const game=harbor();const step=n=>{for(let i=0;i<n;i++)game.update(1/60,false)},press=()=>{game.input(' ',true);game.input(' ',false);step(25)};
 function move(axis,target){for(let i=0;i<1000;i++){const s=game.snapshot(),v=axis==='x'?s.crane.x:150+Math.cos(s.angle)*s.crane.rope,d=target-v;if(Math.abs(d)<3)break;const key=axis==='x'?(d<0?'ArrowLeft':'ArrowRight'):(d<0?'ArrowUp':'ArrowDown');game.input(key,true);step(1);game.input(key,false)}step(50)}
 move('x',55);move('y',490);press();const first=game.snapshot().crane.carry.id;move('y',220);move('x',225);move('y',490);press();
 move('y',220);move('x',100);move('y',490);press();const top=game.snapshot().crane.carry.id;assert.notEqual(top,first);move('y',220);move('x',225);move('y',463);press();let s=game.snapshot();assert.deepEqual(s.holds[1].map(b=>b.id),[first,top]);assert.equal(s.manifest.entries.length,2);
 press();s=game.snapshot();assert.equal(s.crane.carry.id,top);assert.deepEqual(s.holds[1].map(b=>b.id),[first]);assert.deepEqual(s.manifest.entries.map(e=>e.id),[first,top]);assert.equal(s.manifest.entries.find(e=>e.id===top).bay,1);
 move('y',220);move('x',195);move('y',490);press();s=game.snapshot();assert.equal(s.holds[0][0].id,top);assert.equal(s.manifest.entries.length,2);assert.equal(s.manifest.entries.find(e=>e.id===top).bay,0);

});


test('dropping rehandled cargo outside a hold removes its pending manifest entry',()=>{
 const game=harbor();const step=n=>{for(let i=0;i<n;i++)game.update(1/60,false)},press=()=>{game.input(' ',true);game.input(' ',false);step(25)};
 function move(axis,target){for(let i=0;i<1000;i++){const s=game.snapshot(),v=axis==='x'?s.crane.x:150+Math.cos(s.angle)*s.crane.rope,d=target-v;if(Math.abs(d)<3)break;const key=axis==='x'?(d<0?'ArrowLeft':'ArrowRight'):(d<0?'ArrowUp':'ArrowDown');game.input(key,true);step(1);game.input(key,false)}step(50)}
 move('x',55);move('y',490);press();const id=game.snapshot().crane.carry.id;move('y',220);move('x',225);move('y',490);press();press();assert.equal(game.snapshot().manifest.entries[0].id,id);
 move('y',220);move('x',162);move('y',490);press();const s=game.snapshot();assert.equal(s.crane.carry,null);assert.ok(!s.boxes.some(b=>b.id===id),'overboard cargo should be lost');assert.ok(!s.manifest.entries.some(e=>e.id===id));
});

test('a safe worker warning counts one clearance, not one per frame',()=>{
 const game=harbor(),key=(k,d)=>game.input(k,d);
 key('ArrowLeft',true);for(let i=0;i<13;i++)game.update(1/60,false);key('ArrowLeft',false);
 key('ArrowDown',true);for(let i=0;i<111;i++)game.update(1/60,false);key('ArrowDown',false);
 key(' ',true);key(' ',false);assert.ok(game.snapshot().crane.carry);
 key('ArrowUp',true);for(let i=0;i<110;i++)game.update(1/60,false);key('ArrowUp',false);
 let state,workerIndex=-1;
 for(let i=0;i<1000;i++){game.update(1/60,false);state=game.snapshot();workerIndex=state.workers.findIndex(w=>w.state==='warn'&&w.resolved&&w.timer>.15);if(workerIndex>=0)break}
 assert.ok(workerIndex>=0,'no resolved warning observed');const baseline=state.clearances;
 for(let i=0;i<5;i++)game.update(1/60,false);
 state=game.snapshot();assert.equal(state.workers[workerIndex].state,'warn');assert.ok(state.workers[workerIndex].resolved);assert.ok(state.clearances<=baseline+1,'only the other worker may add a clearance');
});


test('manual high release falls into a hold and records a damaged load',()=>{
 const game=harbor(),step=n=>{for(let i=0;i<n;i++)game.update(1/60,false)},press=()=>{game.input(' ',true);game.input(' ',false);step(25)};
 function move(axis,target){for(let i=0;i<1000;i++){const s=game.snapshot(),v=axis==='x'?s.crane.x:150+Math.cos(s.angle)*s.crane.rope,d=target-v;if(Math.abs(d)<3)break;const key=axis==='x'?(d<0?'ArrowLeft':'ArrowRight'):(d<0?'ArrowUp':'ArrowDown');game.input(key,true);step(1);game.input(key,false)}step(50)}
 move('x',55);move('y',490);press();const id=game.snapshot().crane.carry.id;move('y',220);move('x',195);press();let s=game.snapshot();assert.ok(s.boxes.some(b=>b.id===id&&b.mode==='falling'));step(60);s=game.snapshot();assert.ok(s.holds[0].some(b=>b.id===id&&b.scar>0));assert.equal(s.manifest.entries.find(e=>e.id===id).steady,false);assert.equal(new Set(s.boxes.map(b=>b.x)).size,s.boxes.length,'yard replenishment must use an unoccupied position');
});

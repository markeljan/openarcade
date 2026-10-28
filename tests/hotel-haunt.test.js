import test from 'node:test';
import assert from 'node:assert/strict';
import {hotel} from '../src/feature-games13.js';

test('Hotel Haunt starts each floor with two possessions and ghosts persist through vents',()=>{
 const g=hotel();let s=g.snapshot();assert.equal(s.props.filter(p=>p.ghost).length,2);
 // Sweep the nearest possessed furniture, then leave the ghost alone.
 g.input('ArrowLeft',true);for(let i=0;i<49;i++)g.update(1/60,false);g.input('ArrowLeft',false);
 g.input(' ',true);for(let i=0;i<40;i++)g.update(1/60,false);g.input(' ',false);
 s=g.snapshot();assert.equal(s.ghosts.length,1);assert.equal(s.ghosts[0].state,'flee');
 for(let i=0;i<300&&g.snapshot().ghosts[0].state==='flee';i++)g.update(1/60,false);
 s=g.snapshot();assert.equal(s.ghosts[0].state,'venting');
 for(let i=0;i<60;i++)g.update(1/60,false);s=g.snapshot();assert.equal(s.ghosts[0].state,'possessed');assert.equal(s.ghosts.length,1);
});

test('Hotel Haunt AI progresses without awarding manual score',()=>{
 const g=hotel(); let firstRoom, relit;
 for(let i=0;i<1500;i++){
  g.update(1/60,true); const s=g.snapshot();
  if(!firstRoom&&s.roomEver.some(Boolean)) firstRoom=s;
  if(s.phase==='relit'&&!relit) relit=s;
  if(s.floor===2) break;
 }
 const s=g.snapshot();
 assert.ok(firstRoom); assert.equal(firstRoom.score,0); // preview progress never enters the manual score
 assert.ok(relit); assert.deepEqual(relit.roomLit,[true,true]);
 assert.equal(relit.score,0);
 assert.equal(s.floor,2); assert.equal(s.score,0); assert.deepEqual(s.roomEver,[false,false]);
});

test('Hotel Haunt ghost selects furniture on its exit side after escaping',()=>{
 const g=hotel();g.input('ArrowLeft',true);for(let i=0;i<49;i++)g.update(1/60,false);g.input('ArrowLeft',false);
 g.input(' ',true);for(let i=0;i<40;i++)g.update(1/60,false);g.input(' ',false);
 for(let i=0;i<300&&g.snapshot().ghosts[0].state==='flee';i++)g.update(1/60,false);
 const s=g.snapshot(), ghost=s.ghosts[0]; assert.equal(ghost.state,'venting');
 assert.equal(s.props[ghost.dest].x,290); // closest free furniture to the right vent
});

test('Hotel Haunt fleeing ghost briefly stuns a hunter who approaches without vacuuming',()=>{
 const g=hotel();g.input('ArrowLeft',true);for(let i=0;i<49;i++)g.update(1/60,false);g.input('ArrowLeft',false);
 g.input(' ',true);for(let i=0;i<40;i++)g.update(1/60,false);g.input(' ',false);
 g.input('ArrowRight',true);for(let i=0;i<250&&!g.snapshot().hunter.stun;i++)g.update(1/60,false);
 const hit=g.snapshot();assert.ok(hit.hunter.stun>0);assert.ok(hit.ghosts[0].spookCd>0);
 g.update(1/60,false);assert.equal(g.snapshot().hunter.x,hit.hunter.x);
});

test('Hotel Haunt starts a fresh manual run after preview and scores manual progress',()=>{
 const game=hotel();for(let i=0;i<1500;i++)game.update(1/60,true);
 assert.ok(game.snapshot().floor>1);assert.equal(game.snapshot().score,0);
 game.update(0,false);let s=game.snapshot();
 assert.equal(s.floor,1);assert.equal(s.sweeps,0);assert.equal(s.score,0);
 assert.equal(s.props.filter(p=>p.ghost).length,2);assert.equal(s.hunter.x,160);
 let firstRoom,relit;
 for(let i=0;i<1500;i++){
  s=game.snapshot();const ghost=s.ghosts.find(g=>g.state==='flee'||g.state==='stunned');
  const prop=s.props.find(p=>!p.searched),vent=s.vents.find(v=>!v.sealed);
  const target=ghost?.x??prop?.x??vent?.x??160,delta=target-s.hunter.x;
  game.input('ArrowRight',delta>10);game.input('ArrowLeft',delta< -10);
  game.input(' ',!!ghost&&Math.abs(delta)<85||!!prop&&Math.abs(delta)<12||!ghost&&!prop&&!!vent&&Math.abs(delta)<25);
  game.update(1/60,false);s=game.snapshot();
  if(!firstRoom&&s.roomEver.some(Boolean))firstRoom=s;
  if(s.phase==='relit'){relit=s;break}
 }
 assert.ok(firstRoom);assert.equal(firstRoom.score,125);
 assert.ok(relit);assert.equal(relit.score,490);
});



test('sweep requires reference range and interrupted work decays at two frames per frame',()=>{
 const g=hotel(()=>{},{checkinSeed:0,firstCheckin:999});
 g.input(' ',true);for(let i=0;i<40;i++)g.update(1/60,false);assert.equal(g.snapshot().sweeps,0);
 g.input(' ',false);g.input('ArrowLeft',true);for(let i=0;i<25;i++)g.update(1/60,false);g.input('ArrowLeft',false);
 g.input(' ',true);for(let i=0;i<20;i++)g.update(1/60,false);assert.equal(g.snapshot().hunter.sweepT,20);
 g.input(' ',false);for(let i=0;i<5;i++)g.update(1/60,false);assert.equal(g.snapshot().hunter.sweepT,10);
 g.input(' ',true);for(let i=0;i<25;i++)g.update(1/60,false);assert.equal(g.snapshot().sweeps,0);g.update(1/60,false);assert.equal(g.snapshot().sweeps,1);
});
test('sweep progress belongs to hunter and carries across furniture when action stays held',()=>{
 const g=hotel(()=>{},{checkinSeed:0,firstCheckin:999});g.input('ArrowLeft',true);for(let i=0;i<25;i++)g.update(1/60,false);g.input('ArrowLeft',false);g.input(' ',true);for(let i=0;i<15;i++)g.update(1/60,false);g.input('ArrowLeft',true);for(let i=0;i<24;i++)g.update(1/60,false);g.input('ArrowLeft',false);
 const s=g.snapshot();assert.equal(s.props[2].searched,false);assert.ok(s.hunter.sweepT>15);for(let i=0;i<30&&g.snapshot().sweeps===0;i++)g.update(1/60,false);assert.equal(g.snapshot().props[1].searched,true);
});
test('seed selects reference persona sweep threshold',()=>{
 for(const [seed,frames] of [[0,36],[1,29],[2,32]]){const g=hotel(()=>{},{checkinSeed:seed,firstCheckin:999});g.input('ArrowLeft',true);for(let i=0;i<25;i++)g.update(1/60,false);g.input('ArrowLeft',false);g.input(' ',true);for(let i=1;i<frames;i++)g.update(1/60,false);assert.equal(g.snapshot().sweeps,0);g.update(1/60,false);assert.equal(g.snapshot().sweeps,1)}
});


test('manual held sweep and movement match at 30Hz and 60Hz',()=>{
 const run=hz=>{const cues=[],g=hotel(e=>cues.push(e),{checkinSeed:42,firstCheckin:999});g.input('ArrowLeft',true);g.input(' ',true);for(let i=0;i<hz*2;i++)g.update(1/hz,false);g.input('ArrowLeft',false);for(let i=0;i<hz;i++)g.update(1/hz,false);return {state:g.snapshot(),cues}};
 const a=run(30),b=run(60);assert.deepEqual(a,b);assert.ok(a.state.sweeps>0);assert.ok(a.cues.includes('hotel-sweep'));
});
test('seeded AI matches at 30Hz and 60Hz through check-in and floor progress',()=>{
 const run=hz=>{const cues=[],g=hotel(e=>cues.push(e),{checkinSeed:42,firstCheckin:1});for(let i=0;i<hz*90;i++)g.update(1/hz,true);return {state:g.snapshot(),cues}};
 const a=run(30),b=run(60);assert.deepEqual(a,b);assert.ok(a.state.floor>1);assert.ok(a.cues.includes('hotel-checkin-warning'));assert.ok(a.cues.includes('hotel-relight'));
});
test('hotel reset clears fractional frame time',()=>{const g=hotel(()=>{},{checkinSeed:0,firstCheckin:999});g.input('ArrowLeft',true);g.update(1/120,false);g.reset();g.update(1/120,false);assert.equal(g.snapshot().hunter.x,160);g.update(1/120,false);assert.ok(g.snapshot().hunter.x<160)});

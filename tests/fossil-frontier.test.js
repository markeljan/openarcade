import test from 'node:test';
import assert from 'node:assert/strict';
import { fossil } from '../src/feature-games27.js';
function makeGame(){const old=Math.random;Math.random=()=>0;try{return fossil()}finally{Math.random=old}}
const press=(g,k)=>{g.input(k,true);g.input(k,false);g.update(.3,false)};
function move(g,x,y){for(const [axis,target,neg,pos] of [['x',x,'ArrowLeft','ArrowRight'],['y',y,'ArrowUp','ArrowDown']]){const d=target-g.snapshot().hero[axis];if(d){const k=d<0?neg:pos;g.input(k,true);let remaining=Math.abs(d)/110;while(remaining>1e-9){const dt=Math.min(1/60,remaining);g.update(dt,false);remaining-=dt}g.input(k,false)}}}
test('fractured fossil requires bench repair and matching museum socket',()=>{
 const g=makeGame();move(g,83,404);press(g,'x');assert.equal(g.snapshot().cells[8].fractured,true);assert.equal(g.snapshot().carry.length,0);press(g,' ');assert.equal(g.snapshot().carry[0].part,'hips');assert.equal(g.snapshot().carry[0].fractured,true);const recovered=g.snapshot().carry[0];assert.equal(recovered.source,'site:1:8');assert.deepEqual(recovered.fragments,['site:1:8:fragment:0','site:1:8:fragment:1','site:1:8:fragment:2']);assert.equal(recovered.stabilized,false);
 move(g,90,240);press(g,' ');assert.equal(g.snapshot().mounted.length,0);
 move(g,35,240);g.input(' ',true);g.update(.6,false);assert.equal(g.snapshot().carry[0].repaired,false);g.update(.7,false);g.input(' ',false);assert.equal(g.snapshot().carry[0].repaired,true);assert.equal(g.snapshot().carry[0].repairContact.bench,'reconstruction-bench');assert.ok(g.snapshot().carry[0].repairedAt>=recovered.recoveredAt);
 move(g,160,240);press(g,' ');assert.equal(g.snapshot().mounted.length,0);
 move(g,90,240);press(g,' ');assert.deepEqual(g.snapshot().mounted,['hips']);const mounted=g.snapshot().mountedFinds[0];assert.equal(mounted.source,recovered.source);assert.equal(mounted.socket,'tail');assert.equal(mounted.stabilized,false);assert.ok(mounted.mountedAt>=mounted.repairedAt);
});
test('autoplay mounts nine distinct finds and advances the site',()=>{
 const g=makeGame();let completed=false;for(let i=0;i<12000;i++){g.update(1/60,true);if(g.snapshot().site>1){completed=true;break}}assert.ok(completed);const s=g.snapshot();assert.equal(s.history[0].finds.length,9);assert.equal(new Set(s.history[0].finds.map(f=>f.source)).size,9);
});

test('fragile fossil requires surveyed edge clearance and a column brace',()=>{
 const g=makeGame();move(g,83,404);press(g,' ');let s=g.snapshot();assert.equal(s.cells[8].surveyed,true);assert.equal(s.cells[8].cover,1);press(g,' ');assert.equal(g.snapshot().carry.length,0);assert.equal(g.snapshot().message,'CLEAR THE BONE EDGE');
 move(g,121,404);press(g,' ');press(g,' ');assert.equal(g.snapshot().cells[9].cover,0);move(g,83,404);press(g,' ');assert.equal(g.snapshot().message,'BRACE THE FIND');assert.equal(g.snapshot().carry.length,0);press(g,'z');press(g,' ');s=g.snapshot();assert.equal(s.braces[1],1);assert.equal(s.carry[0].part,'hips');assert.equal(s.carry[0].fractured,false);assert.equal(s.carry[0].stabilized,true);assert.equal(s.carry[0].source,'site:1:8');
});

test('chipping a sturdy fossil does not fracture it',()=>{
 const g=makeGame();move(g,159,356);press(g,'x');const s=g.snapshot();assert.equal(s.cells[3].fragile,false);assert.equal(s.cells[3].fractured,false);assert.equal(s.carry[0].part,'tail');assert.equal(s.carry[0].stabilized,false);
});

test('AI prepares fossil edges and installs support before excavation',()=>{
 const g=makeGame();let sawSupport=false;for(let i=0;i<12000&&g.snapshot().site===1;i++){g.update(1/60,true);if(g.snapshot().braces.some(v=>v>0))sawSupport=true}assert.ok(sawSupport);assert.ok(g.snapshot().site>1);
});

test('rockfall returns a repaired find to its source without losing its identity',()=>{
 const oldRandom=Math.random;Math.random=()=>.4;
 try{
  const g=makeGame();move(g,83,404);press(g,'x');press(g,' ');const found=g.snapshot().carry[0];
  move(g,35,240);g.input(' ',true);g.update(1.3,false);g.input(' ',false);assert.equal(g.snapshot().carry[0].repaired,true);
  move(g,83,404);for(let i=0;i<1500&&g.snapshot().carry.length;i++)g.update(1/60,false);
  let s=g.snapshot();assert.equal(s.carry.length,0);assert.equal(s.cells[8].recovered,false);assert.equal(s.cells[8].returnedFind.source,found.source);assert.equal(s.cells[8].returnedFind.repaired,true);assert.equal(s.cells[8].returnedFind.status,'exposed-repaired');assert.equal(s.fragmentRecoveries,1);
  press(g,' ');s=g.snapshot();assert.equal(s.carry[0].source,found.source);assert.deepEqual(s.carry[0].fragments,found.fragments);assert.equal(s.carry[0].repaired,true);assert.equal(s.carry[0].status,'repaired');assert.equal(s.fragmentRecoveries,1);
  move(g,90,240);press(g,' ');assert.equal(g.snapshot().mountedFinds[0].source,found.source);
 }finally{Math.random=oldRandom}
});

test('rockfall returns unrepaired fragments as fragments and a repeat recovery is counted',()=>{
 const oldRandom=Math.random;Math.random=()=>.4;try{const g=makeGame();move(g,83,404);press(g,'x');press(g,' ');const find=g.snapshot().carry[0];assert.equal(g.snapshot().fragmentRecoveries,1);for(let i=0;i<1500&&g.snapshot().carry.length;i++)g.update(1/60,false);let s=g.snapshot();assert.equal(s.carry.length,0);assert.equal(s.cells[8].returnedFind.status,'fragments');assert.equal(s.cells[8].returnedFind.recoveredAt,find.recoveredAt);assert.equal(s.fragmentRecoveries,1);press(g,' ');s=g.snapshot();assert.equal(s.fragmentRecoveries,2);assert.equal(s.carry[0].status,'carried-fragments');assert.equal(s.carry[0].source,find.source);assert.equal(s.carry[0].recoveredAt,find.recoveredAt);assert.deepEqual(s.carry[0].fragments,find.fragments)}finally{Math.random=oldRandom}
});

test('digging weakens a column and bracing a warned rockfall absorbs it',()=>{
 const old=Math.random;Math.random=()=>.4;try{const g=makeGame();move(g,121,404);let s=g.snapshot();assert.equal(s.hazard.warn,true);assert.equal(s.hazard.col,2);const before=s.stability[2];press(g,'x');s=g.snapshot();assert.equal(s.cells[9].cover,0);assert.equal(s.stability[2],before-7);assert.equal(s.hazard.warn,true);
 g.input('z',true);g.input('z',false);s=g.snapshot();assert.equal(s.hazard.countered,true);assert.equal(s.braces[2],1);assert.equal(s.stability[2],Math.min(100,before-7+38));const health=s.health;
 g.update(.2,false);s=g.snapshot();assert.equal(s.hazard.phase,'fall');assert.equal(s.braces[2],0);assert.equal(s.health,health);assert.equal(s.cells[9].cover,0);assert.equal(s.message,'SUPPORT HELD');
 }finally{Math.random=old}
});
test('an unbraced rockfall reburies an exposed empty cell and damages the miner',()=>{
 const old=Math.random;Math.random=()=>.4;try{const g=makeGame();move(g,121,404);let s=g.snapshot();assert.equal(s.hazard.col,2);press(g,'x');assert.equal(g.snapshot().cells[9].cover,0);const health=g.snapshot().health;g.update(.2,false);s=g.snapshot();assert.equal(s.hazard.phase,'fall');assert.equal(s.health,health-1);assert.equal(s.cells[9].cover,1);assert.ok(s.invulnerable>0)}finally{Math.random=old}
});
test('AI uses timed braces during a warned rockfall and still completes a site',()=>{
 const old=Math.random;let seed=42;Math.random=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/2**32);try{const g=makeGame();let countered=false,completed=false;for(let i=0;i<60*120;i++){g.update(1/60,true);const s=g.snapshot();countered||=s.hazard.countered;if(s.site>1)completed=true;if(countered&&completed)break}assert.ok(countered,'AI should brace a warning');assert.ok(completed,'AI should continue assembling the exhibit')}finally{Math.random=old}
});

test('excavation uses seven columns, six rows and reference-banded fossil placement',()=>{
 const g=makeGame(),s=g.snapshot();assert.deepEqual(s.geometry,{ox:26,oy:332,cols:7,rows:6,cellWidth:38,cellHeight:48});assert.equal(s.cells.length,42);assert.equal(s.stability.length,7);assert.equal(s.braces.length,7);
 const slots=[3,8,12,17,20,25,30,35,39];assert.deepEqual(s.cells.filter(c=>c.part).map(c=>c.y*7+c.x),slots);assert.equal(new Set(s.cells.filter(c=>c.part).map(c=>c.part)).size,9);
 for(const cell of s.cells.filter(c=>c.part)){assert.equal(cell.cover,2+(cell.y>2?1:0));if(cell.perimeter>=0){const edge=s.cells[cell.perimeter];assert.equal(edge.y,cell.y);assert.equal(Math.abs(edge.x-cell.x),1);assert.equal(edge.part,null)}}
});
test('manual excavator can work the seventh column',()=>{
 const g=makeGame();move(g,273,356);const before=g.snapshot().cells[6];assert.equal(before.part,null);press(g,'x');const after=g.snapshot().cells[6];assert.equal(after.cover,Math.max(0,before.cover-2));assert.ok(g.snapshot().stability[6]<80);
});
test('AI completes the expanded grid across randomized site layouts',()=>{
 const old=Math.random;try{for(const initial of [1,7,42]){let seed=initial;Math.random=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/2**32);const g=fossil();let done=false;for(let i=0;i<12000&&!done;i++){g.update(1/60,true);if(i%60===0)done=g.snapshot().site>1}assert.ok(done,`seed ${initial} should complete the exhibit`)}}finally{Math.random=old}
});

import test from 'node:test';
import assert from 'node:assert/strict';
import { fossil } from '../src/feature-games27.js';
function makeGame(){const old=Math.random;Math.random=()=>0;try{return fossil()}finally{Math.random=old}}
const press=(g,k)=>{g.input(k,true);g.update(1/60,false);g.input(k,false);g.update(.3,false)};
function move(g,x,y){const axes=[['x',x,'ArrowLeft','ArrowRight'],['y',y,'ArrowUp','ArrowDown']];if(g.snapshot().carry.length&&y<g.snapshot().hero.y)axes.reverse();for(const [axis,target,neg,pos] of axes){const d=target-g.snapshot().hero[axis];if(d){const k=d<0?neg:pos;g.input(k,true);let remaining=Math.abs(d)/(g.snapshot().carry.length?171.6:204);while(remaining>1e-9){const dt=Math.min(1/60,remaining);g.update(dt,false);remaining-=dt}g.input(k,false)}}}
test('fractured fossil requires bench repair and matching museum socket',()=>{
 const g=makeGame();move(g,83,404);press(g,'x');assert.equal(g.snapshot().cells[8].fractured,true);assert.equal(g.snapshot().carry.length,0);press(g,' ');assert.equal(g.snapshot().carry[0].part,'hips');assert.equal(g.snapshot().carry[0].fractured,true);const recovered=g.snapshot().carry[0];assert.equal(g.snapshot().manualScore,55);assert.equal(recovered.source,'site:1:8');assert.deepEqual(recovered.fragments,['site:1:8:fragment:0','site:1:8:fragment:1','site:1:8:fragment:2']);assert.equal(recovered.stabilized,false);
 move(g,112,280);press(g,' ');assert.equal(g.snapshot().mounted.length,0);
 move(g,64,280);g.input(' ',true);g.update(.6,false);assert.equal(g.snapshot().carry[0].repaired,false);g.update(.7,false);g.input(' ',false);assert.equal(g.snapshot().carry[0].repaired,true);assert.equal(g.snapshot().carry[0].repairContact.bench,'reconstruction-bench');assert.ok(g.snapshot().carry[0].repairedAt>=recovered.recoveredAt);
 move(g,162,280);press(g,' ');assert.equal(g.snapshot().mounted.length,0);
 move(g,112,280);press(g,' ');assert.deepEqual(g.snapshot().mounted,['hips']);assert.equal(g.snapshot().manualScore,155);const mounted=g.snapshot().mountedFinds[0];assert.equal(mounted.source,recovered.source);assert.equal(mounted.socket,'tail');assert.equal(mounted.stabilized,false);assert.ok(mounted.mountedAt>=mounted.repairedAt);
});
test('autoplay mounts nine distinct finds and advances the site',()=>{
 const g=makeGame();let completed=false;for(let i=0;i<12000;i++){g.update(1/60,true);if(g.snapshot().site>1){completed=true;break}}assert.ok(completed);const s=g.snapshot();assert.equal(s.history[0].finds.length,9);assert.equal(new Set(s.history[0].finds.map(f=>f.source)).size,9);assert.equal(s.manualScore,0,'preview work must not award manual points');
});

test('fragile fossil requires surveyed edge clearance and a column brace',()=>{
 const g=makeGame();move(g,83,404);press(g,' ');let s=g.snapshot();assert.equal(s.cells[8].surveyed,true);assert.equal(s.cells[8].cover,1);g.input(' ',true);g.update(1/60,false);g.input(' ',false);assert.equal(g.snapshot().carry.length,0);assert.equal(g.snapshot().message,'CLEAR THE BONE EDGE');g.update(.3,false);
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
  move(g,64,280);g.input(' ',true);g.update(1.3,false);g.input(' ',false);assert.equal(g.snapshot().carry[0].repaired,true);
  move(g,83,404);for(let i=0;i<1500&&g.snapshot().carry.length;i++)g.update(1/60,false);
  let s=g.snapshot();assert.equal(s.carry.length,0);assert.equal(s.cells[8].recovered,false);assert.equal(s.cells[8].returnedFind.source,found.source);assert.equal(s.cells[8].returnedFind.repaired,true);assert.equal(s.cells[8].returnedFind.status,'exposed-repaired');assert.equal(s.fragmentRecoveries,1);const shapes=[],noop=()=>{};let start;const ctx=new Proxy({beginPath(){start=null},moveTo(x,y){if(!start)start=[x,y]},fill(){shapes.push({start,color:ctx.fillStyle})}},{get:(o,k)=>o[k]??noop,set:(o,k,v)=>(o[k]=v,true)});g.draw(ctx);assert.ok(shapes.some(p=>p.color==='#f8e7bd'&&p.start?.[0]===73&&p.start?.[1]===400),'repaired find appears as a bone');assert.ok(!shapes.some(p=>p.color==='#fff8df'&&p.start?.[0]===61&&p.start?.[1]===398),'repaired find does not appear fragmented');
  const scoreBeforeRecovery=s.manualScore;press(g,' ');s=g.snapshot();assert.equal(s.manualScore,scoreBeforeRecovery,'recovering a dropped find must not score twice');assert.equal(s.carry[0].source,found.source);assert.deepEqual(s.carry[0].fragments,found.fragments);assert.equal(s.carry[0].repaired,true);assert.equal(s.carry[0].status,'repaired');assert.equal(s.fragmentRecoveries,1);
  move(g,112,280);press(g,' ');assert.equal(g.snapshot().mountedFinds[0].source,found.source);
 }finally{Math.random=oldRandom}
});

test('rockfall returns unrepaired fragments as fragments and a repeat recovery is counted',()=>{
 const oldRandom=Math.random;Math.random=()=>.4;try{const g=makeGame();move(g,83,404);press(g,'x');press(g,' ');const find=g.snapshot().carry[0];assert.equal(g.snapshot().fragmentRecoveries,1);for(let i=0;i<1500&&g.snapshot().carry.length;i++)g.update(1/60,false);let s=g.snapshot();assert.equal(s.carry.length,0);assert.equal(s.cells[8].returnedFind.status,'fragments');assert.equal(s.cells[8].returnedFind.recoveredAt,find.recoveredAt);assert.equal(s.fragmentRecoveries,1);press(g,' ');s=g.snapshot();assert.equal(s.fragmentRecoveries,2);assert.equal(s.carry[0].status,'carried-fragments');assert.equal(s.carry[0].source,find.source);assert.equal(s.carry[0].recoveredAt,find.recoveredAt);assert.deepEqual(s.carry[0].fragments,find.fragments)}finally{Math.random=oldRandom}
});

test('digging weakens a column and bracing a warned rockfall absorbs it',()=>{
 const old=Math.random;Math.random=()=>.4;try{const g=makeGame();move(g,121,404);for(let i=0;i<120&&!g.snapshot().hazard.warn;i++)g.update(1/60,false);let s=g.snapshot();assert.equal(s.hazard.warn,true);assert.equal(s.hazard.col,2);const before=s.stability[2];press(g,'x');s=g.snapshot();assert.equal(s.cells[9].cover,0);assert.equal(s.manualScore,5);assert.equal(s.stability[2],before-7);assert.equal(s.hazard.warn,true);
 g.input('z',true);g.update(1/60,false);g.input('z',false);s=g.snapshot();assert.equal(s.hazard.countered,true);assert.equal(s.braces[2],1);assert.equal(s.stability[2],Math.min(100,before-7+38));const health=s.health;
 for(let i=0;i<50&&g.snapshot().hazard.phase==='warn';i++)g.update(1/60,false);s=g.snapshot();assert.equal(s.hazard.phase,'fall');assert.equal(s.braces[2],0);assert.equal(s.health,health);assert.equal(s.cells[9].cover,0);assert.equal(s.message,'SUPPORT HELD');
 }finally{Math.random=old}
});
test('an unbraced rockfall reburies an exposed empty cell and damages the miner',()=>{
 const old=Math.random;Math.random=()=>.4;try{const g=makeGame();move(g,121,404);for(let i=0;i<120&&!g.snapshot().hazard.warn;i++)g.update(1/60,false);let s=g.snapshot();assert.equal(s.hazard.col,2);press(g,'x');assert.equal(g.snapshot().cells[9].cover,0);const health=g.snapshot().health;for(let i=0;i<50&&g.snapshot().hazard.phase==='warn';i++)g.update(1/60,false);s=g.snapshot();assert.equal(s.hazard.phase,'fall');assert.equal(s.health,health-1);assert.equal(s.cells[9].cover,1);assert.ok(s.invulnerable>0)}finally{Math.random=old}
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

test('holding a tool repeats excavation after the reference action cooldown',()=>{const g=makeGame();move(g,121,356);const before=g.snapshot().cells[2].cover;g.input(' ',true);g.update(1/60,false);assert.equal(g.snapshot().cells[2].cover,before-1);g.update(.1,false);assert.equal(g.snapshot().cells[2].cover,before-1);g.update(.06,false);g.input(' ',false);assert.equal(g.snapshot().cells[2].cover,0)});
test('timber restock refills to four and respects its cooldown',()=>{const g=makeGame();move(g,83,404);press(g,'z');assert.equal(g.snapshot().supplies,2);move(g,275,280);press(g,' ');let s=g.snapshot();assert.equal(s.supplies,4);assert.ok(s.restockCooldown>0);move(g,275,333);g.input('z',true);g.update(1/60,false);g.input('z',false);assert.equal(g.snapshot().supplies,3);move(g,275,280);g.input(' ',true);g.update(1/60,false);g.input(' ',false);s=g.snapshot();assert.equal(s.supplies,3);for(let i=0;i<150;i++)g.update(1/60,false);press(g,' ');assert.equal(g.snapshot().supplies,4)});

test('completed exhibit remains visible while a calm transition schedules the next site hazard',()=>{
 const old=Math.random;let seed=1;Math.random=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296);try{const g=fossil();let s=g.snapshot(),before;assert.equal(s.siteName,'RED MESA');assert.equal(s.species,'RIDGEBACK');for(let i=0;i<12000&&s.site===1;i++){before=s;g.update(1/60,true);s=g.snapshot()}assert.equal(s.site,2);assert.equal(s.siteName,'AMBER MARSH');assert.equal(s.species,'LONG NECK');assert.equal(s.displayedExhibit.species,'RIDGEBACK');assert.equal(s.displayedExhibit.parts.length,9);assert.deepEqual(s.stability,Array.from({length:7},(_,i)=>Math.max(48,77-(i*7+5)%16)));assert.ok(s.supplies>=2);assert.equal(before.hazard.phase,'calm');assert.equal(s.hazard.phase,'calm');assert.ok(Math.abs(s.hazard.t-105/60)<1e-9)}finally{Math.random=old}
});

test('manual fossil work emits event cues at actual state changes',()=>{const cues=[];const old=Math.random;Math.random=()=>0;let g;try{g=fossil(c=>cues.push(c))}finally{Math.random=old}move(g,83,404);press(g,'x');press(g,' ');move(g,64,280);g.input(' ',true);g.update(1.3,false);g.input(' ',false);move(g,112,280);press(g,' ');for(const cue of ['fossil-chip','fossil-fracture','fossil-recover','fossil-repair','fossil-mount'])assert.ok(cues.includes(cue),cue)});
test('AI excavation emits brush, support, discovery and completed exhibit cues',()=>{const cues=[];const old=Math.random;Math.random=()=>0;let g;try{g=fossil(c=>cues.push(c))}finally{Math.random=old}for(let i=0;i<12000&&g.snapshot().site===1;i++)g.update(1/60,true);for(const cue of ['fossil-brush','fossil-found','fossil-brace','fossil-recover','fossil-mount','fossil-complete'])assert.ok(cues.includes(cue),cue)});
test('manual final mounting scores the bone and completed exhibit after preview takeover',()=>{const old=Math.random;Math.random=()=>.4;try{const g=makeGame();for(let i=0;i<20000;i++){g.update(1/60,true);const s=g.snapshot();if(s.mounted.length===8&&s.carry.length&&!s.carry[0].fractured)break}let s=g.snapshot();assert.equal(s.mounted.length,8);assert.equal(s.manualScore,0);const find=s.carry[0],part=find.part,x=['tail','hips','hindleg'].includes(part)?112:['spine','rib-low','rib-high'].includes(part)?162:212;move(g,s.hero.x,280);move(g,x,280);s=g.snapshot();assert.equal(s.carry[0]?.source,find.source,'the carried bone must reach its socket');press(g,' ');s=g.snapshot();assert.equal(s.site,2);assert.equal(s.manualScore,650)}finally{Math.random=old}});

test('carrying a recovered fossil slows manual movement',()=>{const empty=makeGame(),g=makeGame();move(g,83,404);press(g,'x');press(g,' ');assert.equal(g.snapshot().carry.length,1);for(const a of [empty,g])a.input('ArrowRight',true);const x0=empty.snapshot().hero.x,x1=g.snapshot().hero.x;for(let i=0;i<6;i++){empty.update(1/60,false);g.update(1/60,false)}assert.ok(Math.abs((empty.snapshot().hero.x-x0)-20.4)<1e-6);assert.ok(Math.abs((g.snapshot().hero.x-x1)-17.16)<1e-6)});

test('repair progresses while moving within bench reach and resets when leaving',()=>{
 const g=makeGame();move(g,83,404);press(g,'x');press(g,' ');move(g,64,280);g.input(' ',true);g.update(.3,false);const before=g.snapshot().repair;g.input('ArrowRight',true);g.update(.05,false);g.input('ArrowRight',false);assert.ok(g.snapshot().repair>before,'movement within the bench still repairs');g.input('ArrowRight',true);for(let i=0;i<20;i++)g.update(1/60,false);g.input('ArrowRight',false);g.update(1/60,false);assert.equal(g.snapshot().repair,0);assert.equal(g.snapshot().carry[0].repaired,false);move(g,64,280);for(let i=0;i<90&&!g.snapshot().carry[0].repaired;i++)g.update(1/60,false);g.input(' ',false);assert.equal(g.snapshot().carry[0].repaired,true);
});
test('AI returns a manually fractured find to the real bench and mounts it',()=>{
 const g=makeGame();move(g,83,404);press(g,'x');press(g,' ');assert.equal(g.snapshot().carry[0].fractured,true);for(let i=0;i<4000&&!g.snapshot().mounted.includes('hips');i++)g.update(1/60,true);const s=g.snapshot(),find=s.mountedFinds.find(x=>x.part==='hips');assert.ok(find);assert.equal(find.repaired,true);assert.ok(Math.hypot(find.repairContact.x-64,find.repairContact.y-280)<18);
});

test('manual museum mounting uses reference socket locations and strict reach',()=>{
 const g=makeGame();move(g,159,356);press(g,'x');assert.equal(g.snapshot().carry[0].part,'tail');move(g,136,280);press(g,' ');assert.equal(g.snapshot().mounted.length,0,'outside the socket reach');move(g,128,308);press(g,' ');assert.equal(g.snapshot().mounted.length,0,'below museum height cannot mount');move(g,128,280);press(g,' ');assert.deepEqual(g.snapshot().mounted,['tail']);
});
test('manual excavator can restock timber while carrying a find',()=>{
 const g=makeGame();move(g,159,356);press(g,'z');assert.equal(g.snapshot().supplies,2);press(g,'x');assert.equal(g.snapshot().carry[0].part,'tail');move(g,272,280);press(g,' ');const s=g.snapshot();assert.equal(s.supplies,4);assert.equal(s.carry[0].part,'tail');assert.equal(s.mounted.length,0);
});

test('excavator starts and moves within reference bounds at normalized speed',()=>{
 const g=makeGame();assert.deepEqual(g.snapshot().hero,{x:160,y:290});g.input('ArrowRight',true);g.input('ArrowDown',true);for(let i=0;i<6;i++)g.update(1/60,false);g.input('ArrowRight',false);g.input('ArrowDown',false);let p=g.snapshot().hero;assert.ok(Math.abs(Math.hypot(p.x-160,p.y-290)-20.4)<1e-8);g.input('ArrowUp',true);for(let i=0;i<100;i++)g.update(1/60,false);g.input('ArrowUp',false);assert.equal(g.snapshot().hero.y,266);g.input('ArrowRight',true);for(let i=0;i<100;i++)g.update(1/60,false);g.input('ArrowRight',false);assert.equal(g.snapshot().hero.x,302);g.input('ArrowDown',true);for(let i=0;i<200;i++)g.update(1/60,false);g.input('ArrowDown',false);assert.equal(g.snapshot().hero.y,610);
});

test('manual tools reach the nearest covered cell across a cleared cell boundary',()=>{
 const g=makeGame();move(g,121,356);press(g,'x');assert.equal(g.snapshot().cells[2].cover,0);const before=g.snapshot().cells[3].cover;move(g,139,356);press(g,' ');const s=g.snapshot();assert.equal(s.cells[3].cover,before-1);assert.equal(s.cells[2].cover,0);
});
test('manual brush recovers fragments from an adjacent cell within reach',()=>{
 const g=makeGame();move(g,83,404);press(g,'x');assert.equal(g.snapshot().cells[8].fractured,true);move(g,103,404);press(g,' ');const s=g.snapshot();assert.equal(s.carry[0].source,'site:1:8');assert.equal(s.fragmentRecoveries,1);
});
test('brace reaches the reference excavation height boundary',()=>{
 const g=makeGame();move(g,83,311);press(g,'z');assert.equal(g.snapshot().supplies,3);move(g,83,317);press(g,'z');const s=g.snapshot();assert.equal(s.supplies,2);assert.equal(s.braces[1],1);
});

test('failed manual action does not delay an immediately valid brace',()=>{
 const g=makeGame();move(g,83,311);g.input('z',true);g.update(1/60,false);g.input('z',false);assert.equal(g.snapshot().supplies,3);move(g,83,317);g.input('z',true);g.update(1/60,false);g.input('z',false);assert.equal(g.snapshot().braces[1],1);assert.equal(g.snapshot().supplies,2);
});
test('AI immediately braces a surveyed find after a failed manual brush',()=>{
 const g=makeGame();for(let i=0;i<5000&&!g.snapshot().mounted.includes('tail');i++)g.update(1/60,true);assert.ok(g.snapshot().mounted.includes('tail'));move(g,83,404);if(!g.snapshot().cells[8].surveyed)press(g,' ');move(g,121,404);while(g.snapshot().cells[9].cover>0)press(g,' ');move(g,83,404);assert.equal(g.snapshot().cells[8].surveyed,true);assert.equal(g.snapshot().braces[1],0);g.input(' ',true);g.update(1/60,false);g.input(' ',false);assert.equal(g.snapshot().message,'BRACE THE FIND');g.update(1/60,true);assert.equal(g.snapshot().braces[1],1);
});

test('a full pack leaves a newly exposed fossil recoverable',()=>{
 const g=makeGame();move(g,159,356);press(g,'x');move(g,83,404);press(g,'x');press(g,' ');assert.equal(g.snapshot().carry.length,2);move(g,159,452);assert.equal(g.snapshot().cells[17].fragile,false);press(g,'x');const s=g.snapshot();assert.equal(s.carry.length,2);assert.equal(s.cells[17].recovered,false);assert.equal(s.cells[17].cover,1);
});

test('AI braces early rockfall warnings and dodges once the brace window has passed',()=>{
 const old=Math.random;Math.random=()=>.4;try{for(const late of [false,true]){const g=makeGame();move(g,121,404);for(let i=0;i<120&&!g.snapshot().hazard.warn;i++)g.update(1/60,false);let s=g.snapshot();assert.equal(s.hazard.col,2);assert.ok(s.hazard.warn);if(late){for(let i=0;i<60&&g.snapshot().hazard.t>14/60;i++)g.update(1/60,false)}const before=g.snapshot();assert.equal(before.braces[2],0);g.update(1/60,true);s=g.snapshot();if(late){assert.equal(s.braces[2],0);assert.equal(s.supplies,before.supplies);assert.ok(s.hero.x>before.hero.x,'moves to neighboring safe column')}else{assert.equal(s.braces[2],1);assert.equal(s.hazard.countered,true);assert.equal(s.supplies,before.supplies-1)}}}finally{Math.random=old}
});

test('AI commits to the manually surveyed find before a different fossil',()=>{
 const g=makeGame();move(g,83,404);press(g,' ');let s=g.snapshot();assert.equal(s.activeDig,'site:1:8');assert.equal(s.cells[3].recovered,false);g.update(1/60,true);s=g.snapshot();assert.equal(s.aiTarget.source,'site:1:8');assert.equal(s.aiTarget.brace,true);for(let i=0;i<3000&&!g.snapshot().cells[8].recovered;i++)g.update(1/60,true);s=g.snapshot();assert.equal(s.cells[8].recovered,true);assert.equal(s.cells[9].cover,0);assert.ok(s.carry.some(f=>f.source==='site:1:8')||s.mountedFinds.some(f=>f.source==='site:1:8'));
});
test('AI selects a nearby fossil instead of the first array entry',()=>{
 const g=makeGame();move(g,235,404);assert.equal(g.snapshot().hazard.warn,false);g.update(1/60,true);const s=g.snapshot();assert.equal(s.aiTarget.source,'site:1:12');assert.equal(s.cells[3].recovered,false);
});

test('AI excavates another cell while a surveyed fossil awaits timber restock',()=>{
 const old=Math.random;Math.random=()=>.4;try{const g=makeGame();move(g,83,404);press(g,' ');assert.equal(g.snapshot().activeDig,'site:1:8');move(g,273,356);for(let i=0;i<3;i++)press(g,'z');assert.equal(g.snapshot().supplies,0);move(g,272,280);press(g,' ');assert.equal(g.snapshot().supplies,4);move(g,235,333);for(let i=0;i<3;i++){g.input('z',true);g.update(1/60,false);g.input('z',false);g.update(.16,false)}move(g,197,333);g.input('z',true);g.update(1/60,false);g.input('z',false);g.update(.16,false);let s=g.snapshot();assert.equal(s.supplies,0);assert.ok(s.restockCooldown>0);assert.equal(s.activeDig,'site:1:8');g.update(1/60,true);s=g.snapshot();assert.equal(s.aiTarget.alternate,true);const chosen=s.cells.find(c=>c.source===s.aiTarget.source),cover=chosen.cover;assert.equal(chosen.part,null);assert.notEqual(chosen.x,1);let worked=false;for(let i=0;i<120&&g.snapshot().restockCooldown>0;i++){g.update(1/60,true);if(g.snapshot().cells.find(c=>c.source===chosen.source).cover<cover){worked=true;break}}assert.ok(worked,'AI actually excavates the alternate before restock is ready');for(let i=0;i<3000&&!g.snapshot().cells[8].recovered;i++)g.update(1/60,true);assert.equal(g.snapshot().cells[8].recovered,true,'AI resumes the original fossil')}finally{Math.random=old}
});

test('AI proactively braces a weak selected column before digging its fossil',()=>{
 const old=Math.random;Math.random=()=>.4;try{const g=makeGame();for(const y of [404,500,548]){move(g,159,y);press(g,'x');const s=g.snapshot(),row=Math.floor((y-332)/48);if(s.stability[3]>=43&&s.cells.find(c=>c.x===3&&c.y===row).cover>0)press(g,'x')}move(g,159,356);for(let i=0;i<200&&g.snapshot().hazard.phase!=='calm';i++)g.update(1/60,false);let s=g.snapshot();assert.ok(s.stability[3]<43);assert.equal(s.braces[3],0);assert.equal(s.cells[3].surveyed,false);const before=s.cells[3].cover;g.update(1/60,true);s=g.snapshot();assert.equal(s.aiTarget.source,'site:1:3');assert.equal(s.aiTarget.brace,true);assert.equal(s.braces[3],1);assert.equal(s.cells[3].cover,before);for(let i=0;i<2000&&!g.snapshot().cells[3].recovered;i++)g.update(1/60,true);assert.equal(g.snapshot().cells[3].recovered,true)}finally{Math.random=old}
});

test('AI shifts its stance while working at reduced speed instead of freezing',()=>{
 const g=makeGame();move(g,159,356);const before=g.snapshot();assert.equal(before.cells[3].cover,2);g.update(1/60,true);const s=g.snapshot(),distance=Math.hypot(s.hero.x-before.hero.x,s.hero.y-before.hero.y);assert.equal(s.cells[3].cover,1);assert.ok(distance>0&&distance<=204*.68/60+1e-8);assert.equal(s.activeDig,'site:1:3');
});

test('rockfall targets the excavator just below the reference upper safety line',()=>{
 for(const [y,col,hurt] of [[311,3,false],[320,1,true]]){const g=makeGame();move(g,83,y);for(let i=0;i<120&&!g.snapshot().hazard.warn;i++)g.update(1/60,false);let s=g.snapshot();assert.equal(s.hazard.col,col);const health=s.health;for(let i=0;i<45&&g.snapshot().hazard.phase==='warn';i++)g.update(1/60,false);s=g.snapshot();assert.equal(s.hazard.phase,'fall');assert.equal(s.health,health-(hurt?1:0))}
});
test('hoist follows carried fossils and returns after manual and AI mounting',()=>{
 const g=makeGame();assert.equal(g.snapshot().hoistY,318);move(g,159,356);press(g,'x');let s=g.snapshot();assert.ok(s.carry.length);assert.ok(s.hoistY>318);const rects=[],noop=()=>{},ctx=new Proxy({fillRect(x,y,w,h){rects.push([x,y,w,h])}},{get:(o,k)=>o[k]??noop,set:(o,k,v)=>(o[k]=v,true)});g.draw(ctx);assert.ok(rects.some(([x,y,w,h])=>x===280&&y===s.hoistY-4&&w===24&&h===6));move(g,112,280);press(g,' ');for(let i=0;i<90;i++)g.update(1/60,false);assert.equal(g.snapshot().hoistY,318);
 const ai=makeGame();let max=318;for(let i=0;i<3000&&!ai.snapshot().mounted.length;i++){ai.update(1/60,true);max=Math.max(max,ai.snapshot().hoistY)}assert.ok(ai.snapshot().mounted.length>0);assert.ok(max>318);for(let i=0;i<60&&!ai.snapshot().carry.length;i++)ai.update(1/60,true);assert.ok(ai.snapshot().hoistY<=max);
});

test('higher-priority tool interrupts held repair and the brush must restart it',()=>{
 const g=makeGame();move(g,83,404);press(g,'x');press(g,' ');move(g,64,280);g.input(' ',true);for(let i=0;i<30;i++)g.update(1/60,false);let s=g.snapshot();assert.equal(s.carry[0].status,'repairing');assert.ok(s.repair>.4);g.input('x',true);g.update(1/60,false);s=g.snapshot();assert.equal(s.repair,0);assert.equal(s.repairInterruptions,1);assert.equal(s.carry[0].status,'carried-fragments');g.input('x',false);for(let i=0;i<40;i++)g.update(1/60,false);assert.equal(g.snapshot().carry[0].repaired,false);for(let i=0;i<40&&!g.snapshot().carry[0].repaired;i++)g.update(1/60,false);g.input(' ',false);s=g.snapshot();assert.equal(s.carry[0].repaired,true);assert.equal(s.repairInterruptions,1);
});
test('AI continues a partial manual repair at the bench and mounts the find',()=>{
 const g=makeGame();move(g,83,404);press(g,'x');press(g,' ');move(g,64,280);g.input(' ',true);for(let i=0;i<30;i++)g.update(1/60,false);assert.equal(g.snapshot().carry[0].status,'repairing');g.input(' ',false);for(let i=0;i<2000&&!g.snapshot().mounted.includes('hips');i++)g.update(1/60,true);const s=g.snapshot();assert.equal(s.repairInterruptions,0);const bone=s.mountedFinds.find(f=>f.part==='hips');assert.ok(bone?.repaired);assert.equal(bone.status,'mounted');
});

test('rockfall telegraphs the threatened wall and falls across the pit at reference speed',()=>{
 for(const auto of [false,true]){const g=makeGame(),rocks=[],strokes=[],noop=()=>{};let first=null;const ctx=new Proxy({beginPath(){first=null},moveTo(x,y){first=[x,y]},fill(){if(ctx.fillStyle==='#51362e'||ctx.fillStyle==='#665365')rocks.push(first)},stroke(){strokes.push(ctx.strokeStyle)}},{get:(o,k)=>o[k]??noop,set:(o,k,v)=>(o[k]=v,true)});for(let i=0;i<500&&!g.snapshot().hazard.warn;i++)g.update(1/60,auto);assert.equal(g.snapshot().hazard.phase,'warn');g.draw(ctx);assert.ok(strokes.some(c=>c==='#f47772'||c==='#eec777'));for(let i=0;i<50&&g.snapshot().hazard.phase==='warn';i++)g.update(1/60,auto);assert.equal(g.snapshot().hazard.phase,'fall');rocks.length=0;g.draw(ctx);assert.equal(rocks.length,4);const start=rocks[0][1];for(let i=0;i<10;i++)g.update(1/60,auto);rocks.length=0;g.draw(ctx);assert.equal(rocks.length,4);assert.ok(Math.abs(rocks[0][1]-start-108)<1e-7)}
});

test('museum renders a ghost skeleton and lights physically mounted bones',()=>{
 const g=makeGame(),paths=[],noop=()=>{};let start;const ctx=new Proxy({beginPath(){start=null},moveTo(x,y){start=[x,y]},stroke(){paths.push({start,color:ctx.strokeStyle})}},{get:(o,k)=>o[k]??noop,set:(o,k,v)=>(o[k]=v,true)});g.draw(ctx);assert.equal(paths.find(p=>p.start?.[0]===78&&p.start?.[1]===182).color,'#85788a');move(g,159,356);press(g,'x');move(g,112,280);press(g,' ');assert.deepEqual(g.snapshot().mounted,['tail']);paths.length=0;g.draw(ctx);assert.equal(paths.find(p=>p.start?.[0]===78&&p.start?.[1]===182).color,'#f8e7bd');assert.equal(paths.find(p=>p.start?.[0]===158&&p.start?.[1]===148).color,'#85788a');
});
test('AI completion leaves a lit assembled skeleton on the next site',()=>{
 const g=makeGame();for(let i=0;i<12000&&g.snapshot().site===1;i++)g.update(1/60,true);const s=g.snapshot();assert.equal(s.site,2);assert.equal(s.displayedExhibit.parts.length,9);const strokes=[],noop=()=>{},ctx=new Proxy({stroke(){strokes.push(ctx.strokeStyle)}},{get:(o,k)=>o[k]??noop,set:(o,k,v)=>(o[k]=v,true)});g.draw(ctx);assert.ok(strokes.filter(c=>c==='#f8e7bd').length>=8,'completed bones remain lit');
});

test('manual fragile fossil changes from visible outline to fragments and disappears on recovery',()=>{
 const g=makeGame(),paths=[],noop=()=>{};let start;const ctx=new Proxy({beginPath(){start=null},moveTo(x,y){if(!start)start=[x,y]},fill(){paths.push({start,color:ctx.fillStyle})}},{get:(o,k)=>o[k]??noop,set:(o,k,v)=>(o[k]=v,true)});g.draw(ctx);assert.ok(paths.some(p=>p.color==='#f8e7bd'&&p.start?.[0]===73&&p.start?.[1]===400),'hips outline visible beneath two layers');move(g,83,404);press(g,'x');assert.equal(g.snapshot().cells[8].fractured,true);paths.length=0;g.draw(ctx);assert.ok(paths.some(p=>p.color==='#fff8df'&&p.start?.[0]===61&&p.start?.[1]===398),'fractured pieces visible');press(g,' ');assert.equal(g.snapshot().cells[8].recovered,true);paths.length=0;g.draw(ctx);assert.ok(!paths.some(p=>p.color==='#fff8df'&&p.start?.[0]===61&&p.start?.[1]===398));
});
test('AI chip marks appear on partially cleared strata',()=>{
 const g=makeGame();let cell;for(let i=0;i<6000&&!cell;i++){g.update(1/60,true);cell=g.snapshot().cells.find(c=>!c.part&&c.chipMarks>0&&c.cover>0)}assert.ok(cell);const strokes=[],noop=()=>{};let start;const ctx=new Proxy({beginPath(){start=null},moveTo(x,y){if(!start)start=[x,y]},stroke(){strokes.push({start,color:ctx.strokeStyle})}},{get:(o,k)=>o[k]??noop,set:(o,k,v)=>(o[k]=v,true)});g.draw(ctx);const cx=26+cell.x*38+19,cy=332+cell.y*48+24;assert.ok(strokes.some(p=>p.start?.[0]===cx-10&&p.start?.[1]===cy-8&&p.color==='#553b34'));
});

test('manual and AI braces draw count-dependent structural supports',()=>{
 const makeCanvas=()=>{const beams=[],noop=()=>{},ctx=new Proxy({fillRect(x,y,w,h){if(ctx.fillStyle==='#b67b4d'&&w===32&&h===6)beams.push([x,y])}},{get:(o,k)=>o[k]??noop,set:(o,k,v)=>(o[k]=v,true)});return {ctx,beams}};const g=makeGame();move(g,83,404);press(g,'z');let c=makeCanvas();g.draw(c.ctx);assert.equal(c.beams.length,3);press(g,'z');c=makeCanvas();g.draw(c.ctx);assert.equal(g.snapshot().braces[1],2);assert.equal(c.beams.length,5);
 const ai=makeGame();for(let i=0;i<5000&&!ai.snapshot().braces.some(Boolean);i++)ai.update(1/60,true);const s=ai.snapshot();assert.ok(s.braces.some(Boolean));c=makeCanvas();ai.draw(c.ctx);assert.equal(c.beams.length,s.braces.reduce((sum,n)=>sum+(n?Math.min(6,n*2+1):0),0));
});
test('the environment changes from mesa to marsh after AI completes the exhibit',()=>{
 const g=makeGame(),fills=[],noop=()=>{},ctx=new Proxy({fill(){fills.push(ctx.fillStyle)}},{get:(o,k)=>o[k]??noop,set:(o,k,v)=>(o[k]=v,true)});g.draw(ctx);assert.ok(fills.includes('#765247'));for(let i=0;i<12000&&g.snapshot().site===1;i++)g.update(1/60,true);assert.equal(g.snapshot().site,2);fills.length=0;g.draw(ctx);assert.ok(fills.includes('#90bd78'));
});

test('manual excavator shows a timed pick pose and walking direction',()=>{
 const g=makeGame();move(g,121,356);assert.equal(g.snapshot().actor.face,-1);assert.ok(g.snapshot().actor.gait>0);g.input('x',true);g.update(1/60,false);g.input('x',false);assert.equal(g.snapshot().actor.pose,'chip');const strokes=[],noop=()=>{},ctx=new Proxy({stroke(){strokes.push(ctx.strokeStyle)}},{get:(o,k)=>o[k]??noop,set:(o,k,v)=>(o[k]=v,true)});g.draw(ctx);assert.ok(strokes.includes('#b7a8bd'),'pick head is rendered during chip pose');for(let i=0;i<20;i++)g.update(1/60,false);assert.notEqual(g.snapshot().actor.pose,'chip');
});
test('AI excavation renders its active tool while continuing to move',()=>{
 const g=makeGame();let s;for(let i=0;i<1000;i++){g.update(1/60,true);s=g.snapshot();if(s.actor.pose==='brush'||s.actor.pose==='chip')break}assert.ok(['brush','chip'].includes(s.actor.pose));assert.ok(s.actor.gait>0);const strokes=[],noop=()=>{},ctx=new Proxy({stroke(){strokes.push(ctx.strokeStyle)}},{get:(o,k)=>o[k]??noop,set:(o,k,v)=>(o[k]=v,true)});g.draw(ctx);assert.ok(strokes.includes(s.actor.pose==='chip'?'#b7a8bd':'#fff8df'));
});

test('manual and AI repair show bench progress and finish with the reference action cooldown',()=>{
 const makeCanvas=()=>{const shapes=[],noop=()=>{},ctx=new Proxy({fillRect(x,y,w,h){shapes.push({x,y,w,h,color:ctx.fillStyle})}},{get:(o,k)=>o[k]??noop,set:(o,k,v)=>(o[k]=v,true)});return {ctx,shapes}};
 for(const auto of [false,true]){const g=makeGame();move(g,83,404);press(g,'x');press(g,' ');if(!auto){move(g,64,280);g.input(' ',true)}for(let i=0;i<3000&&g.snapshot().repair===0;i++)g.update(1/60,auto);let s=g.snapshot();assert.ok(s.repair>0);let c=makeCanvas();g.draw(c.ctx);assert.ok(c.shapes.some(q=>q.color==='#78d9b1'&&q.h===4&&q.w>0&&q.w<40));assert.equal(c.shapes.filter(q=>q.color==='#b67b4d'&&q.w===6&&q.h===24).length,s.supplies);for(let i=0;i<300&&!g.snapshot().carry[0]?.repaired;i++)g.update(1/60,auto);s=g.snapshot();assert.equal(s.carry[0].repaired,true);assert.ok(Math.abs(s.cool-9/60)<1e-9);if(!auto)g.input(' ',false)}
});

test('rockfall chooses the scheduled reference frame at both manual and preview update rates',()=>{
 const outcomes=[];for(const dt of [1/60,.05]){const g=makeGame();move(g,121,404);for(let i=0;i<200&&!g.snapshot().hazard.warn;i++)g.update(dt,false);const s=g.snapshot();assert.equal(s.hazard.phase,'warn');outcomes.push(s.hazard.col);assert.equal(s.hazard.col,2,'frame 92 targets the excavator column');g.update(1/60,true);assert.equal(g.snapshot().hazard.countered,true,'AI braces the selected column')}assert.deepEqual(outcomes,[2,2]);
});

test('held manual tool acts at the position reached during the current frame',()=>{
 const g=makeGame();move(g,121,321);const before=g.snapshot().cells[2].cover;g.input(' ',true);assert.equal(g.snapshot().cells[2].cover,before);g.input('ArrowDown',true);g.update(1/60,false);g.input('ArrowDown',false);g.input(' ',false);assert.equal(g.snapshot().cells[2].cover,before-1);
});
test('AI begins repair only after it has decided to work inside bench reach',()=>{
 const g=makeGame();move(g,83,404);press(g,'x');press(g,' ');move(g,64,299);let s=g.snapshot();assert.ok(Math.hypot(s.hero.x-64,s.hero.y-280)>18);g.update(1/60,true);s=g.snapshot();assert.ok(Math.hypot(s.hero.x-64,s.hero.y-280)<18);assert.equal(s.repair,0);g.update(1/60,true);assert.ok(g.snapshot().repair>0);
});

test('initial keydown waits for a simulation tick and respects held tool priority',()=>{
 const g=makeGame();move(g,121,356);const before=g.snapshot();for(const k of [' ','x','z'])g.input(k,true);let s=g.snapshot();assert.equal(s.supplies,before.supplies);assert.equal(s.cells[2].cover,before.cells[2].cover);g.update(1/60,false);s=g.snapshot();assert.equal(s.supplies,before.supplies-1);assert.equal(s.braces[2],1);assert.equal(s.cells[2].cover,before.cells[2].cover);g.input('z',false);for(let i=0;i<12&&g.snapshot().cells[2].cover>0;i++)g.update(1/60,false);s=g.snapshot();assert.equal(s.cells[2].cover,0);assert.equal(s.cells[2].chipMarks,1);g.input('x',false);g.input(' ',false);
});
test('a released tool key does not act on a later frame',()=>{
 const g=makeGame();move(g,121,356);const before=g.snapshot().cells[2].cover;g.input('x',true);g.input('x',false);g.update(1/60,false);assert.equal(g.snapshot().cells[2].cover,before);
});

test('manual held tools have the same cadence for coarse and 60Hz updates',()=>{
 const a=makeGame(),b=makeGame();for(const g of [a,b]){move(g,121,356);g.input(' ',true)}for(let i=0;i<18;i++)a.update(1/60,false);b.update(.3,false);for(const g of [a,b])g.input(' ',false);const x=a.snapshot(),y=b.snapshot();assert.equal(x.cells[2].cover,y.cells[2].cover);assert.equal(x.cells[2].cover,0);assert.ok(Math.abs(x.cool-y.cool)<1e-8);assert.ok(Math.abs(x.clock-y.clock)<1e-8);
});
test('AI decisions and hazard timing agree at preview and 60Hz update rates',()=>{
 const a=makeGame(),b=makeGame();for(let i=0;i<120;i++)a.update(1/60,true);for(let i=0;i<60;i++)b.update(1/30,true);const x=a.snapshot(),y=b.snapshot();assert.ok(Math.abs(x.hero.x-y.hero.x)<1e-8);assert.ok(Math.abs(x.hero.y-y.hero.y)<1e-8);assert.deepEqual(x.cells.map(c=>[c.cover,c.surveyed,c.recovered]),y.cells.map(c=>[c.cover,c.surveyed,c.recovered]));assert.deepEqual(x.braces,y.braces);assert.equal(x.hazard.phase,y.hazard.phase);assert.equal(x.hazard.col,y.hazard.col);assert.ok(Math.abs(x.hazard.t-y.hazard.t)<1e-8);
});

test('manual final mounting preserves an active warning into the next site',()=>{
 const old=Math.random;Math.random=()=>.5;try{const g=makeGame();for(let i=0;i<20000;i++){g.update(1/60,true);const s=g.snapshot();if(s.mounted.length===8&&s.carry.length&&!s.carry[0].fractured)break}let s=g.snapshot();assert.equal(s.mounted.length,8);const find=s.carry[0],x=['tail','hips','hindleg'].includes(find.part)?112:['spine','rib-low','rib-high'].includes(find.part)?162:212;move(g,x,280);for(let i=0;i<600&&!g.snapshot().hazard.warn;i++)g.update(1/60,false);const before=g.snapshot();assert.equal(before.hazard.phase,'warn');g.input(' ',true);g.update(1/60,false);g.input(' ',false);s=g.snapshot();assert.equal(s.site,2);assert.equal(s.hazard.phase,'warn');assert.equal(s.hazard.serial,before.hazard.serial);assert.equal(s.hazard.col,before.hazard.col);const col=s.hazard.col,stability=s.stability[col];for(let i=0;i<60&&g.snapshot().hazard.phase==='warn';i++)g.update(1/60,false);s=g.snapshot();assert.equal(s.hazard.phase,'fall');if(!before.hazard.countered)assert.equal(s.stability[col],Math.max(18,stability-25))}finally{Math.random=old}
});
test('AI completion preserves both warning and fall phases across sites',()=>{
 const old=Math.random;try{for(const [seed,phase] of [[10,'warn'],[33,'fall']]){let n=seed;Math.random=()=>((n=(Math.imul(n,1664525)+1013904223)>>>0)/4294967296);const g=fossil();let before,after;for(let i=0;i<5000;i++){before=g.snapshot();g.update(1/60,true);after=g.snapshot();if(after.site>1)break}assert.equal(after.site,2);assert.equal(before.hazard.phase,phase);assert.equal(after.hazard.phase,phase);assert.equal(after.hazard.serial,before.hazard.serial);assert.equal(after.hazard.col,before.hazard.col);assert.ok(after.hazard.t<before.hazard.t)}}finally{Math.random=old}
});

test('120Hz manual input advances only on fixed 60Hz ticks',()=>{
 const a=makeGame(),b=makeGame();for(const g of [a,b]){g.input('ArrowDown',true);g.input(' ',true)}const initial=a.snapshot();a.update(1/120,false);assert.deepEqual(a.snapshot().hero,initial.hero);assert.equal(a.snapshot().clock,0);for(let i=1;i<120;i++)a.update(1/120,false);for(let i=0;i<60;i++)b.update(1/60,false);const x=a.snapshot(),y=b.snapshot();assert.deepEqual(x.hero,y.hero);assert.deepEqual(x.cells.map(c=>[c.cover,c.surveyed,c.recovered]),y.cells.map(c=>[c.cover,c.surveyed,c.recovered]));assert.equal(x.clock,y.clock);assert.equal(x.manualScore,y.manualScore);for(const g of [a,b]){g.input('ArrowDown',false);g.input(' ',false)}
});
test('120Hz AI and 60Hz AI agree and reset clears a partial frame',()=>{
 const a=makeGame(),b=makeGame();for(let i=0;i<240;i++)a.update(1/120,true);for(let i=0;i<120;i++)b.update(1/60,true);const x=a.snapshot(),y=b.snapshot();assert.deepEqual(x.hero,y.hero);assert.deepEqual(x.cells.map(c=>[c.cover,c.surveyed,c.recovered]),y.cells.map(c=>[c.cover,c.surveyed,c.recovered]));assert.equal(x.hazard.phase,y.hazard.phase);assert.equal(x.hazard.col,y.hazard.col);const g=makeGame();g.update(1/120,true);g.reset();g.update(1/120,true);assert.equal(g.snapshot().clock,0);
});

test('a manual brace immediately marks the surveyed find supported',()=>{
 const g=makeGame();move(g,83,404);press(g,' ');let s=g.snapshot();assert.equal(s.activeDig,'site:1:8');assert.equal(s.cells[8].supported,false);assert.ok(s.cells[9].cover>0);const labels=[],noop=()=>{},ctx=new Proxy({fillText(t){labels.push(t)}},{get:(o,k)=>o[k]??noop,set:(o,k,v)=>(o[k]=v,true)});g.draw(ctx);assert.ok(labels.includes('!'));press(g,'z');s=g.snapshot();assert.equal(s.braces[1],1);assert.equal(s.cells[8].supported,true);assert.ok(s.cells[9].cover>0,'edge remains uncleared');labels.length=0;g.draw(ctx);assert.ok(!labels.includes('!'));
});
test('AI records support on a surveyed fragile find before clearing its edge',()=>{
 const g=makeGame();move(g,83,404);press(g,' ');assert.equal(g.snapshot().cells[8].supported,false);for(let i=0;i<1000&&!g.snapshot().braces[1];i++)g.update(1/60,true);const s=g.snapshot();assert.equal(s.braces[1],1);assert.equal(s.cells[8].supported,true);assert.ok(s.cells[9].cover>0);
});

test('AI recovers and mounts a repaired bone returned by rockfall',()=>{
 const old=Math.random;Math.random=()=>.4;try{const g=makeGame();move(g,83,404);press(g,'x');press(g,' ');const source=g.snapshot().carry[0].source;move(g,64,280);g.input(' ',true);g.update(1.3,false);g.input(' ',false);assert.equal(g.snapshot().carry[0].repaired,true);move(g,83,404);for(let i=0;i<1500&&g.snapshot().carry.length;i++)g.update(1/60,false);assert.equal(g.snapshot().cells[8].returnedFind.status,'exposed-repaired');for(let i=0;i<4000&&!g.snapshot().mountedFinds.some(f=>f.source===source);i++)g.update(1/60,true);const s=g.snapshot(),bone=s.mountedFinds.find(f=>f.source===source);assert.ok(bone);assert.equal(bone.repaired,true);assert.equal(s.fragmentRecoveries,1)}finally{Math.random=old}
});

test('fragile fossils display the reference warning mark before manual excavation',()=>{
 const g=makeGame(),marks=[],noop=()=>{},ctx=new Proxy({fillRect(x,y,w,h){if(ctx.fillStyle==='#69c5b0'&&w===4&&h===4)marks.push([x,y])}},{get:(o,k)=>o[k]??noop,set:(o,k,v)=>(o[k]=v,true)});let s=g.snapshot();assert.equal(s.cells[8].fragile,true);assert.equal(s.cells[3].fragile,false);g.draw(ctx);assert.ok(marks.some(([x,y])=>x===93&&y===392));assert.ok(!marks.some(([x,y])=>x===169&&y===344));move(g,83,404);press(g,' ');marks.length=0;g.draw(ctx);assert.ok(marks.some(([x,y])=>x===93&&y===392));press(g,'x');assert.equal(g.snapshot().cells[8].fractured,true);marks.length=0;g.draw(ctx);assert.ok(!marks.some(([x,y])=>x===93&&y===392));
});
test('AI-surveyed fragile finds retain the visible fragility mark',()=>{
 const g=makeGame();let s,cell;for(let i=0;i<5000&&!cell;i++){g.update(1/60,true);s=g.snapshot();cell=s.cells.find(c=>c.fragile&&c.surveyed&&!c.recovered&&!c.fractured&&c.cover>0)}assert.ok(cell);const marks=[],noop=()=>{},ctx=new Proxy({fillRect(x,y,w,h){if(ctx.fillStyle==='#69c5b0'&&w===4&&h===4)marks.push([x,y])}},{get:(o,k)=>o[k]??noop,set:(o,k,v)=>(o[k]=v,true)});g.draw(ctx);assert.ok(marks.some(([x,y])=>x===26+cell.x*38+29&&y===332+cell.y*48+12));
});

test('site title and manual score are aligned within the canvas',()=>{
 const g=makeGame(),labels=[],noop=()=>{},ctx=new Proxy({fillText(value,x,y){labels.push({value,x,y,align:ctx.textAlign})}},{get:(o,k)=>o[k]??noop,set:(o,k,v)=>(o[k]=v,true)});move(g,121,404);press(g,'x');assert.equal(g.snapshot().manualScore,5);g.draw(ctx);assert.ok(labels.some(t=>t.value==='RED MESA · RIDGEBACK'&&t.x===160&&t.align==='center'));assert.ok(labels.some(t=>t.value==='SCORE 5'&&t.x===290&&t.align==='right'));
});
test('AI site transition updates the centered title without a manual score',()=>{
 const old=Math.random;Math.random=()=>.5;try{const g=makeGame();for(let i=0;i<12000&&g.snapshot().site===1;i++)g.update(1/60,true);assert.equal(g.snapshot().site,2);assert.equal(g.snapshot().manualScore,0);const labels=[],noop=()=>{},ctx=new Proxy({fillText(value,x,y){labels.push({value,x,align:ctx.textAlign})}},{get:(o,k)=>o[k]??noop,set:(o,k,v)=>(o[k]=v,true)});g.draw(ctx);assert.ok(labels.some(t=>t.value==='AMBER MARSH · LONG NECK'&&t.x===160&&t.align==='center'));assert.ok(labels.some(t=>t.value==='SCORE 0'&&t.x===290&&t.align==='right'))}finally{Math.random=old}
});

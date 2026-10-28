import test from 'node:test';
import assert from 'node:assert/strict';
import {createFeatureGame12,rallyBlocked,rallyFeature,resolveRallyRegister,forecastRallyPrograms,robots,rallyApplyLapse,rallyPersonas,rallyDrawPosition,rallyForecastTrace,rallyCrusherActive,rallyTurretActive,rallyHash,rallyOilTurn,rallyBaselineProgram,rallyProgramTrace,rallyProfileRoll} from '../src/feature-games12.js';
const bot=(x,y,dir,hp=3)=>({x,y,dir,hp,color:'#fff',score:0});
test('register lasers use the opening snapshot while every robot completes its move',()=>{const r=resolveRallyRegister([bot(1,9,0),bot(1,7,1)],['FIRE','CHARGE'],0,1);assert.deepEqual([r.bots[1].x,r.bots[1].y,r.bots[1].hp],[3,7,2]);assert.equal(r.lasers.length,1)});
test('simultaneous shots and contested moves damage both robots',()=>{let r=resolveRallyRegister([bot(2,9,1,1),bot(4,9,3,1)],['FIRE','FIRE'],0,1);assert.deepEqual(r.bots.map(b=>b.hp),[0,0]);r=resolveRallyRegister([bot(2,10,1),bot(4,10,3)],['MOVE','MOVE'],0,1);assert.deepEqual(r.bots.map(b=>[b.x,b.y,b.hp]),[[2,10,2],[4,10,2]])});
test('foundry machinery follows movement and course boundaries',()=>{assert.ok(rallyBlocked(0,0,0));assert.ok(rallyBlocked(3,6,0));assert.equal(rallyFeature(1,8,0).kind,'belt');let r=resolveRallyRegister([bot(1,9,0)],['MOVE'],0,1);assert.deepEqual([r.bots[0].x,r.bots[0].y],[2,8]);r=resolveRallyRegister([bot(1,3,1)],['MOVE'],0,1);assert.deepEqual([r.bots[0].x,r.bots[0].y],[2,3])});
function harness(interactive){const oldRandom=Math.random;let seed=1,scheduled,seq=0,frame=0,labels=[],brass=null;const listeners=new Map(),noop=()=>{};Math.random=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296);globalThis.window={devicePixelRatio:1};globalThis.ResizeObserver=class{observe(){}disconnect(){}};globalThis.requestAnimationFrame=f=>(scheduled=f,++seq);globalThis.cancelAnimationFrame=()=>{scheduled=null};const ctx=new Proxy({fillText(s){labels.push(s)},fillRect(x,y,w,h){if(this.fillStyle==='#e6bd71'&&w===18&&h===18)brass={x,y}}},{get:(o,k)=>o[k]??noop,set:(o,k,v)=>(o[k]=v,true)}),canvas={getContext:()=>ctx,getBoundingClientRect:()=>({width:240,height:540}),setAttribute:noop,addEventListener(k,v){listeners.set(k,v)},removeEventListener(k){listeners.delete(k)}},game=createFeatureGame12(canvas,'robot-register',{interactive});return{game,step(){labels=[];brass=null;scheduled(++frame*1000/60);return{labels,brass}},key(k,d){listeners.get(d?'keydown':'keyup')({key:k,preventDefault:noop})},close(){game.destroy();Math.random=oldRandom}}}
test('manual held command is used by one register, then released command brakes',()=>{const h=harness(true);try{let s=h.step(),start=s.brass;h.key('ArrowUp',true);for(let i=0;i<200;i++){s=h.step();if(s.labels.some(x=>x.startsWith('EXECUTE 2/5')))break}assert.ok(s.brass.y<start.y,'march did not move robot');h.key('ArrowUp',false);for(let i=0;i<30;i++)s=h.step();const after=s.brass;for(let i=0;i<100;i++){s=h.step();if(s.labels.some(x=>x.startsWith('EXECUTE 3/5')))break}for(let i=0;i<30;i++)s=h.step();assert.deepEqual(s.brass,after,'released input should brake after the committed motion finishes');}finally{h.close()}});
test('preview executes five-register programs and unlocks authored courses',()=>{const h=harness(false);try{let stages=new Set(),executed=new Set();for(let i=0;i<12000;i++){const s=h.step();for(const n of ['EMBER FOUNDRY','ACID REFINERY','ORBIT SKYDOCK'])if(s.labels.includes(n))stages.add(n);const phase=s.labels.find(x=>/^EXECUTE \d\/5/.test(x));if(phase)executed.add(phase.match(/\d/)[0]);if(stages.size===3)break}assert.deepEqual([...executed].sort(),['1','2','3','4','5']);assert.deepEqual([...stages],['EMBER FOUNDRY','ACID REFINERY','ORBIT SKYDOCK']);}finally{h.close()}});
test('register movement and machinery are separate, and conveyors do not push into occupied cells',()=>{let r=resolveRallyRegister([bot(1,9,0)],['MOVE'],0,1,'movement');assert.deepEqual([r.bots[0].x,r.bots[0].y],[1,8]);r=resolveRallyRegister(r.bots,[],0,1,'board');assert.deepEqual([r.bots[0].x,r.bots[0].y],[2,8]);r=resolveRallyRegister([bot(1,8,0),bot(2,8,0)],[],0,1,'board');assert.deepEqual(r.bots.map(b=>[b.x,b.y]),[[1,8],[3,8]])});
test('reveal, register and settle use reference phase durations',()=>{const h=harness(true);try{let s;for(let i=0;i<170;i++)s=h.step();assert.ok(s.labels.some(x=>x.startsWith('REVEAL')));for(let i=0;i<20;i++)s=h.step();assert.ok(s.labels.some(x=>x.startsWith('EXECUTE 1/5')));for(let i=0;i<50;i++)s=h.step();assert.ok(s.labels.some(x=>x.startsWith('EXECUTE 2/5')));for(let i=0;i<190;i++)s=h.step();assert.ok(s.labels.some(x=>x.startsWith('SETTLE')));for(let i=0;i<40;i++)s=h.step();assert.ok(s.labels.some(x=>x.startsWith('REVEAL')))}finally{h.close()}});


test('forecast avoids a predicted head-on conflict without mutating the race',()=>{
 const bots=[bot(2,10,1),bot(4,10,3)],plans=[['MOVE','BRAKE','BRAKE','BRAKE','BRAKE'],['MOVE','BRAKE','BRAKE','BRAKE','BRAKE']],before=structuredClone({bots,plans});
 const expected=resolveRallyRegister(bots,['MOVE','MOVE'],0,0);assert.equal(expected.bots[0].hp,2);
 const choices=forecastRallyPrograms(bots,0,0,plans),result=resolveRallyRegister(bots,[choices[0][0],plans[1][0]],0,0);
 assert.equal(result.bots[0].hp,3);assert.deepEqual({bots,plans},before);assert.equal(choices[0].length,5);
});
test('forecast chooses a safer register than stepping onto a pit',()=>{
 const bots=[bot(1,7,0)],baseline=[['MOVE','MOVE','MOVE','MOVE','MOVE']];
 assert.equal(resolveRallyRegister(bots,['MOVE'],2,0).bots[0].hp,0);
 const plan=forecastRallyPrograms(bots,2,0,baseline)[0];assert.ok(resolveRallyRegister(bots,[plan[0]],2,0).bots[0].hp>0);
});


test('live acts reverse conveyors and overclock crusher timing',()=>{
 const belt=[bot(1,8,0)],normal=resolveRallyRegister(belt,[],0,0,'board'),flip=resolveRallyRegister(belt,[],0,0,'board',{phase:'live',type:'polarity-flip'});
 assert.equal(normal.bots[0].x,2);assert.equal(flip.bots[0].x,0);
 const onCrusher=[bot(2,5,0)],ordinary=resolveRallyRegister(onCrusher,[],0,0,'board'),rush=resolveRallyRegister(onCrusher,[],0,0,'board',{phase:'live',type:'crusher-rush'});
 assert.equal(ordinary.bots[0].hp,3);assert.equal(rush.bots[0].hp,0);
});
test('manual campaign warns, activates and alternates the acts',()=>{
 const game=robots(),until=(pred,max)=>{for(let i=0;i<max*60;i++){game.update(1/60,false);if(pred(game.snapshot()))return true}return false};
 assert.ok(until(s=>s.act.phase==='warn',45));let s=game.snapshot();assert.equal(s.act.type,'crusher-rush');const start=s.clock;
 assert.ok(until(q=>q.act.phase==='live',5));s=game.snapshot();assert.ok(s.clock-start>=4);assert.ok(until(q=>q.act.phase==='calm',13));
 assert.ok(until(q=>q.act.phase==='warn',65));assert.equal(game.snapshot().act.type,'polarity-flip');
});
test('AI forecasts the active crusher overclock',()=>{
 const bots=[bot(2,7,0)],baseline=[['CHARGE','BRAKE','BRAKE','BRAKE','BRAKE']],act={phase:'live',type:'crusher-rush',index:0,endAt:99};
 assert.equal(resolveRallyRegister(bots,['CHARGE'],0,0,'all',act).bots[0].hp,0);
 const p=forecastRallyPrograms(bots,0,0,baseline,act,0)[0];assert.ok(resolveRallyRegister(bots,[p[0]],0,0,'all',act).bots[0].hp>0);
});


test('a lapse replaces only the fifth card and respects the chance threshold',()=>{
 const p=['MOVE','CHARGE','LEFT','RIGHT','BRAKE'],before=p.slice(),changed=rallyApplyLapse(p,1,2,3,.104);
 assert.deepEqual(changed.slice(0,4),p.slice(0,4));assert.ok(['LEFT','RIGHT','CHARGE','FIRE'].includes(changed[4]));assert.deepEqual(p,before);assert.deepEqual(rallyApplyLapse(p,1,2,3,.105),p);
 assert.deepEqual(rallyPersonas.map(p=>p.showboat),[.28,.62,.18,.82]);
});
test('seeded reveal exposes occasional independent fifth-card lapses',()=>{
 const old=Math.random;let seed=17;Math.random=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/2**32);try{const game=robots();let seen=0;for(let i=0;i<6000;i++){game.update(1/60,true);const s=game.snapshot();if(s.phase==='REVEAL'&&s.lapsed.some(Boolean)){for(let j=0;j<4;j++)if(s.lapsed[j]){assert.deepEqual(s.programs[j].slice(0,4),s.plannedPrograms[j].slice(0,4));seen=s.lapseCount}if(seen>=2)break}}assert.ok(seen>=2,'expected repeated seeded misreads')}finally{Math.random=old}
});

test('flagged robots leave the board before returning at the start',()=>{
 const old=Math.random;let seed=1;Math.random=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/2**32);try{const game=robots();let state,idx=-1;for(let i=0;i<12000;i++){game.update(1/60,true);state=game.snapshot();idx=state.bots.findIndex(b=>b.outReason==='FLAG');if(idx>=0)break}assert.ok(idx>=0,'expected a tagged gate');assert.equal(state.bots[idx].y,0);assert.ok(state.bots[idx].outT>0);for(let i=0;i<20;i++)game.update(1/60,true);state=game.snapshot();assert.ok(state.bots[idx].outT>0);assert.equal(state.bots[idx].y,0);for(let i=0;i<20;i++)game.update(1/60,true);state=game.snapshot();assert.equal(state.bots[idx].outT,0);assert.equal(state.bots[idx].y,11)}finally{Math.random=old}
});
test('course presentation holds six frames and slows 24 before the 96-frame transition',()=>{
 const old=Math.random;let seed=1;Math.random=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/2**32);try{const game=robots();let s;for(let i=0;i<12000;i++){game.update(1/60,true);s=game.snapshot();if(s.phase==='TRANSITION')break}assert.equal(s.phase,'TRANSITION');assert.equal(s.stage,1);assert.equal(s.flags,0);assert.equal(s.cue.id,'course');const round=s.round;
 for(let i=0;i<6;i++)game.update(1/60,true);assert.equal(game.snapshot().registerTime,0);
 for(let i=0;i<24;i++)game.update(1/60,true);assert.ok(Math.abs(game.snapshot().registerTime-8/60)<1e-9);
 for(let i=0;i<87;i++)game.update(1/60,true);assert.equal(game.snapshot().phase,'TRANSITION');assert.equal(game.snapshot().round,round);
 for(let i=0;i<3;i++)game.update(1/60,true);assert.equal(game.snapshot().phase,'REVEAL');assert.equal(game.snapshot().round,round+1);
 }finally{Math.random=old}
});

test('manual register commits immediately but its sprite eases over 24 frames',()=>{
 const game=robots();game.input('ArrowUp',true);game.update(3,false);game.update(1/60,false);let s=game.snapshot(),b=s.bots[0];assert.equal(s.phase,'EXECUTE');assert.equal(b.y,10);assert.equal(b.fromY,11);assert.ok(rallyDrawPosition(b,s.phase,s.registerTime).y<11);
 game.update(11/60,false);s=game.snapshot();b=s.bots[0];assert.ok(Math.abs(rallyDrawPosition(b,s.phase,s.registerTime).y-10.5)<1e-9);assert.equal(b.y,10);
 game.update(.2,false);s=game.snapshot();assert.equal(rallyDrawPosition(s.bots[0],s.phase,s.registerTime).y,s.bots[0].y);
});


test('board projection excludes inactive robots from collisions and returns them to their assigned start',()=>{
 const bots=[bot(2,10,1),{...bot(3,10,3),outT:5,outReason:'WIPEOUT'}],programs=[['MOVE','BRAKE','BRAKE','BRAKE','BRAKE'],Array(5).fill('BRAKE')],before=structuredClone({bots,programs});
 const trace=rallyForecastTrace(bots,programs,0,0);assert.deepEqual(trace[0].activeAtStart,[true,false]);assert.equal(trace[0].bots[0].x,3);assert.equal(trace[0].bots[0].hp,3);assert.equal(trace[1].activeAtStart[1],false);assert.equal(trace[2].bots[1].outT,0);assert.deepEqual([trace[2].bots[1].x,trace[2].bots[1].y],[2,11]);assert.equal(trace[3].activeAtStart[1],true);assert.deepEqual({bots,programs},before);
});
test('board projection suppresses a flagged robot until its 38-frame return',()=>{
 const bots=[bot(3,1,0)],trace=rallyForecastTrace(bots,[Array(5).fill('MOVE')],0,0);
 assert.equal(trace[0].flagged[0],true);assert.equal(trace[0].bots[0].outReason,'FLAG');assert.equal(trace[1].activeAtStart[0],false);assert.equal(trace[1].bots[0].y,11);assert.equal(trace[2].activeAtStart[0],true);assert.equal(trace[2].bots[0].y,10);
});
test('forecast evaluation does not consume the live random stream',()=>{
 const old=Math.random;Math.random=()=>{throw Error('forecast consumed live randomness')};try{const bots=[bot(2,9,0)],baseline=[Array(5).fill('MOVE')];assert.equal(forecastRallyPrograms(bots,0,0,baseline)[0].length,5)}finally{Math.random=old}
});

test('a normal flag cue does not stop the robot respawn clock',()=>{
 const old=Math.random;let seed=1;Math.random=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/2**32);try{const game=robots();let s,idx=-1;for(let i=0;i<12000;i++){game.update(1/60,true);s=game.snapshot();idx=s.bots.findIndex(b=>b.outReason==='FLAG');if(idx>=0)break}assert.ok(idx>=0);assert.equal(s.cue?.id,'flag');const before=s.bots[idx].outT;for(let i=0;i<12;i++)game.update(1/60,true);assert.ok(Math.abs(game.snapshot().bots[idx].outT-(before-12/60))<1e-9)}finally{Math.random=old}
});
test('beam ends at the nearest opening-snapshot target, even when it moves',()=>{const r=resolveRallyRegister([bot(1,9,0),bot(1,7,1),bot(1,5,1)],['FIRE','MOVE','BRAKE'],0,1,'movement');assert.equal(r.lasers.length,1);assert.deepEqual(r.lasers[0],{x:1,y:9,dir:0,length:2,t:16/60});assert.equal(r.bots[1].hp,2);assert.equal(r.bots[2].hp,3);assert.equal(r.bots[1].x,2)});
test('beam with no target reaches five cells and ignores opponents beyond that range',()=>{const r=resolveRallyRegister([bot(2,10,0),bot(2,4,0)],['FIRE','BRAKE'],0,0,'movement');assert.equal(r.lasers[0].length,5);assert.equal(r.lasers[0].t,16/60);assert.equal(r.bots[1].hp,3)});

test('crusher uses 72-frame cycles and the monotonic course serial',()=>{assert.equal(rallyCrusherActive(2,5,0,0),false);assert.equal(rallyCrusherActive(2,5,71,0),false);assert.equal(rallyCrusherActive(2,5,72,0),true);assert.equal(rallyCrusherActive(2,5,0,1),true);assert.equal(rallyCrusherActive(2,5,0,4),false);const b=[bot(2,5,0)],ctx={frame:72,stageSerial:0,round:1,slot:0};assert.equal(resolveRallyRegister(b,[],0,0,'board',null,ctx).bots[0].hp,0);assert.equal(resolveRallyRegister(b,[],0,0,'board',null,{...ctx,frame:71}).bots[0].hp,3)});
test('turret uses round and register index rather than global register count',()=>{assert.equal(rallyTurretActive(1,0,0,4),true);assert.equal(rallyTurretActive(2,0,0,4),false);assert.equal(rallyTurretActive(1,1,0,4),false);const b=[bot(0,4,0)],ctx={frame:200,stageSerial:1,round:1,slot:0};assert.equal(resolveRallyRegister(b,[],1,99,'board',null,ctx).bots[0].hp,2);assert.equal(resolveRallyRegister(b,[],1,99,'board',null,{...ctx,round:2}).bots[0].hp,3)});
test('board projection uses projected simulation frame for crusher effects',()=>{const bots=[bot(2,5,0)],programs=[Array(5).fill('BRAKE')],runtime={physicsClock:3.6,round:1,stageSerial:0},trace=rallyForecastTrace(bots,programs,0,0,null,0,runtime);assert.equal(trace[0].wiped[0],true);assert.equal(trace[0].bots[0].outReason,'WIPEOUT')});

test('oil spin follows round and world seed, independent of register count',()=>{const b=[bot(5,7,1)],move=resolveRallyRegister(b,['MOVE'],0,0,'movement');const a={frame:204,round:2,slot:0,stageSerial:0,worldSeed:1},bctx={...a,worldSeed:2};assert.equal(rallyOilTurn(6,7,2,1),1);assert.equal(rallyOilTurn(6,7,2,2),-1);assert.equal(resolveRallyRegister(move.bots,[],0,0,'board',null,a).bots[0].dir,2);assert.equal(resolveRallyRegister(move.bots,[],0,99,'board',null,a).bots[0].dir,2);assert.equal(resolveRallyRegister(move.bots,[],0,0,'board',null,bctx).bots[0].dir,0);const raw=Math.sin((6+2)*127.1+(7+1)*311.7)*43758.5453;assert.equal(rallyHash(8,8),raw-Math.floor(raw))});
test('board projection uses the same seeded oil turn as the live board',()=>{const bots=[bot(5,7,1)],programs=[['MOVE','BRAKE','BRAKE','BRAKE','BRAKE']],runtime={physicsClock:0,round:2,stageSerial:0,worldSeed:1},trace=rallyForecastTrace(bots,programs,0,0,null,0,runtime);assert.equal(trace[0].bots[0].x,6);assert.equal(trace[0].bots[0].dir,2)});

test('baseline programs follow the seeded nine-entry rotation and return copies',()=>{assert.deepEqual(rallyBaselineProgram(0,1,0),['MOVE','MOVE','LEFT','CHARGE','RIGHT']);assert.deepEqual(rallyBaselineProgram(0,1,1),['CHARGE','RIGHT','MOVE','LEFT','MOVE']);assert.deepEqual(rallyBaselineProgram(40,1,2),rallyBaselineProgram(0,2,2));const p=rallyBaselineProgram(0,1,0);p[0]='FIRE';assert.equal(rallyBaselineProgram(0,1,0)[0],'MOVE');assert.deepEqual(rallyPersonas.map(x=>x.risk),[.52,.70,.38,.82])});
test('reference planner traces commanded motion without executing belt effects',()=>{const trace=rallyProgramTrace(bot(1,9,0),['MOVE','BRAKE'],0);assert.deepEqual(trace.map(p=>[p.x,p.y]),[[1,8],[1,8]]);assert.equal(resolveRallyRegister([bot(1,9,0)],['MOVE'],0,0).bots[0].x,2)});
test('profile uses the reference seeded stream and consumes its reaction draw',()=>{assert.deepEqual(rallyProfileRoll(1),{state:3663131627,value:0.6270739405881613});const old=Math.random;let seed=17;const random=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/2**32);try{Math.random=random;const g=robots(),state=g.snapshot();let expectedSeed=17;const next=()=>((expectedSeed=(Math.imul(expectedSeed,1664525)+1013904223)>>>0)/2**32);const world=1+Math.floor(next()*2147483647),initial=Array.from({length:4},()=>1+Math.floor(next()*2147483647));assert.equal(state.worldSeed,world);assert.deepEqual(state.baselinePrograms,initial.map((_,i)=>rallyBaselineProgram(world,1,i)));assert.deepEqual(state.skillSeeds,initial.map(n=>rallyProfileRoll(n).state));assert.deepEqual(state.lapsed,initial.map(n=>rallyProfileRoll(n).value<.105))}finally{Math.random=old}});

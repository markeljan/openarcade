import test from 'node:test';
import assert from 'node:assert/strict';
import {alchemist} from '../src/feature-games33.js';
function move(g,x,y){for(let i=0;i<1000;i++){const state=g.snapshot(),p=state.p,dx=x-p.x,dy=y-p.y;if(state.wisps.some(w=>w.phase!=='flee'&&Math.hypot(w.x-p.x,w.y-p.y)<30)){g.input('z',true);g.update(1/60,false);g.input('z',false)}if(Math.hypot(dx,dy)<8)break;const k=Math.abs(dx)>Math.abs(dy)?dx>0?'ArrowRight':'ArrowLeft':dy>0?'ArrowDown':'ArrowUp';g.input(k,true);g.update(1/60,false);g.input(k,false)}}
function act(g,k=' '){g.update(.21,false);g.input(k,true);g.update(1/60,false);g.input(k,false)}
function ingredient(g,x){move(g,x,410);act(g);assert.equal(g.snapshot().carry.kind,'raw');move(g,45,260);act(g);assert.equal(g.snapshot().carry,null);g.update(.7,false);act(g);assert.equal(g.snapshot().carry.kind,'essence');move(g,130,260);act(g)}
test('manual recipe distills both ingredients and requires vent before restoration',()=>{const g=alchemist();ingredient(g,35);ingredient(g,120);assert.equal(g.snapshot().ingredients.length,2);g.update(.6,false);assert.equal(g.snapshot().phase,'warning');assert.equal(g.snapshot().score,0);move(g,202,220);act(g,'c');g.update(.9,false);assert.equal(g.snapshot().phase,'ready');move(g,120,105);act(g);assert.equal(g.snapshot().score,1);assert.equal(g.snapshot().manualScore,140);assert.equal(g.snapshot().phase,'idle')});
test('wrong ingredient is rejected and raises pressure',()=>{const g=alchemist();ingredient(g,205);assert.equal(g.snapshot().ingredients.length,0);assert.ok(g.snapshot().pressure>20);assert.equal(g.snapshot().notice,'INCOMPATIBLE')});
test('AI completes rotating recipes',()=>{const g=alchemist();for(let i=0;i<12000&&g.snapshot().score<3;i++)g.update(1/60,true);assert.ok(g.snapshot().score>=3);assert.equal(g.snapshot().manualScore,0)});

test('manual first safe recipe opens a three-essence moon moth restoration',()=>{
 const g=alchemist();ingredient(g,35);ingredient(g,120);g.update(.6,false);move(g,202,220);act(g,'c');g.update(.9,false);move(g,120,105);act(g);assert.equal(g.snapshot().moon.phase,'seek-tide');
 move(g,205,410);act(g);move(g,45,260);act(g);g.update(.7,false);act(g);assert.equal(g.snapshot().carry.element,2);
 if(g.snapshot().pressure>=76){move(g,202,220);act(g,'c')}move(g,165,175);act(g);assert.equal(g.snapshot().moon.phase,'steeping');for(let i=0;i<600&&g.snapshot().moon.phase==='steeping';i++)g.update(1/60,false);assert.equal(g.snapshot().moon.phase,'bottled');
 act(g);assert.equal(g.snapshot().moon.phase,'carrying');move(g,45,105);act(g);assert.equal(g.snapshot().moon.phase,'restored');assert.equal(g.snapshot().manualScore,365);
});
test('AI restores the moon moth and continues ordinary recipes',()=>{
 const g=alchemist();for(let i=0;i<30000;i++){g.update(1/60,true);const s=g.snapshot();if(s.moon.phase==='restored'&&s.score>=2)return}assert.fail('AI did not restore moth and continue');
});

test('manual alchemist can keep two stills loaded independently',()=>{
 const game=alchemist();move(game,35,410);act(game);move(game,45,260);act(game);move(game,120,410);act(game);move(game,205,300);act(game);game.update(.7,false);
 const state=game.snapshot();assert.equal(state.coils[0]?.element,0);assert.equal(state.coils[1]?.element,1);assert.ok(state.coils.every(c=>c.ready));
});
test('a wisp telegraphs and taints a still until warded at the coil',()=>{
 const game=alchemist();move(game,35,410);act(game);move(game,45,260);act(game);let state,warning=false;
 for(let i=0;i<1500;i++){game.update(1/60,false);state=game.snapshot();warning ||= state.wisps.some(w=>w.phase==='windup');if(state.coils[0]?.tainted)break}
 assert.ok(warning);assert.ok(state.coils[0]?.tainted);move(game,45,260);act(game,'z');assert.equal(game.snapshot().coils[0],null);
});

test('an unwarded wisp targets the empty cauldron and raises pressure once',()=>{
 const game=alchemist();let state,warning=false;for(let i=0;i<1200;i++){game.update(1/60,false);state=game.snapshot();warning ||= state.wisps.some(w=>w.targetIndex===-1&&w.phase==='windup');if(state.notice==='REACTION SPIKES')break}
 assert.ok(warning);assert.equal(state.notice,'REACTION SPIKES');assert.equal(state.pressure,52);for(let i=0;i<20;i++)game.update(1/60,false);assert.equal(game.snapshot().pressure,52);
});
test('manual ward interrupts the cauldron wisp before its strike',()=>{
 const game=alchemist();move(game,130,260);let state;for(let i=0;i<1200;i++){game.update(1/60,false);state=game.snapshot();if(state.wisps.some(w=>w.targetIndex===-1&&w.phase==='windup'))break}
 const w=state.wisps.find(w=>w.targetIndex===-1&&w.phase==='windup');assert.ok(w);game.input('z',true);game.update(1/60,false);game.input('z',false);state=game.snapshot();assert.ok(state.wisps.every(w=>w.phase==='flee'));assert.equal(state.pressure,20);
});

test('audio events follow physical crafting and moon restoration transitions',()=>{
 const events=[],game=alchemist(event=>events.push(event));move(game,35,410);act(game);assert.equal(events.filter(e=>e==='clay').length,1);move(game,45,260);act(game);assert.ok(events.includes('kiln'));game.update(.7,false);assert.ok(events.includes('pickup'));
 const automatic=alchemist(event=>events.push(event));for(let i=0;i<30000&&!events.includes('gallery');i++)automatic.update(1/60,true);
 assert.ok(events.includes('glaze'));assert.ok(events.includes('vent'));assert.ok(events.includes('fired'));assert.ok(events.includes('gallery'),'moon restoration cue missing');
});

test('AI takeover vents accumulated pressure and finishes a manually preloaded moon branch',()=>{
 const game=alchemist();move(game,35,410);act(game);move(game,45,260);act(game);game.update(.7,false);assert.ok(game.snapshot().coil?.ready);
 for(let i=0;i<30000;i++){game.update(1/60,true);const state=game.snapshot();if(state.moon.phase==='restored'&&state.score>=2)return}
 assert.fail('AI stalled after taking over a preloaded still');
});
test('manual retort heats to pressure warning, vents by 56 and keeps residual pressure',()=>{const g=alchemist();ingredient(g,35);ingredient(g,120);let s=g.snapshot();assert.equal(s.phase,'warming');const before=s.pressure;g.update(.1,false);s=g.snapshot();assert.ok(Math.abs(s.pressure-before-4.08)<1e-6);while(g.snapshot().phase==='warming')g.update(.05,false);assert.ok(g.snapshot().pressure>=70);move(g,202,220);s=g.snapshot();assert.equal(s.phase,'warning');const preVent=s.pressure;g.input('c',true);g.update(1/60,false);g.input('c',false);s=g.snapshot();assert.equal(s.phase,'flow');assert.ok(Math.abs(s.pressure-Math.max(12,preVent+19.8/60-56))<1e-6);g.update(.81,false);assert.equal(g.snapshot().phase,'ready');move(g,120,105);const preRestore=g.snapshot().pressure;act(g);s=g.snapshot();assert.equal(s.score,1);assert.equal(s.pressure,preRestore);assert.equal(s.points,140);assert.equal(s.restored[0].name,'MOON KEY');assert.deepEqual(s.restored[0].recipe,[0,1])});
test('AI retains restored relic identity and advances stage-based rewards',()=>{const g=alchemist();for(let i=0;i<50000&&g.snapshot().score<4;i++)g.update(1/60,true);const s=g.snapshot();assert.equal(s.score,4);assert.equal(s.stage,1);assert.equal(s.points,605+(s.moon.phase==='restored'?225:0));assert.deepEqual(s.restored.map(r=>r.name),['MOON KEY','SUN MASK','STAR LAMP','ROOT CROWN']);assert.deepEqual(s.restored.map(r=>r.stage),[0,0,0,1]);assert.ok(s.restored.every(r=>r.safe))});
test('moonlit aperture follows its continuous reference cycle through curse resets in manual and AI',()=>{for(const auto of [false,true]){const g=alchemist();for(let frame=1;frame<=650;frame++){g.update(1/60,auto);const s=g.snapshot();assert.equal(s.moonlit,(frame+37)%168<116,`frame ${frame}, auto ${auto}`)}assert.ok(g.snapshot().worldTime>10);assert.ok(g.snapshot().clock<3)}});


test('held actions sample after movement and unsuccessful higher priorities do not lock work',()=>{
 const g=alchemist();g.input(' ',true);g.input('z',true);g.input('c',true);g.input('ArrowUp',true);
 for(let i=0;i<30;i++)g.update(1/60,false);
 assert.equal(g.snapshot().carry?.kind,'raw');assert.equal(g.snapshot().carry?.element,1);
 g.input(' ',false);g.input('z',false);g.input('c',false);g.input('ArrowUp',false);
});
test('a press and release between simulation steps does not trigger crafting',()=>{
 const g=alchemist();move(g,120,410);g.input(' ',true);g.input(' ',false);g.update(1/60,false);assert.equal(g.snapshot().carry,null);
});


test('manual held movement and work agree between 30Hz and 60Hz updates',()=>{
 const run=hz=>{const events=[],g=alchemist(e=>events.push(e));g.input(' ',true);g.input('ArrowUp',true);for(let i=0;i<hz;i++)g.update(1/hz,false);g.input('ArrowUp',false);g.input('ArrowLeft',true);for(let i=0;i<hz;i++)g.update(1/hz,false);g.input('ArrowLeft',false);g.input('ArrowUp',true);for(let i=0;i<hz;i++)g.update(1/hz,false);return {state:g.snapshot(),events}};
 const a=run(30),b=run(60);assert.deepEqual(a,b);assert.ok(a.state.carry||a.state.coils.some(Boolean));assert.ok(a.events.includes('clay'));
});
test('AI progresses identically at 30Hz and 60Hz for equal elapsed time',()=>{
 const run=hz=>{const events=[],g=alchemist(e=>events.push(e));for(let i=0;i<hz*90;i++)g.update(1/hz,true);return {state:g.snapshot(),events}};
 const a=run(30),b=run(60);assert.deepEqual(a,b);assert.ok(a.state.score>0);assert.ok(a.events.includes('fired'));
});
test('reset clears a partial accumulated step',()=>{
 const g=alchemist();g.update(1/120,false);g.reset();g.update(1/120,false);assert.equal(g.snapshot().worldTime,0);g.update(1/120,false);assert.equal(g.snapshot().worldTime,1/60);
});

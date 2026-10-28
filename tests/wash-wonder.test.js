import test from 'node:test';
import assert from 'node:assert/strict';
import {applyWashJet,createWashWonder,createFeatureGame40} from '../src/feature-games40.js';

test('fan cleans chalk faster while narrow cleans rust faster, and weak pressure cleans more slowly',()=>{
 const make=material=>[{x:0,y:60,hp:100,material}];
 const jet={x:0,y:100,dx:0,dy:-1,range:100,pressure:1};
 const fanChalk=make('chalk'),narrowChalk=make('chalk'),fanRust=make('rust'),narrowRust=make('rust'),weak=make('rust');
 applyWashJet(fanChalk,{...jet,nozzle:'fan'},1/60);applyWashJet(narrowChalk,{...jet,nozzle:'narrow'},1/60);
 applyWashJet(fanRust,{...jet,nozzle:'fan'},1/60);applyWashJet(narrowRust,{...jet,nozzle:'narrow'},1/60);
 applyWashJet(weak,{...jet,nozzle:'narrow',pressure:.2},1/60);
 assert.ok(fanChalk[0].hp<narrowChalk[0].hp);assert.ok(narrowRust[0].hp<fanRust[0].hp);assert.ok(weak[0].hp>narrowRust[0].hp);
 const missed=[{x:80,y:60,hp:10,material:'chalk'}];assert.equal(applyWashJet(missed,{...jet,nozzle:'fan'},1/60).removed,0);
});

test('manual spray consumes water, locks aim while moving, and refills only at the tap',()=>{
 const game=createWashWonder();game.input(' ',true);game.input('ArrowRight',true);
 for(let i=0;i<120;i++)game.update(1/60,false);
 const sprayed=game.snapshot();assert.ok(sprayed.water<100);assert.deepEqual(sprayed.aim,{x:0,y:-1});
 game.input(' ',false);game.input('ArrowRight',false);game.input('z',true);game.update(.05,false);assert.equal(game.snapshot().water,sprayed.water);
 game.input('ArrowLeft',true);for(let i=0;i<120;i++)game.update(1/60,false);game.input('ArrowLeft',false);
 for(let i=0;i<30;i++)game.update(1/60,false);assert.equal(game.snapshot().water,168);assert.ok(game.snapshot().refills>0);
 game.input('z',false);game.input('x',true);game.update(1/60,false);assert.equal(game.snapshot().nozzle,'narrow');game.input('x',false);
});

test('autoplay restores all three landmarks, opens gates and refills the tank',()=>{
 const game=createWashWonder();const visited=new Set();let completed=false,refilled=false;
 for(let i=0;i<30000;i++){game.update(1/60,true);if(i%30===0){const s=game.snapshot();visited.add(s.job);if(s.refills)refilled=true;if(s.phase==='pack'){completed=true;assert.equal(s.remaining,0);break}}}
 assert.deepEqual([...visited],[0,1,2]);assert.ok(refilled);assert.ok(completed);
});

test('opening a clean landmark requires the player to reach the gate',()=>{
 const game=createWashWonder();for(let i=0;i<12000;i++){game.update(1/60,true);if(game.snapshot().phase==='ribbon')break}
 let s=game.snapshot();assert.equal(s.phase,'ribbon');assert.equal(s.job,0);
 game.input('ArrowLeft',true);for(let i=0;i<80;i++)game.update(1/60,false);game.input('ArrowLeft',false);
 game.input(' ',true);game.update(.05,false);game.input(' ',false);assert.equal(game.snapshot().job,0);
 game.input('ArrowRight',true);for(let i=0;i<180&&game.snapshot().player.x<280;i++)game.update(1/60,false);game.input('ArrowRight',false);
 s=game.snapshot();if(s.player.y<570){game.input('ArrowDown',true);for(let i=0;i<20&&game.snapshot().player.y<574;i++)game.update(1/60,false);game.input('ArrowDown',false)}
 game.input(' ',true);game.update(.05,false);game.input(' ',false);assert.equal(game.snapshot().job,1);assert.equal(game.snapshot().phase,'wash');
});

test('manual pack-up refills at the tap and starts a fresh job when the trigger is pressed',()=>{
 const oldRandom=Math.random;let seed=3;Math.random=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296);
 try {const game=createWashWonder();for(let i=0;i<30000;i++){game.update(1/60,true);if(game.snapshot().phase==='pack')break}
 assert.equal(game.snapshot().phase,'pack');
 // The preceding AI may approach the final gate from different angles. Steer
 // to the tap rather than assuming a fixed starting height.
 for(const [axis,goal,negative,positive] of [['x',34,'ArrowLeft','ArrowRight'],['y',588,'ArrowUp','ArrowDown']]){
  for(let i=0;i<200&&Math.abs(game.snapshot().player[axis]-goal)>3;i++){
   const key=game.snapshot().player[axis]<goal?positive:negative;
   game.input(key,true);game.update(1/60,false);game.input(key,false);
  }
 }
 assert.ok(Math.hypot(game.snapshot().player.x-34,game.snapshot().player.y-588)<=21,'player should reach the tap');
 game.input('z',true);for(let i=0;i<30;i++)game.update(1/60,false);game.input('z',false);assert.equal(game.snapshot().water,168);
 game.input(' ',true);game.update(1/60,false);assert.equal(game.snapshot().phase,'wash');assert.equal(game.snapshot().job,0);
 } finally {Math.random=oldRandom}
});

test('grime follows landmark edges and manual spraying removes persistent cells',()=>{
 const game=createWashWonder();let s=game.snapshot();
 assert.ok(s.cells.some(c=>c.mask!==0xffff),'edge cells retain partial silhouette masks');
 assert.ok(s.cells.every(c=>c.mask>0&&c.x>=c.left&&c.x<c.left+8&&c.y>=c.top&&c.y<c.top+8));
 const before=s.cells.reduce((sum,c)=>sum+c.hp,0);
 game.input(' ',true);game.input('ArrowRight',true);
 for(let i=0;i<180;i++)game.update(1/60,false);
 s=game.snapshot();assert.ok(s.cells.reduce((sum,c)=>sum+c.hp,0)<before);
 game.input(' ',false);game.input('ArrowRight',false);
 const after=s.cells.reduce((sum,c)=>sum+c.hp,0);game.update(.05,false);
 assert.equal(game.snapshot().cells.reduce((sum,c)=>sum+c.hp,0),after);
});

test('held nozzle control repeats on the reference 18-frame cooldown',()=>{const cues=[],g=createWashWonder(c=>cues.push(c));g.input('x',true);g.update(1/60,false);assert.equal(g.snapshot().nozzle,'narrow');for(let i=0;i<17;i++)g.update(1/60,false);assert.equal(g.snapshot().nozzle,'narrow');for(let i=0;i<2;i++)g.update(1/60,false);assert.equal(g.snapshot().nozzle,'fan');assert.equal(cues.filter(c=>c==='wash-nozzle').length,2);g.input('x',false)});
test('AI chooses spray height based on dirty surface and still restores the first landmark',()=>{const g=createWashWonder();let sawApproach=false;for(let i=0;i<12000&&g.snapshot().phase==='wash';i++){g.update(1/60,true);const s=g.snapshot();if(s.player.y<540)sawApproach=true}assert.ok(sawApproach,'AI should approach higher grime');assert.equal(g.snapshot().phase,'ribbon')});
test('AI starts a fresh wash immediately after reaching the tap with a full tank',()=>{const old=Math.random;let seed=3;Math.random=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296);try{const g=createWashWonder();let ready=false;for(let i=0;i<40000;i++){g.update(1/60,true);const s=g.snapshot();if(s.phase==='pack'&&s.water===168&&Math.hypot(s.player.x-34,s.player.y-588)<=21){ready=true;break}}assert.ok(ready);g.update(1/60,true);const s=g.snapshot();assert.equal(s.phase,'wash');assert.equal(s.job,0)}finally{Math.random=old}});


test('nozzle samples held input and changes before same-tick spraying',()=>{
 const cues=[],g=createWashWonder(c=>cues.push(c));g.input('x',true);g.input('x',false);g.update(1/60,false);assert.equal(g.snapshot().nozzle,'fan');assert.ok(!cues.includes('wash-nozzle'));
 const before=g.snapshot().water;g.input('x',true);g.input(' ',true);g.update(1/60,false);const s=g.snapshot();assert.equal(s.nozzle,'narrow');assert.equal(s.jet.nozzle,'narrow');assert.ok(s.water<before);assert.ok(cues.includes('wash-nozzle'));g.input('x',false);g.input(' ',false);
});


for(const key of ['j','k'])test(`${key.toUpperCase()} holds the nozzle control for the reference cadence`,()=>{const cues=[],g=createWashWonder(c=>cues.push(c));g.input(key,true);g.update(1/60,false);assert.equal(g.snapshot().nozzle,'narrow');for(let i=0;i<17;i++)g.update(1/60,false);assert.equal(g.snapshot().nozzle,'narrow');g.update(1/60,false);assert.equal(g.snapshot().nozzle,'fan');assert.equal(cues.filter(c=>c==='wash-nozzle').length,2);g.input(key,false)});
test('held Shift refills at the tap and suppresses simultaneous spray',()=>{const g=createWashWonder();g.input(' ',true);for(let i=0;i<20;i++)g.update(1/60,false);g.input(' ',false);const water=g.snapshot().water;assert.ok(water<168);g.input('Shift',true);g.input(' ',true);g.update(1/60,false);assert.equal(g.snapshot().water,Math.min(168,water+9));assert.equal(g.snapshot().jet,null);g.input('Shift',false);g.input(' ',false)});
test('Wash wrapper forwards J and K while preserving shared key handling',()=>{const old={window:globalThis.window,ResizeObserver:globalThis.ResizeObserver,requestAnimationFrame:globalThis.requestAnimationFrame,cancelAnimationFrame:globalThis.cancelAnimationFrame},handlers=new Map(),labels=[],noop=()=>{};let next,frame=0;try{globalThis.window={devicePixelRatio:1};globalThis.ResizeObserver=class{observe(){}disconnect(){}};globalThis.requestAnimationFrame=f=>(next=f,1);globalThis.cancelAnimationFrame=noop;const ctx=new Proxy({fillText(s){labels.push(s)}},{get:(o,k)=>o[k]??noop,set:(o,k,v)=>(o[k]=v,true)}),canvas={getContext:()=>ctx,getBoundingClientRect:()=>({width:320,height:720}),setAttribute:noop,addEventListener:(k,v)=>handlers.set(k,v),removeEventListener:noop},g=createFeatureGame40(canvas,'wash-wonder',{interactive:true});const key=(k,down)=>handlers.get(down?'keydown':'keyup')({key:k,preventDefault:noop});const tick=()=>{labels.length=0;next(++frame*1000/60)};tick();key('j',true);tick();key('j',false);assert.ok(labels.some(s=>s.startsWith('NARROW/RUST')));for(let i=0;i<18;i++)tick();key('k',true);tick();key('k',false);assert.ok(labels.some(s=>s.startsWith('FAN/CHALK')));g.destroy()}finally{Object.assign(globalThis,old)}});

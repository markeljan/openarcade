import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createKaijuControl,createMoonGame} from '../src/feature-games14.js';
import {dungeon} from '../src/feature-games15.js';
import {foundry,lantern} from '../src/feature-games16.js';

function seeded(fn){const original=Math.random;let seed=42;Math.random=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/2**32);try{return fn()}finally{Math.random=original}}
async function fixture(number,patch){
 let source=await readFile(new URL(`../src/feature-games${number}.js`,import.meta.url),'utf8');
 source=source.replace("import {createGameAudio,unlockSound} from './audio.js';",'const createGameAudio=()=>({emit(){},setActive(){},destroy(){}}),unlockSound=()=>{};');
 source=source.replace("'./scores/run.js'",JSON.stringify(new URL('../src/scores/run.js',import.meta.url).href));
 return import('data:text/javascript;base64,'+Buffer.from(patch(source)).toString('base64'));
}
const timed=[['kaiju-control',createKaijuControl,'runScore'],['moonshine-valley',createMoonGame,'runScore'],['dungeon-relay',dungeon,'score'],['ricochet-foundry',foundry,'runScore'],['lantern-line',lantern,'score']];
for(const [id,make,metric] of timed)for(const auto of [false,true])test(`${id} ${auto?'AI':'human'} reports its real tally once at 120 active seconds`,()=>seeded(()=>{
 const results=[],g=make(()=>{},result=>results.push(result));
 if(!auto)g.input(' ',true);
 for(let i=0;i<2399;i++)g.update(.05,auto);
 assert.equal(results.length,0,'must not finish before the time boundary');
 g.update(.05,auto);assert.equal(results.length,1);
 const terminal=g.snapshot();assert.equal(results[0].score,terminal[metric]);assert.equal(results[0].result,'SESSION COMPLETE');assert.ok(Number.isInteger(results[0].score));
 if(auto)assert.ok(results[0].score>0,'the AI must earn the same action points');
 g.input('ArrowRight',true);for(let i=0;i<200;i++)g.update(.05,auto);
 assert.deepEqual(g.snapshot(),terminal,'scored result freezes gameplay');assert.equal(results.length,1);
}));

for(const auto of [false,true])test(`Kaiju ${auto?'AI':'human'} uses the exact pickup, cargo, beacon, repair, brace, diversion and district awards`,async()=>{
 const mod=await fixture(14,source=>source.replace('update,draw,reset,snapshot(){return structuredClone({hero,monster',`update,draw,reset,events(){
  const at=s=>Object.assign(hero,{x:s.x,y:s.y,node:s.node,from:s.node,to:s.node,moveT:0});
  at(sites[0]);act(2);at(shelter);act(2);at(sites[4]);beacon=0;beaconCooldown=0;act(2);
  at(sites[3]);sites[3].hp=2;act(2);warning='warning';clock=34;braceReady=true;monster.stun=100;update(0,${auto});
  warning='spent';beacon=10;monster.stun=0;monster.moveT=0;monster.node=sites[4].node;update(0,${auto});
  monster.stun=100;clock=100;update(0,${auto});
 },snapshot(){return structuredClone({hero,monster`));
 const g=mod.createKaijuControl();g.update(0,auto);g.events();const s=g.snapshot();
 assert.equal(s.runScore,16+54+13+21+2+37+155);assert.equal(s.manualScore,auto?0:s.runScore);
});

for(const auto of [false,true])test(`Moonshine ${auto?'AI':'human'} retains exact action awards in the shared run tally`,async()=>{
 const mod=await fixture(14,source=>source.replace('reset,snapshot(){return structuredClone({hero,crops',`reset,events(){
  creatures=[];Object.assign(hero,plots[6]);act();crops[6].watered=true;crops[6].growth=1;act();Object.assign(hero,bin);act();
  objective={kind:'ward',done:false};coins=100;Object.assign(hero,workshop);act();objective={kind:'fence',done:false};act();
  creatures=[{x:hero.x+20,y:hero.y,hp:1,dead:false,kind:'mireling',attackCd:1}];night=true;act();
 },snapshot(){return structuredClone({hero,crops`));
 const g=mod.createMoonGame();g.update(0,auto);const before=g.snapshot().runScore;g.events();let s=g.snapshot();
 assert.equal(s.runScore-before,7+12+16+22+14+2);assert.equal(s.score,auto?0:s.runScore);
 // The traveling farmer shot awards two for its actual hit and fifteen for the kill.
 for(let i=0;i<5;i++)g.update(.02,auto);s=g.snapshot();assert.equal(s.runScore-before,73+2+15);assert.equal(s.score,auto?0:s.runScore);
});

for(const auto of [false,true])test(`Dungeon ${auto?'AI':'human'} sigils and solved vault award 35+35+80`,async()=>{
 const mod=await fixture(15,source=>source.replace('},reset,snapshot(){return structuredClone({grid,p,enemies',`},reset,events(){for(const rune of puzzles[0].runes){p={...rune};activate()}},snapshot(){return structuredClone({grid,p,enemies`));
 const g=mod.dungeon();g.update(0,auto);const before=g.snapshot().score;g.events();const s=g.snapshot();assert.equal(s.score-before,150);assert.equal(s.manualScore,auto?0:s.score);
});

for(const auto of [false,true])test(`Foundry ${auto?'AI':'human'} recipe and installed part retain 8+8+8+30 points`,async()=>{
 const mod=await fixture(16,source=>source.replace('},reset,snapshot(){return structuredClone({port,dir',`},reset,events(){for(const target of ['HEAT','STAMP','QUENCH','DIE']){ball={x:160,y:400,target,mode:'outbound',trail:[]};arrive()}},snapshot(){return structuredClone({port,dir`));
 const g=mod.foundry();g.update(0,auto);g.events();g.update(.05,auto);for(let i=0;i<10;i++)g.update(.05,auto);const s=g.snapshot();assert.equal(s.parts,1);assert.equal(s.runScore,54);assert.equal(s.sessionScore,auto?0:54);
});

for(const auto of [false,true])test(`Lantern ${auto?'AI':'human'} exact chain, imperfect, scrub and purge use source points`,async()=>{
 const mod=await fixture(16,source=>source.replace('},reset,snapshot(){return structuredClone({keeper,lanes',`},reset,events(){
  halves=order.map(o=>({...o,flawed:false}));finish();halves=order.map(o=>({...o,flawed:false}));finish();halves=order.map(o=>({...o,flawed:true}));finish();
  keeper={x:lanes[0].x,y:300};lanes[0].jam=3;scrub();keeper={...vent};threat={state:'windup',lane:0};purge();
 },snapshot(){return structuredClone({keeper,lanes`));
 const g=mod.lantern();g.update(0,auto);g.events();assert.equal(g.snapshot().score,110+120+20+20+20);
});

for(const auto of [false,true])test(`Gravity ${auto?'AI':'human'} reports on health zero once and keeps legacy best human-only`,async()=>{
 const mod=await fixture(15,source=>source.replace('},reset,snapshot(){return structuredClone({p,props,enemies',`},reset,defeat(){
  props=[];vents=[];projectiles=[];enemies=[{x:p.x+10,y:p.y,hp:1,kind:'mite',stun:10}];damageEnemy(enemies[0],1,'prop');
  health=25;invulnerable=0;bolts=[{x:p.x,y:p.y,vx:0,vy:0}];
 },snapshot(){return structuredClone({p,props,enemies`));
 const results=[],bests=[],g=mod.createGravityClawGame({finish:n=>bests.push(n)},()=>{},r=>results.push(r));
 g.update(0,auto);g.defeat();g.update(0,auto);assert.equal(results.length,1);assert.equal(results[0].score,5);assert.equal(results[0].result,'HULL LOST');
 assert.deepEqual(bests,auto?[]:[5]);const terminal=g.snapshot();for(let i=0;i<100;i++)g.update(.05,auto);g.input('Enter',true);
 assert.equal(results.length,1);assert.deepEqual(g.snapshot(),terminal);
});

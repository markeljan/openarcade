import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {coral} from '../src/feature-games19.js';
function drive(g,target){for(let i=0;i<60*10;i++){const p=g.snapshot().diver,dx=target.x-p.x,dy=target.y-p.y;if(Math.hypot(dx,dy)<15){for(const k of ['ArrowUp','ArrowDown','ArrowLeft','ArrowRight'])g.input(k,false);return}for(const [k,v] of [['ArrowLeft',dx< -4],['ArrowRight',dx>4],['ArrowUp',dy< -4],['ArrowDown',dy>4]])g.input(k,v);g.update(1/60,false)}assert.fail('target not reached')}
function act(g){g.input(' ',true);for(let i=0;i<20;i++)g.update(1/60,false);g.input(' ',false)}
test('manual diver starts with reference momentum and drifts in the middle current',()=>{const g=coral();let s=g.snapshot();assert.equal(s.diver.vx,52.8);assert.equal(s.diver.vy,31.2);drive(g,{x:160,y:400});for(let i=0;i<90;i++)g.update(1/60,false);s=g.snapshot();assert.ok(s.diver.y>320&&s.diver.y<492);assert.ok(Math.abs(s.diver.vx)>.05,'middle reef current should continue moving a stationary diver')});
test('manual diver rescues a seahorse, gathers regrowing coral, and blooms an adjacent socket',()=>{
 const g=coral();let s=g.snapshot();assert.equal(s.sockets.length,12);assert.equal(s.horses.length,3);
 drive(g,s.horses[0]);act(g);s=g.snapshot();assert.equal(s.horses[0].state,'escort');assert.equal(s.score,90);
 drive(g,s.nurseries[0]);act(g);s=g.snapshot();assert.ok(s.carry);assert.ok(s.nurseries[0].regrow>0);
 drive(g,s.sockets[3]);act(g);s=g.snapshot();assert.equal(s.carry,null);assert.equal(s.sockets.filter(q=>q.alive).length,2);assert.equal(s.sockets.filter(q=>q.symbiotic).length,2);assert.equal(s.horses[0].state,'sheltered');assert.ok(s.score>=390);
});
test('automatic diver restores multiple habitats and finds air',()=>{
 const g=coral();let min=100,foundAir=false,s;for(let i=0;i<60*120;i++){g.update(1/60,true);s=g.snapshot();min=Math.min(min,s.oxygen);if(s.oxygen>min+20)foundAir=true;if(s.cycles>0&&foundAir)break}
 assert.ok(s.cycles>0,'all twelve sockets can be restored');assert.ok(foundAir,'oxygen must be replenished');assert.ok(s.score>=3000);
});
test('cleaner intercepts lionfish and guards the rescued seahorse',()=>{const g=coral();let s=g.snapshot();drive(g,s.horses[1]);act(g);s=g.snapshot();assert.equal(s.horses[1].state,'escort');assert.ok(['intercept','guard'].includes(s.cleaner.state));let intercepted=s.cleaner.state==='guard';for(let i=0;i<180&&!intercepted;i++){g.update(1/60,false);s=g.snapshot();if(s.cleaner.state==='guard')intercepted=true}assert.ok(intercepted,'cleaner did not reach the lionfish');assert.equal(s.cleaner.horse,1);assert.ok(s.cleaner.cleared);assert.equal(s.fish[s.cleaner.fish].state,'distracted');drive(g,s.nurseries[1]);act(g);s=g.snapshot();assert.ok(s.carry);drive(g,s.sockets[4]);act(g);s=g.snapshot();assert.equal(s.horses[1].state,'sheltered');assert.ok(s.horses[1].safelyDelivered);assert.equal(s.safeNooks.length,1);assert.equal(s.safeNooks[0].horse,1)});
test('preview can complete a cleaner escort',()=>{const g=coral();for(let i=0;i<9000;i++){g.update(1/60,true);if(g.snapshot().safeNooks.length)return}assert.fail('preview did not complete a cleaner escort')});
test('lionfish lead the diver then lock their aim and recover before attacking again',()=>{const g=coral();g.input('ArrowDown',true);let s;for(let i=0;i<400;i++){g.update(1/60,false);s=g.snapshot();if(s.fish[0].state==='windup')break}g.input('ArrowDown',false);assert.equal(s.fish[0].state,'windup');g.input('ArrowRight',true);while(g.snapshot().fish[0].state==='windup'&&g.snapshot().fish[0].timer<.24)g.update(1/60,false);s=g.snapshot();assert.equal(s.fish[0].state,'windup');const locked={...s.fish[0].aim};for(let i=0;i<5;i++)g.update(1/60,false);s=g.snapshot();assert.deepEqual(s.fish[0].aim,locked,'aim changed after the lock');g.input('ArrowRight',false);for(let i=0;i<180;i++){g.update(1/60,false);s=g.snapshot();if(s.fish[0].state==='patrol'&&s.fish[0].cooldown>0)break}assert.equal(s.fish[0].state,'patrol');assert.ok(s.fish[0].cooldown>1,'missing post-attack cooldown')});


test('restored reef cycles add lionfish up to four, including the shallow habitat',()=>{
 const g=coral();let s;for(let i=0;i<60000;i++){g.update(1/60,true);if(i%120===0){s=g.snapshot();if(s.cycles>=2)break}}s=g.snapshot();assert.ok(s.cycles>=2,'AI did not restore two reefs');assert.equal(s.fish.length,4);assert.equal(s.fish[2].biome,2);assert.equal(s.fish[3].biome,0);assert.ok(s.fish[3].y>=160&&s.fish[3].y<=294);for(let i=0;i<120;i++)g.update(1/60,true);assert.ok(g.snapshot().fish.every(f=>Number.isFinite(f.x)&&Number.isFinite(f.y)));
});

test('AI evades a winding lionfish while manual movement stays under player control',async()=>{let src=await readFile(new URL('../src/feature-games19.js',import.meta.url),'utf8');src=src.replace("import {createGameAudio,unlockSound} from './audio.js';",'const createGameAudio=()=>({emit(){}}),unlockSound=()=>{};');const needle='},reset,snapshot(){return structuredClone({diver,sockets,nurseries,horses,vents,fish,oxygen,score,manualScore,carry';assert.ok(src.includes(needle));src=src.replace(needle,"},reset,fixture(){diver={x:160,y:360,vx:0,vy:0};fish=[{x:180,y:360,biome:1,state:'windup',timer:0,cooldown:0,homeY:360,phase:0,vx:0,vy:0,aim:{x:160,y:360}}]},snapshot(){return structuredClone({diver,sockets,nurseries,horses,vents,fish,oxygen,score,manualScore,carry");const {coral}=await import('data:text/javascript;base64,'+Buffer.from(src).toString('base64'));const ai=coral();ai.fixture();ai.update(1/60,true);const a=ai.snapshot();assert.ok(a.diver.vx<0&&a.diver.vy<0,'AI should move away and across the attack');const manual=coral();manual.fixture();manual.input('ArrowRight',true);manual.update(1/60,false);assert.ok(manual.snapshot().diver.vx>0,'manual input remains authoritative')});

test('rescued seahorse swims to a new shelter before being trapped again',()=>{
 const g=coral();drive(g,g.snapshot().horses[0]);act(g);
 for(let i=0;i<500&&g.snapshot().horses[0].state==='escort';i++)g.update(1/60,false);
 const sheltered=g.snapshot().horses[0];assert.equal(sheltered.state,'sheltered');
 for(let i=0;i<60;i++)g.update(1/60,false);
 const moving=g.snapshot().horses[0];assert.equal(moving.state,'sheltered');assert.ok(Math.hypot(moving.x-sheltered.x,moving.y-sheltered.y)>2,'horse swims toward its new home');
 for(let i=0;i<600&&g.snapshot().horses[0].state!=='trapped';i++)g.update(1/60,false);
 const retrapped=g.snapshot().horses[0];assert.equal(retrapped.state,'trapped');assert.equal(retrapped.variant,1);assert.ok(Math.abs(retrapped.y-(retrapped.homeY+20))<2);
});

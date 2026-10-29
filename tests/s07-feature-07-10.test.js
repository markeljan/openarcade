import test from 'node:test';
import assert from 'node:assert/strict';
import { garden } from '../src/feature-games8.js';
import { haul } from '../src/feature-games9.js';
import { frog } from '../src/feature-games10.js';

test('timed boundaries report once for human and AI', () => {
 for (const auto of [false,true]) {
  for (const make of [finish=>garden(()=>{},{},false,{finish}), finish=>haul(()=>{},{finish}), finish=>frog({},()=>{},{},{finish})]) {
   const results=[], game=make(result=>results.push(result));
   for(let i=0;i<180000&&!results.length;i++) game.update(1/60,auto);
   assert.equal(results.length,1);
   const state=game.snapshot();  if (!auto && typeof state.sessionScore==='number') assert.equal(results[0].score,state.sessionScore);
   assert.ok(Number.isFinite(results[0].score));
   assert.ok(results[0].result);
   game.reset();
   for(let i=0;i<180000;i++) game.update(1/60,auto);
   assert.equal(results.length,1);
  }
 }
});
import {createHarness} from './s07-harness.js';
import {createFeatureGame7} from '../src/feature-games7.js';
import {createFeatureGame8} from '../src/feature-games8.js';
import {createFeatureGame9} from '../src/feature-games9.js';
import {createFeatureGame10} from '../src/feature-games10.js';

test('all eight previews report real terminal events and fresh run IDs',()=>{
 for(const [factory,id] of [[createFeatureGame7,'ghost-shift'],[createFeatureGame7,'wingrush'],[createFeatureGame8,'grave-garden'],[createFeatureGame8,'swarm-keeper'],[createFeatureGame9,'cosmic-haul'],[createFeatureGame9,'midnight-pursuit'],[createFeatureGame10,'pico-cap'],[createFeatureGame10,'frog-convoy']]){
  const h=createHarness(factory,id);try{for(let i=0;i<180000&&!h.results.length;i++)h.step(1,1000/60);assert.equal(h.results.length,1,id);assert.equal(h.results[0].actor,'ai');assert.equal(h.results[0].submissionEligible,false);assert.ok(Number.isFinite(h.results[0].score));h.game.beginRun({interactive:true,context:'manual-player'});h.game.restart();}finally{h.cleanup()}
 }
});

import {ghost,wing} from '../src/feature-games7.js';
import {createSwarmKeeper} from '../src/feature-games8.js';
import {pursuit} from '../src/feature-games9.js';
import {pico} from '../src/feature-games10.js';

test('human controls reach wing, swarm and pursuit boundaries with earned scores',()=>{
 for(const [name,make,drive] of [
  ['wing',f=>wing(undefined,{finish:f}),(g)=>{let s=g.snapshot(),target=s.forts[0],slope=.6*Math.cos((s.x+(s.phase+1/60)*45)/75);g.input('ArrowDown',s.grounded?slope>-.16:s.y<target.y-10);g.input('ArrowUp',!s.grounded&&s.y>target.y+12);g.input('x',Math.abs(target.x-s.x)<70)}],
  ['swarm',f=>createSwarmKeeper(undefined,{finish:f}),g=>{g.input('ArrowUp',true);g.input('x',true)}],
  ['pursuit',f=>pursuit(undefined,{}, {finish:f}),g=>g.input('ArrowUp',true)]
 ]) {const results=[],g=make(x=>results.push(x));for(let i=0;i<180000&&!results.length;i++){drive(g);g.update(1/60,false)}assert.equal(results.length,1,name);const s=g.snapshot();assert.equal(results[0].score,name==='pursuit'?s.distance:s.score,name)}
});

test('human controls restore a Pico glade and report its earned score',()=>{
 const results=[],g=pico(undefined,{finish:x=>results.push(x)}),dirs=[[1,0,'ArrowRight'],[-1,0,'ArrowLeft'],[0,1,'ArrowDown'],[0,-1,'ArrowUp']];
 function plan(s){const {hero,grid,gates,pads,shards,shrine,storm}=s,count=shards.filter(q=>q.taken).length,stage=gates.filter(q=>q.open).length,goals=storm.phase!=='calm'&&hero.small?pads.map(p=>({...p,requiresBig:true})):count>=3?[shrine]:shards.filter(q=>!q.taken&&(q.y<6?0:q.y<12?1:2)===stage),queue=[{x:hero.x,y:hero.y,small:hero.small,path:[]}],seen=new Set();for(let i=0;i<queue.length;i++){let n=queue[i],key=`${n.x},${n.y},${n.small}`;if(seen.has(key))continue;seen.add(key);if(goals.some(q=>q.x===n.x&&q.y===n.y&&(!q.requiresBig||!n.small)))return n.path[0];if(pads.some(p=>p.x===n.x&&p.y===n.y))queue.push({...n,small:!n.small,path:[...n.path,' ']});for(const [dx,dy,k] of dirs){let x=n.x+dx,y=n.y+dy,t=grid[y]?.[x];if(t===0||t===2&&n.small||t===3&&!n.small||t===4&&gates.some(q=>q.x===x&&q.y===y&&q.open))queue.push({x,y,small:n.small,path:[...n.path,k]})}}}
 for(let i=0;i<30000&&!results.length;i++){let s=g.snapshot();if(!s.travel&&!s.bounce&&!s.chop&&!s.channel&&!s.hero.stun){let k=plan(s);if(k){g.input(k,true);g.input(k,false)}}g.update(1/60,false)}assert.equal(results.length,1);assert.equal(results[0].score,g.snapshot().manualScore);assert.equal(g.snapshot().glades,2);
});

const map=['###########','#.........#','#..###....#','#..#......#','#..#..##..#','#.........#','#####D#####','#.........#','#.##...##.#','#....#....#','#.##...##.#','#.........#','###D#######','#.........#','#..###....#','#......##.#','#.##......#','#.........#','###########'];
function next(s,target){const q=[[s.player.x,s.player.y,[]]],seen=new Set();while(q.length){const [x,y,path]=q.shift(),k=x+','+y;if(seen.has(k))continue;seen.add(k);if(x===target.x&&y===target.y)return path[0];for(const [dx,dy,key] of [[0,-1,'ArrowUp'],[1,0,'ArrowRight'],[0,1,'ArrowDown'],[-1,0,'ArrowLeft']]){const nx=x+dx,ny=y+dy;if(ny<0||ny>=19||nx<0||nx>=11||map[ny][nx]==='#'||map[ny][nx]==='D'&&(ny===6?s.stage<2:s.relays.some(r=>!r.active)))continue;q.push([nx,ny,[...path,key]])}}}
function drive(g,target,done){for(let i=0;i<2000&&!done(g.snapshot());i++){const s=g.snapshot(),key=next(s,target);for(const k of ['ArrowUp','ArrowRight','ArrowDown','ArrowLeft'])g.input(k,k===key);g.input(' ',true);g.update(.18,false)}assert.ok(done(g.snapshot()))}

test('human courier deposits and reports the earned score',()=>{const results=[],g=ghost(undefined,{finish:x=>results.push(x)});drive(g,{x:8,y:4},s=>s.stage===1);drive(g,{x:1,y:5},s=>s.stage===2);drive(g,{x:9,y:8},s=>s.relays[0].active);drive(g,{x:1,y:10},s=>s.relays[1].active);drive(g,{x:9,y:13},s=>s.bag>=1);drive(g,{x:9,y:15},s=>s.bag>=2);drive(g,{x:9,y:17},s=>s.shift===2);assert.equal(results.length,1);assert.equal(results[0].score,g.snapshot().manualScore);});

test('AI garden and frog verdicts remain visible before their fresh runs',()=>{
 for(const [factory,id,seconds] of [[createFeatureGame8,'grave-garden',7],[createFeatureGame10,'frog-convoy',6]]){
  const h=createHarness(factory,id);try{for(let i=0;i<180000&&!h.results.length;i++)h.step(1,1000/60);assert.equal(h.results.length,1,id);const verdict=[...h.labels];h.step(Math.floor((seconds-1)*60),1000/60);assert.deepEqual(h.labels,verdict,id);assert.equal(h.results.length,1);h.step(120,1000/60);assert.notDeepEqual(h.labels,verdict,id)}finally{h.cleanup()}
 }
});
test('human garden and frog save records before notifying a callback that destroys the wrapper',()=>{
 for(const [factory,id] of [[createFeatureGame8,'grave-garden'],[createFeatureGame10,'frog-convoy']]){
  let h,observed;h=createHarness(factory,id,{interactive:true,onResult(record){observed={record,best:Number(h.storage.getItem(`miniarcade:best:${id}`))};h.game.destroy()}});
  try{for(let i=0;i<180000&&!observed;i++){if(id==='frog-convoy'&&i%24===0)h.press('ArrowUp');h.step(1,1000/60)}assert.ok(observed,id);assert.ok(observed.record.score>0,id);assert.equal(observed.best,observed.record.score,id);assert.equal(h.pendingFrames,0,id)}finally{h.cleanup()}
 }
});

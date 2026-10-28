import test from 'node:test';
import assert from 'node:assert/strict';
import { garden } from '../src/feature-games8.js';
test('takeover retains garden progress but excludes preview points from the manual tally',()=>{
 const game=garden();for(let i=0;i<1200;i++)game.update(1/60,true);
 const before=game.snapshot();assert.ok(before.score>0);assert.equal(before.manualScore,0);
 for(let i=0;i<360;i++)game.update(1/60,false);
 const after=game.snapshot();assert.ok(after.score>before.score);assert.equal(after.manualScore,after.score-before.score);assert.ok(after.wave>=before.wave);
 game.reset();assert.equal(game.snapshot().manualScore,0);
});

test('manual dawn shows a seven-second verdict before saving and a twelve-second session result',()=>{
 const saved=[],g=garden(()=>{},{finish:n=>saved.push(n)});for(let i=0;i<54000;i++)g.update(1/60,false);assert.equal(g.snapshot().ended,true);const completedScore=g.snapshot().manualScore;assert.equal(g.isResult(),false);assert.deepEqual(saved,[]);
 for(let i=0;i<419;i++)g.update(1/60,false);assert.equal(g.isResult(),false);assert.deepEqual(saved,[]);g.update(1/60,false);assert.equal(g.isResult(),true);assert.deepEqual(saved,[completedScore]);assert.equal(g.snapshot().waveTime,0);for(let i=0;i<60;i++)g.update(1/60,false);assert.ok(g.snapshot().waveTime>0,'fresh garden runs beneath the result');assert.deepEqual(saved,[completedScore]);
 for(let i=0;i<660;i++)g.update(1/60,false);assert.equal(g.isAttract(),false);g.update(1/60,false);assert.equal(g.isAttract(),true);assert.equal(g.snapshot().wave,1);
});

test('Enter during the verdict waits for the session result; AI restarts after the verdict',()=>{
 const saved=[],manual=garden(()=>{},{finish:n=>saved.push(n)});for(let i=0;i<54000;i++)manual.update(1/60,false);manual.input('Enter',true);manual.input('Enter',false);for(let i=0;i<419;i++)manual.update(1/60,false);assert.equal(manual.snapshot().ended,true);assert.deepEqual(saved,[]);manual.update(1/60,false);assert.equal(manual.isResult(),true);assert.equal(saved.length,1);manual.update(1/60,false);assert.equal(manual.snapshot().ended,false);assert.equal(manual.isAttract(),false);
 const aiSaved=[],ai=garden(()=>{},{finish:n=>aiSaved.push(n)});for(let i=0;i<54000;i++)ai.update(1/60,true);assert.equal(ai.snapshot().ended,true);for(let i=0;i<419;i++)ai.update(1/60,true);assert.equal(ai.snapshot().ended,true);ai.update(1/60,true);assert.equal(ai.snapshot().ended,false);assert.deepEqual(aiSaved,[]);
});

test('Enter tapped during the active run stays queued until the verdict ends',()=>{
 const saved=[],g=garden(()=>{},{finish:n=>saved.push(n)});g.input('Enter',true);g.input('Enter',false);for(let i=0;i<54000;i++)g.update(1/60,false);assert.equal(g.snapshot().ended,true);for(let i=0;i<420;i++)g.update(1/60,false);assert.equal(g.isResult(),true);assert.equal(saved.length,1);g.update(1/60,false);assert.equal(g.isResult(),false);assert.equal(g.snapshot().waveTime,1/60);assert.equal(g.isAttract(),false);
});

test('verdict taps and held keys persist into the fresh result background',()=>{
 const saved=[],g=garden(()=>{},{finish:n=>saved.push(n)});for(let i=0;i<54000;i++)g.update(1/60,false);for(let i=0;i<419;i++)g.update(1/60,false);g.input('ArrowDown',true);g.input('ArrowDown',false);g.input('ArrowRight',true);g.input(' ',true);g.input(' ',false);g.update(1/60,false);assert.equal(g.isResult(),true);const completed=saved[0];g.update(1/60,false);let s=g.snapshot();assert.deepEqual(s.bed,{lane:1,col:1});assert.equal(s.gardener.task?.type,'pea');assert.equal(s.manualScore,0,'background actions do not enter the completed score');g.input('ArrowRight',true);g.update(1/60,false);assert.deepEqual(g.snapshot().bed,{lane:1,col:1},'held key does not create a second tap');g.input('ArrowRight',false);for(let i=0;i<540;i++)g.update(1/60,false);s=g.snapshot();assert.ok(s.plannerCalls>0,'AI resumes after eight idle seconds');assert.deepEqual(saved,[completed]);assert.equal(g.isResult(),true);
});

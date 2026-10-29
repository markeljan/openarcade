import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

async function fixture(lap) {
  let src = await readFile(new URL('../src/feature-games15.js', import.meta.url), 'utf8');
  src = src.replace("import {createGameAudio,unlockSound} from './audio.js';", 'const createGameAudio=()=>({emit(){}}), unlockSound=()=>{};');
  const anchor = '},reset,snapshot(){return structuredClone({grid,p,enemies,level,health,time,lapTime';
  assert.ok(src.includes(anchor));
  src = src.replace(anchor, `},reset,prepareCrossing(l){knownRooms=new Set([0,1,2,3,4,5]);grid=Array.from({length:8},()=>Array(10).fill('.'));p={x:4,y:3};shortcut={x:5,y:3,open:true};lap=l;boot=true;key=false;enemies=[];puzzles=[{kind:'boot',room:0,solved:true,item:{x:1,y:1},runes:[]},{kind:'key',room:1,solved:false,item:{x:7,y:3},runes:[{x:6,y:3,active:false}]}];discoveredRooms=new Set([0,1,2,3,4,5]);ward={phase:'calm',timer:0,next:9999,edge:null,count:0};score=manualScore=0;cool=manualMove=0},snapshot(){return structuredClone({grid,p,enemies,level,health,time,lapTime`);
  const game = (await import('data:text/javascript;base64,' + Buffer.from(src.replaceAll("'./scores/run.js'", JSON.stringify(new URL('../src/scores/run.js',import.meta.url).href))).toString('base64'))).dungeon();
  game.prepareCrossing(lap);
  return game;
}

test('manual shortcut crossing pays only on remembered laps and each crossing', async () => {
  const scout = await fixture(0);
  scout.input('ArrowRight',true);scout.update(0,false);
  assert.equal(scout.snapshot().score, 0);
  const game = await fixture(1);
  game.input('ArrowRight',true);game.update(0,false);
  game.input('ArrowRight', false);
  game.update(8/60, false);
  assert.equal(game.snapshot().manualScore, 15);
  game.update(1, false);
  game.input('ArrowLeft',true);game.update(0,false);
  game.input('ArrowLeft', false);
  game.update(1, false);
  game.input('ArrowRight',true);game.update(0,false);
  game.input('ArrowRight', false);
  game.update(8/60, false);
  assert.equal(game.snapshot().manualScore, 30);
});

test('AI receives remembered crossing progress without writing manual score', async () => {
  const game = await fixture(1);
  game.update(1/60, true);
  game.update(4/60, true);
  assert.deepEqual(game.snapshot().p, {x:5,y:3});
  assert.equal(game.snapshot().score, 15);
  assert.equal(game.snapshot().manualScore, 0);
});

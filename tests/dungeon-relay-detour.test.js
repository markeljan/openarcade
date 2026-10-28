import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
async function fixture() {
 let s=await readFile(new URL('../src/feature-games15.js',import.meta.url),'utf8');
 s=s.replace("import {createGameAudio,unlockSound} from './audio.js';",'const createGameAudio=()=>({emit(){}}), unlockSound=()=>{};');
 const a='},reset,snapshot(){return structuredClone({grid,p,enemies,level,health,time,lapTime'; assert.ok(s.includes(a));
 s=s.replace(a,`},reset,prepare(){knownRooms=new Set([0,1,2,3,4,5]);grid=Array.from({length:19},()=>Array(11).fill('.'));p={x:4,y:9};shortcut={x:5,y:9,open:true};lap=1;boot=key=true;enemies=[];puzzles=[{kind:'boot',solved:true,item:{x:1,y:1},runes:[]},{kind:'key',solved:true,item:{x:1,y:1},runes:[]}];lapRooms=new Set([4]);baselineQueue=[3];discoveredRooms=new Set([0,1,2,3,4,5]);ward={phase:'calm',timer:0,next:9999,edge:null,count:0};score=manualScore=0;cool=manualMove=0},snapshot(){return structuredClone({grid,p,enemies,level,health,time,lapTime`);
 const g=(await import('data:text/javascript;base64,'+Buffer.from(s).toString('base64'))).dungeon();g.prepare();return g;
}
test('baseline manual entry earns detour credit only on first entry in the lap',async()=>{globalThis.__NO_ROUTE_MEMORY=true;try{const g=await fixture();for(let i=0;i<2;i++){g.input('ArrowRight',true);g.update(0,false);g.input('ArrowRight',false);g.update(1,false)}assert.equal(g.snapshot().manualScore,10);assert.ok(g.snapshot().lapRooms.includes(3));g.input('ArrowLeft',true);g.update(0,false);g.input('ArrowLeft',false);g.update(1,false);g.input('ArrowRight',true);g.update(0,false);assert.equal(g.snapshot().manualScore,10)}finally{delete globalThis.__NO_ROUTE_MEMORY}});
test('baseline AI routes around shortcut to its queued unvisited room and earns preview credit',async()=>{globalThis.__NO_ROUTE_MEMORY=true;try{const g=await fixture();for(let i=0;i<180&&!g.snapshot().lapRooms.includes(3);i++)g.update(1/30,true);const s=g.snapshot();assert.ok(s.lapRooms.includes(3));assert.equal(s.score,10);assert.equal(s.manualScore,0)}finally{delete globalThis.__NO_ROUTE_MEMORY}});


import test from 'node:test';
import assert from 'node:assert/strict';
import {dragon} from '../src/feature-games18.js';
import {readFile} from 'node:fs/promises';

test('held manual fire repeats on its cooldown and stops on release',()=>{
 const events=[],g=dragon({firstAct:999},e=>events.push(e));g.input(' ',true);for(let i=0;i<60;i++)g.update(1/60,false);g.input(' ',false);const count=events.filter(e=>e==='dragon-lance').length;assert.ok(count>=6&&count<=7);for(let i=0;i<30;i++)g.update(1/60,false);assert.equal(events.filter(e=>e==='dragon-lance').length,count);
});
test('AI fires a lance when a single target lines up',async()=>{
 let src=await readFile(new URL('../src/feature-games18.js',import.meta.url),'utf8');src=src.replace("import {createGameAudio,unlockSound} from './audio.js';",'const createGameAudio=()=>({emit(){}}), unlockSound=()=>{};');
 const anchor='},reset,isResult(){return !!ended},isAttract(){const value=attract;';
 assert.ok(src.includes(anchor),'Dragon Lock fixture insertion point must exist');
 src=src.replace(anchor,"},reset,fixture(){p={x:120,y:380};enemies=[{x:120,y:230,hp:2,v:0,boss:false,fire:2}];spawn=0;},isResult(){return !!ended},isAttract(){const value=attract;");
 const make=(await import('data:text/javascript;base64,'+Buffer.from(src.replaceAll("'./scores/run.js'", JSON.stringify(new URL('../src/scores/run.js',import.meta.url).href))).toString('base64'))).dragon,events=[],g=make({firstAct:999},e=>events.push(e));g.fixture();g.update(1/60,true);assert.ok(events.includes('dragon-lance'));
});

test('AI releases an existing partial rack when its last target leaves the envelope',async()=>{
 let src=await readFile(new URL('../src/feature-games18.js',import.meta.url),'utf8');src=src.replace("import {createGameAudio,unlockSound} from './audio.js';",'const createGameAudio=()=>({emit(){}}), unlockSound=()=>{};');const anchor='},reset,isResult(){return !!ended},isAttract(){const value=attract;';assert.ok(src.includes(anchor));src=src.replace(anchor,"},reset,fixture(){p={x:120,y:380};const e={x:15,y:230,hp:2,v:0,boss:false,fire:2};enemies=[e];locked=[e];charge=0;lockAge=0;},isResult(){return !!ended},isAttract(){const value=attract;");const make=(await import('data:text/javascript;base64,'+Buffer.from(src.replaceAll("'./scores/run.js'", JSON.stringify(new URL('../src/scores/run.js',import.meta.url).href))).toString('base64'))).dragon,g=make({firstAct:999});g.fixture();g.update(1/60,true);assert.equal(g.snapshot().locks,0);assert.equal(g.snapshot().shots,1);
});

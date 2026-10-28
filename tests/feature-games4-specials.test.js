import test from 'node:test';
import assert from 'node:assert/strict';
import {runeGroups,clearRuneGroups,createFeatureGame4} from '../src/feature-games4.js';

test('four and five rune matches forge stripe and prism pieces',()=>{
 const board=[[0,0,0,0,1],[1,2,3,4,1],[2,3,4,1,1],[3,4,1,2,1],[4,1,2,3,1]];
 clearRuneGroups(board,runeGroups(board));
 assert.equal(board[0][2],5);assert.equal(board[2][4],20);
});
test('matched stripe chains through its whole row',()=>{
 const board=[[0,1,2,3,4],[1,2,3,4,0],[2,5,0,0,1],[3,4,1,2,3],[4,0,2,3,4]];
 let awards=0;clearRuneGroups(board,runeGroups(board),()=>awards++);
 assert.deepEqual(board[2],[null,null,null,null,null]);assert.equal(awards,5);
});
test('Deep Digger autoplay crafts a beacon',t=>{
 const names=['window','ResizeObserver','requestAnimationFrame','cancelAnimationFrame'];const original=Object.fromEntries(names.map(k=>[k,globalThis[k]])),random=Math.random;t.after(()=>{Object.assign(globalThis,original);Math.random=random});let seed=42;Math.random=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/2**32);let id=0,frames=new Map(),texts=[];const noop=()=>{};
 globalThis.window={devicePixelRatio:1};globalThis.ResizeObserver=class{observe(){}disconnect(){}};globalThis.requestAnimationFrame=fn=>{frames.set(++id,fn);return id};globalThis.cancelAnimationFrame=id=>frames.delete(id);
 const ctx=new Proxy({fillText(s){texts.push(s)}},{get:(o,k)=>o[k]??noop,set:(o,k,v)=>(o[k]=v,true)}),canvas={getContext:()=>ctx,getBoundingClientRect:()=>({width:240,height:540}),setAttribute:noop,addEventListener:noop,removeEventListener:noop};
 const game=createFeatureGame4(canvas,'deep-digger');let built=false;for(let f=1;f<=12000&&!built;f++){texts=[];const pending=[...frames.values()];frames.clear();pending.forEach(fn=>fn(f*1000/60));built=texts.some(s=>s.includes('◆'))}game.destroy();assert.ok(built,'autoplay should craft a beacon from gathered materials');
});

test('crossed matches forge a nova',()=>{
 const board=[[1,2,0,3,4],[2,3,0,4,1],[0,0,0,1,2],[3,4,1,2,3],[4,1,2,3,4]];
 clearRuneGroups(board,runeGroups(board));assert.equal(board[2][2],15);
});

test('Deep Digger crafts reference kits and gates the golem at 100 m', async()=>{
 const {miner,minerSupported}=await import('../src/feature-games4.js');const original=Math.random;let seed=42;Math.random=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/2**32);
 try{
  const world=Array.from({length:240},(_,y)=>Array(20).fill(y<3?0:1));world[2][4]=world[2][6]=world[1][5]=4;for(let y=3;y<240;y++){if(y>103&&y%2===0)world[y][5]=11;else if(y>60&&y%6===4)world[y][5]=5;else if(y>22&&y%7===3)world[y][5]=3;else if(y>9&&y%7===0)world[y][5]=2}const game=miner(()=>{},{initialWorld:world,initialPosition:{x:5,y:2}}),labels=[];const settle=()=>{for(let i=0;i<180;i++){const s=game.snapshot();if(!s.stairTransit&&(minerSupported(s.world,s.p.x,s.p.y)||s.p.air>0))return;game.update(1/60,false)}};const ctx=new Proxy({fillText(s){labels.push(s)}},{get:(o,k)=>o[k]??(()=>{}),set:(o,k,v)=>(o[k]=v,true)});
  const snapshot=()=>{labels.length=0;game.draw(ctx);return [...labels]};
  assert.match(snapshot().find(s=>s.includes('PICK')),/PICK 0/);
  for(const d of ['ArrowLeft','ArrowRight','ArrowUp']){game.input('x',true);game.input(d,true);game.input(d,false);game.input('x',false);game.update(3,false)}
  assert.match(snapshot().find(s=>s.includes('PICK')),/PICK 1/,'three mined wood automatically craft a wood pick');
  for(let i=0;i<99;i++){settle();game.input('x',true);game.input('x',true);game.input('ArrowDown',true);game.input('ArrowDown',false);game.input('x',false);for(let j=0;j<30;j++){game.input('x',true);game.update(.1,false)}game.input('x',false);game.input('ArrowDown',true);game.input('ArrowDown',false);game.update(8/60+.001,false);settle()}
  assert.match(snapshot().find(s=>s.startsWith('DEPTH')),/DEPTH 99/);
  assert.match(snapshot().find(s=>s.includes('PICK')),/PICK 4 ◆/,'diamond kit and beacon use mined materials');
  assert.ok(!snapshot().some(s=>s.startsWith('GOLEM ')),'the beacon alone does not spawn the golem before 100 m');
  game.input('x',true);game.input('ArrowDown',true);game.input('ArrowDown',false);game.input('x',false);game.update(3,false);game.update(.2,false);
  assert.ok(snapshot().some(s=>s==='GOLEM 14'),'the beacon and depth unlock the golem');
  for(let i=0;i<100;i++){game.input('x',true);game.update(.05,false)}
  assert.match(snapshot().find(s=>s.startsWith('DEPTH')),/KILLS 1/,'manual attacks can defeat the golem');
 } finally {Math.random=original}
});

test('Deep Digger autoplay builds the beacon and defeats its golem',async()=>{
 const {miner,minerSupported}=await import('../src/feature-games4.js');const original=Math.random;let seed=42;Math.random=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/2**32);
 try{const game=miner(),labels=[];const settle=()=>{for(let i=0;i<180;i++){const s=game.snapshot();if(!s.stairTransit&&(minerSupported(s.world,s.p.x,s.p.y)||s.p.air>0))return;game.update(1/60,false)}};const ctx=new Proxy({fillText(s){labels.push(s)}},{get:(o,k)=>o[k]??(()=>{}),set:(o,k,v)=>(o[k]=v,true)});let defeated=false;for(let i=0;i<60*180&&!defeated;i++){game.update(1/60,true);if(i%60===0){labels.length=0;game.draw(ctx);defeated=labels.some(s=>/KILLS [1-9]/.test(s))}}assert.ok(defeated,'autoplay should reach and defeat the unlocked golem')}finally{Math.random=original}
});

import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createGravityClawGame} from '../src/feature-games15.js';

// Install only a state fixture in an isolated copy; the update code is unchanged.
async function fixtureGame(){
 let src=await readFile(new URL('../src/feature-games15.js',import.meta.url),'utf8');
 src=src.replace("import {createGameAudio,unlockSound} from './audio.js';",'const createGameAudio=()=>({emit(){}}), unlockSound=()=>{};');
 src=src.replace('},reset,snapshot(){return structuredClone({p,props,enemies,projectiles,bolts,held,score,manualScore,height,zone,slots,bossKills',`},reset,fixture(direction){height=200; p={x:120,y:direction==='up'?95:380,vx:0,vy:direction==='up'?-85:85}; enemies=[];props=[];vents=[];projectiles=[{x:80,y:250,vx:60,vy:20,t:2,kind:'crate',mass:1,dmg:1,hp:2,bounces:0,hits:[]}];bolts=[{x:180,y:250,vx:40,vy:20}];},snapshot(){return structuredClone({p,props,enemies,projectiles,bolts,held,score,manualScore,height,zone,slots,bossKills`);
 return (await import('data:text/javascript;base64,'+Buffer.from(src).toString('base64'))).createGravityClawGame();
}
for(const direction of ['up','down'])test(`manual ${direction} scroll preserves flying objects' world positions`,async()=>{
 const g=await fixtureGame();g.fixture(direction);g.input(direction==='up'?'ArrowUp':'ArrowDown',true);const a=g.snapshot();g.update(.02,false);const b=g.snapshot(),scroll=b.height-a.height;
 assert.ok(direction==='up'?scroll>0:scroll<0);
 for(const key of ['projectiles','bolts'])assert.ok(Math.abs(b[key][0].y-(a[key][0].y+scroll+a[key][0].vy*.02))<1e-6,`${key} moves with the world`);
});
test('AI ascent carries flying objects with the scrolling world',()=>{
 const old=Math.random;let seed=42;Math.random=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/2**32);
 try{const g=createGravityClawGame();let checked=0;
  for(let i=0;i<5000&&checked<3;i++){const a=g.snapshot();g.update(.01,true);const b=g.snapshot(),rise=b.height-a.height;if(rise<=0||a.zone!==b.zone)continue;
   for(const key of ['projectiles','bolts']){if(a[key].length!==1||b[key].length!==1)continue;const x=a[key][0],y=b[key][0];if(Math.abs(y.x-(x.x+x.vx*.01))>.01)continue;assert.ok(Math.abs(y.y-(x.y+rise+x.vy*.01))<.01);checked++}}
  assert.ok(checked>=3,'exercise flying objects while climbing');
 }finally{Math.random=old}
});

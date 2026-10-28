import test from 'node:test';
import assert from 'node:assert/strict';
import {dungeon} from '../src/feature-games15.js';
const withSeed=(seed,fn)=>{const old=Math.random;Math.random=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296);try{fn()}finally{Math.random=old}};
const press=(g,k)=>{g.input(k,true);g.input(k,false)};
function travel(g,target){const initialLap=g.snapshot().lap;for(let steps=0;steps<400;steps++){let s=g.snapshot();if(s.lap!==initialLap)return;if(s.p.x===target.x&&s.p.y===target.y)return;const dirs=[[0,-1,'ArrowUp'],[1,0,'ArrowRight'],[0,1,'ArrowDown'],[-1,0,'ArrowLeft']],q=[[s.p.x,s.p.y,[]]],seen=new Set([`${s.p.x},${s.p.y}`]);let path=null;while(q.length){let [x,y,p]=q.shift();if(x===target.x&&y===target.y){path=p;break}for(let [dx,dy,k] of dirs){let nx=x+dx,ny=y+dy,id=`${nx},${ny}`;if(s.grid[ny]?.[nx]==='.'&&!seen.has(id)){seen.add(id);q.push([nx,ny,[...p,k]])}}}assert.ok(path?.length);if(s.enemies.some(e=>Math.abs(e.x-s.p.x)+Math.abs(e.y-s.p.y)<=1))press(g,' ');else press(g,path[0]);g.update(.01,false)}assert.fail('destination not reached')}
test('manual sigils unlock boots and key, warden gates the first lap',()=>withSeed(42,()=>{
 let g=dungeon(),s=g.snapshot();assert.equal(s.boot,false);assert.equal(s.key,false);assert.ok(s.enemies.some(e=>e.kind==='warden'&&e.hp===3));for(let kind of ['boot','key']){const runes=g.snapshot().puzzles.find(p=>p.kind===kind).runes;for(const r of runes){travel(g,r);press(g,'z')}assert.equal(g.snapshot()[kind],true)}
 s=g.snapshot();travel(g,s.goal);s=g.snapshot();assert.equal(s.lap,1);assert.equal(s.splits.length,1);assert.ok(s.ghost.length>1);assert.equal(s.boot,true);assert.equal(s.key,true);assert.ok(s.enemies.some(e=>e.kind==='warden'));
}));
for(const seed of [1,42,123])test(`AI routes three laps on the same maze, then advances floor (seed ${seed})`,()=>withSeed(seed,()=>{
 const g=dungeon();const initial=g.snapshot().grid;for(let i=0;i<6000&&g.snapshot().lap<1;i++)g.update(.033,true);let s=g.snapshot();assert.equal(s.lap,1);assert.deepEqual(s.grid,initial);assert.ok(s.ghost.length>1);for(let i=0;i<6000&&g.snapshot().level<2;i++)g.update(.033,true);s=g.snapshot();assert.equal(s.level,2);assert.equal(s.lap,0);assert.equal(s.boot,false);assert.equal(s.key,false);
}));

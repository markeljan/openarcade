import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
let src=readFileSync(new URL('../src/feature-games15.js',import.meta.url),'utf8').replace("import {createGameAudio,unlockSound} from './audio.js';",'const createGameAudio=()=>({emit(){}}), unlockSound=()=>{};');
src=src.replace('},reset,snapshot(){return structuredClone({grid,p,enemies,level,health,time,lapTime',"},reset,fixtureImpact(){enemies=[{x:p.x+1,y:p.y,nextX:p.x,nextY:p.y,travel:1/60,travelTotal:1/60,hp:1,kind:'guard',room:0,state:'recover',timer:10,chargeLeft:0}]},snapshot(){return structuredClone({grid,p,enemies,level,health,time,lapTime");
const {dungeon}=await import('data:text/javascript;base64,'+Buffer.from(src.replaceAll("'./scores/run.js'", JSON.stringify(new URL('../src/scores/run.js',import.meta.url).href))).toString('base64'));
const withSeed=(seed,fn)=>{const old=Math.random;Math.random=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296);try{fn()}finally{Math.random=old}};
const press=(g,k)=>{g.input(k,true);g.update(0,false);g.input(k,false)};
function travel(g,target){const initialLap=g.snapshot().lap;for(let steps=0;steps<400;steps++){let s=g.snapshot();if(s.lap!==initialLap)return;if(s.p.x===target.x&&s.p.y===target.y)return;const dirs=[[0,-1,'ArrowUp'],[1,0,'ArrowRight'],[0,1,'ArrowDown'],[-1,0,'ArrowLeft']],q=[[s.p.x,s.p.y,[]]],seen=new Set([`${s.p.x},${s.p.y}`]);let path=null;while(q.length){let [x,y,p]=q.shift();if(x===target.x&&y===target.y){path=p;break}for(let [dx,dy,k] of dirs){let nx=x+dx,ny=y+dy,id=`${nx},${ny}`;if(s.grid[ny]?.[nx]==='.'&&!seen.has(id)){seen.add(id);q.push([nx,ny,[...p,k]])}}}assert.ok(path?.length);if(s.enemies.some(e=>Math.abs(e.x-s.p.x)+Math.abs(e.y-s.p.y)<=1))press(g,' ');else press(g,path[0]);g.update(.01,false)}assert.fail('destination not reached')}
test('manual sigils unlock boots and key, warden gates the first lap',()=>withSeed(42,()=>{
 let g=dungeon(),s=g.snapshot();assert.equal(s.boot,false);assert.equal(s.key,false);assert.ok(s.enemies.some(e=>e.kind==='warden'&&e.hp===3));for(let kind of ['boot','key']){const runes=g.snapshot().puzzles.find(p=>p.kind===kind).runes;for(const r of runes){travel(g,r);press(g,'z')}assert.equal(g.snapshot()[kind],false,'solving the vault does not collect its item');travel(g,g.snapshot().puzzles.find(p=>p.kind===kind).item);assert.equal(g.snapshot()[kind],true);if(kind==='boot'){assert.equal(g.snapshot().shortcut.open,false);press(g,'z');assert.equal(g.snapshot().shortcut.open,true)}}
 for(let i=0;i<40&&g.snapshot().enemies.some(e=>e.kind==='warden')&&!g.snapshot().lap;i++){const boss=g.snapshot().enemies.find(e=>e.kind==='warden');travel(g,{x:boss.x,y:boss.y});press(g,' ');for(let j=0;j<14;j++)g.update(1/60,false)}s=g.snapshot();if(!s.lap)travel(g,s.goal);s=g.snapshot();assert.equal(s.lap,1);assert.equal(s.splits.length,1);assert.ok(s.ghost.length>1);assert.equal(s.boot,true);assert.equal(s.key,true);assert.ok(s.relayPause>0);for(let i=0;i<72;i++)g.update(1/60,false);assert.ok(g.snapshot().enemies.some(e=>e.kind==='warden'));
}));
for(const seed of [1,42,123])test(`AI routes three laps on the same maze, then advances floor (seed ${seed})`,()=>withSeed(seed,()=>{
 const g=dungeon();const initial=g.snapshot().grid;for(let i=0;i<6000&&g.snapshot().lap<1;i++)g.update(.033,true);let s=g.snapshot();assert.equal(s.lap,1);assert.equal(s.shortcut.open,true);const original=initial.map(row=>row.slice());original[s.shortcut.y][s.shortcut.x]='.';assert.deepEqual(s.grid,original);assert.ok(s.ghost.length>1);for(let i=0;i<6000&&g.snapshot().level<2;i++)g.update(.033,true);s=g.snapshot();assert.equal(s.level,2);assert.equal(s.lap,0);assert.equal(s.boot,false);assert.equal(s.key,false);
}));


test('manual and AI knockout recovery preserves floor and sigil progress',()=>{for(const auto of [false,true])withSeed(42,()=>{
 const g=dungeon(),r=g.snapshot().puzzles[0].runes[0];travel(g,r);press(g,'z');assert.equal(g.snapshot().puzzles[0].runes[0].active,true);
 for(let attempt=0;attempt<3;attempt++){while(g.snapshot().invulnerable>0)g.update(1/60,false);g.fixtureImpact();g.update(1/60,false)}
 let s=g.snapshot();assert.ok(s.dead>0);assert.equal(s.health,0);const floor=s.level,grid=s.grid;for(let i=0;i<60;i++)g.update(1/60,auto);s=g.snapshot();assert.equal(s.dead,0);assert.equal(s.health,3);assert.equal(s.level,floor);assert.deepEqual(s.grid,grid);assert.equal(s.puzzles[0].runes[0].active,true);
})});

test('slash cooldown prevents repeated hits until the animation ends',()=>{const events=[],g=dungeon(e=>events.push(e));press(g,' ');press(g,' ');assert.equal(events.filter(e=>e==='dungeon-slash').length,1);for(let i=0;i<13;i++)g.update(1/60,false);press(g,' ');assert.equal(events.filter(e=>e==='dungeon-slash').length,2)});

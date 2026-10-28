import test from 'node:test';import assert from 'node:assert/strict';import {maze,racer,meteor,jumper} from '../src/more-games.js';
function labels(game){const out=[];const ctx=new Proxy({fillText(s){out.push(s)}},{get:(o,k)=>o[k]??(()=>{}),set:(o,k,v)=>(o[k]=v,true)});game.draw(ctx);return out}
test('Coin Maze preserves manual completion and AI restarts it',()=>{
 const game=maze();const grid=['###############','#.....#.......#','#.###.#.#####.#','#...#.#.....#.#','###.#.#####.#.#','#...#.....#...#','#.#####.#.###.#','#.......#.....#','###############'].map(s=>s.split(''));let x=1,y=1;grid[y][x]=' ';const dirs=[[1,0,'ArrowRight'],[-1,0,'ArrowLeft'],[0,1,'ArrowDown'],[0,-1,'ArrowUp']];
 while(grid.some(row=>row.includes('.'))){const queue=[[x,y,[]]],seen=new Set([`${x},${y}`]);let route;for(let i=0;i<queue.length&&!route;i++){const [cx,cy,path]=queue[i];if(path.length&&grid[cy][cx]==='.'){route=path;break}for(const d of dirs){const nx=cx+d[0],ny=cy+d[1],k=`${nx},${ny}`;if(grid[ny]?.[nx]&&grid[ny][nx]!=='#'&&!seen.has(k)){seen.add(k);queue.push([nx,ny,[...path,d]])}}}assert.ok(route);for(const [dx,dy,key] of route){x+=dx;y+=dy;game.input(key,true);grid[y][x]=' '}}
 assert.ok(labels(game).includes('MAZE CLEARED — RESTART'));assert.ok(labels(game).includes('COINS 56'));for(let i=0;i<600;i++)game.update(1/60,false);assert.ok(labels(game).includes('COINS 56'));game.input('ArrowRight',true);assert.ok(labels(game).includes('COINS 56'));
 for(let i=0;i<180;i++)game.update(1/60,true);assert.ok(!labels(game).includes('MAZE CLEARED — RESTART'));game.reset();assert.ok(labels(game).includes('COINS 0'));
});
for(const [name,factory,terminal,score,random] of [['Road Runner',racer,'CRASHED — RESTART','PASSED',.5],['Meteor Field',meteor,'SHIP LOST — RESTART','CLEARED',.5],['Jump Dash',jumper,'RUN OVER — RESTART','JUMPS',.5]])test(`${name} holds manual loss and resumes AI`,()=>{
 const orig=Math.random;let calls=0;Math.random=name==='Meteor Field'?()=>calls++%4===0?0:.5:()=>random;try{const game=factory();let found=false;for(let i=0;i<60*45;i++){game.update(1/60,false);if(i%20===0&&labels(game).includes(terminal)){found=true;break}}assert.ok(found,'manual run should end');const saved=labels(game).find(s=>s.startsWith(score));for(let i=0;i<600;i++)game.update(1/60,false);assert.ok(labels(game).includes(terminal));assert.ok(labels(game).includes(saved));for(let i=0;i<180;i++)game.update(1/60,true);assert.ok(!labels(game).includes(terminal));game.reset();assert.ok(!labels(game).includes(terminal))}finally{Math.random=orig}
});
import {pinball,tunnel,balance,laser} from '../src/more-games.js';
for(const [name,factory,terminal,score,random,input] of [
 ['Bumper Ball',pinball,'BALL LOST — RESTART','BOUNCES',.5,'ArrowLeft'],
 ['Tunnel Flight',tunnel,'FLIGHT OVER — RESTART','GATES',0,null],
 ['Balance Box',balance,'BOX LOST — RESTART','BALANCE',.5,null],
 ['Laser Dodge',laser,'HIT — RESTART','DODGED',.5,null],
])test(`${name} retains manual loss and resumes preview`,()=>{
 const orig=Math.random;Math.random=()=>random;try{const game=factory();if(input)game.input(input,true);let found=false;for(let i=0;i<60*60;i++){game.update(1/60,false);if(i%15===0&&labels(game).includes(terminal)){found=true;break}}assert.ok(found,'manual run should end');const saved=labels(game).find(s=>s.startsWith(score));for(let i=0;i<600;i++)game.update(1/60,false);assert.ok(labels(game).includes(terminal));assert.ok(labels(game).includes(saved));for(let i=0;i<180;i++)game.update(1/60,true);assert.ok(!labels(game).includes(terminal),'preview should restart');game.reset();assert.ok(!labels(game).includes(terminal));}finally{Math.random=orig}
});

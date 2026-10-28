import test from 'node:test';
import assert from 'node:assert/strict';
import {createBurrowGame} from '../src/feature-games11.js';

test('Burrow Boss uses fixed shoring sites and nonfatal collision stuns',()=>{
 const game=createBurrowGame();let s=game.snapshot();
 assert.equal(s.traps.length,8);assert.deepEqual(s.traps[0].anchor,{x:5,y:3});assert.equal(s.boss.hp,3);
 game.input('x',true);game.input('x',false);
 for(let i=0;i<800;i++){game.update(1/60,false);s=game.snapshot();if(s.hero.stun)break}
 assert.ok(s.hero.stun>0);assert.equal(s.boss.stun,65);assert.equal(s.boss.retreat,120);assert.equal(s.state,'hunt');
 game.update(200/60,false);s=game.snapshot();assert.equal(s.state,'hunt');assert.equal(s.boss.hp,3);
});

test('a shoring charge must be held at its authored anchor before it can fall',()=>{
 const game=createBurrowGame();
 // Initial player starts at (2.5, 6.5), anchor at (5.5, 3.5).
 game.input('ArrowRight',true);for(let i=0;i<32;i++)game.update(1/60,false);game.input('ArrowRight',false);
 game.input('ArrowUp',true);for(let i=0;i<32;i++)game.update(1/60,false);game.input('ArrowUp',false);
 game.input(' ',true);for(let i=0;i<71;i++)game.update(1/60,false);let s=game.snapshot();assert.equal(s.traps[0].armed,false);
 game.update(1/60,false);s=game.snapshot();assert.equal(s.traps[0].armed,true);game.input(' ',false);
 game.input('z',true);game.input('z',false);s=game.snapshot();assert.equal(s.traps[0].fall,1);assert.equal(s.traps[0].impact,false);
 for(let i=0;i<24;i++)game.update(1/60,false);assert.equal(game.snapshot().traps[0].impact,false);
 game.update(1/60,false);s=game.snapshot();assert.equal(s.traps[0].impact,true);assert.equal(s.boss.rage,300);assert.equal(s.boss.retreat,180);
});

test('taunted monster follows excavated tunnels between lanes',()=>{
 const game=createBurrowGame();game.input('ArrowDown',true);for(let i=0;i<85;i++)game.update(1/60,false);game.input('ArrowDown',false);
 assert.ok(game.snapshot().hero.y>13);game.input('x',true);game.input('x',false);let crossed=false;
 for(let i=0;i<900;i++){game.update(1/60,false);const s=game.snapshot();if(!s.boss.stun)assert.equal(s.grid[Math.floor(s.boss.y)][Math.floor(s.boss.x)],0,'boss must remain in tunnel');if(s.boss.y>10)crossed=true;if(s.hero.stun)break}
 assert.ok(crossed,'monster should pursue via a connecting shaft');
});
test('preview plans a bait and timed cave-in and advances arenas',()=>{
 const game=createBurrowGame();let sawBait=false,sawLure=false,won=false;
 for(let i=0;i<60*120&&!won;i++){game.update(1/60,true);if(i%15===0){const s=game.snapshot();sawBait||=s.plan?.stage==='bait';sawLure||=s.plan?.stage==='lure';won=s.state==='victory'}}
 assert.ok(sawBait&&sawLure,'preview should stage its trap and lure');assert.ok(won,'preview should defeat the monster');
});

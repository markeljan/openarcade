import test from 'node:test';
import assert from 'node:assert/strict';
import {mail} from '../src/feature-games28.js';
function step(game,n,auto=false){for(let i=0;i<n;i++)game.update(1/60,auto)}
function press(game,key){game.input(key,true);game.input(key,false)}
function walkToTray(game){game.input('ArrowRight',true);for(let i=0;i<200;i++){let s=game.snapshot();if(s.p.x>60&&s.p.x<72&&!s.jumping)press(game,' ');if(s.p.x>=115)break;game.update(1/60,false)}game.input('ArrowRight',false);game.input('z',true);step(game,50);game.input('z',false)}
test('manual sorting takes time and movement interrupts the contact',()=>{
 const old=Math.random;Math.random=()=>.5;try{const game=mail();press(game,'x');assert.ok(!game.snapshot().sorted);walkToTray(game);assert.ok(Math.abs(game.snapshot().p.x-120)<18);press(game,'x');assert.equal(game.snapshot().work?.kind,'sort');step(game,5);assert.ok(!game.snapshot().sorted);game.input('ArrowRight',true);step(game,1);game.input('ArrowRight',false);assert.equal(game.snapshot().work,null);assert.ok(!game.snapshot().sorted);for(let i=0;i<3&&!game.snapshot().sorted;i++){press(game,'x');step(game,13)}assert.ok(game.snapshot().sorted)}finally{Math.random=old}
});
test('AI sorts and delivers a six-address manifest',()=>{
 const old=Math.random;let seed=42;Math.random=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/2**32);try{const game=mail();step(game,6000,true);const state=game.snapshot();assert.ok(state.completed>=1);assert.ok(state.score>=6);assert.ok(state.score>=state.completed*6)}finally{Math.random=old}
});
test('a manually sorted letter reaches its matching address',()=>{
 const old=Math.random;Math.random=()=>.5;try{const game=mail();press(game,'x');walkToTray(game);for(let i=0;i<3&&!game.snapshot().sorted;i++){press(game,'x');step(game,13)}assert.ok(game.snapshot().sorted);press(game,'ArrowUp');assert.equal(game.snapshot().p.floor,1);game.input('ArrowRight',true);for(let i=0;i<500;i++){const s=game.snapshot();if(((s.p.x>60&&s.p.x<72)||(s.p.x>140&&s.p.x<151))&&!s.jumping)press(game,' ');if(s.p.x>=182){game.input('ArrowRight',false);game.input('z',true);if(!s.jumping)break}else {game.input('z',false);game.input('ArrowRight',true)}game.update(1/60,false)}game.input('ArrowRight',false);game.input('z',true);assert.ok(Math.abs(game.snapshot().p.x-190)<18);press(game,'x');step(game,13);game.input('z',false);assert.equal(game.snapshot().score,1)}finally{Math.random=old}
});


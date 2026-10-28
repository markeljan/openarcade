import test from 'node:test';
import assert from 'node:assert/strict';
import {createStormRoundup} from '../src/feature-games25.js';
function step(g,n,auto=false){for(let i=0;i<n;i++)g.update(1/60,auto)}
function press(g,key){g.input(key,true);g.input(key,false)}
function go(g,x,y){for(let i=0;i<3000;i++){const {p}=g.snapshot(),dx=x-p.x,dy=y-p.y;if(Math.hypot(dx,dy)<10)break;for(const [key,on] of [['ArrowLeft',dx< -5],['ArrowRight',dx>5],['ArrowUp',dy< -5],['ArrowDown',dy>5]])g.input(key,on);g.update(1/60,false)}for(const key of ['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'])g.input(key,false)}
test('manual grounding and corral require the animal to reach the post and matching pen',()=>{const old=Math.random;Math.random=()=>.5;try{const g=createStormRoundup();step(g,241);const a=g.snapshot().animals[0];go(g,a.x,a.y);press(g,' ');assert.ok(g.snapshot().lasso?.charge);go(g,117,317);press(g,'x');assert.equal(g.snapshot().lasso.charge,true,'animal still trails outside the post');step(g,100);press(g,'x');assert.equal(g.snapshot().lasso.charge,false);go(g,120,475);assert.equal(g.snapshot().score,0,'animal must reach the pen too');step(g,200);assert.equal(g.snapshot().score,1);assert.equal(g.snapshot().lasso,null)}finally{Math.random=old}});
test('AI grounds and corrals animals using proximity rules',()=>{const old=Math.random;Math.random=()=>.5;try{const g=createStormRoundup();step(g,3600,true);const s=g.snapshot();assert.ok(s.grounds>=3);assert.ok(s.score>=2)}finally{Math.random=old}});


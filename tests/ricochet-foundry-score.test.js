import test from 'node:test';
import assert from 'node:assert/strict';
import {foundry} from '../src/feature-games16.js';
const press=(g,k)=>{g.input(k,true);g.input(k,false)};
function route(g,port,dir){let s=g.snapshot();while(s.port<port){press(g,'ArrowRight');s=g.snapshot()}while(s.port>port){press(g,'ArrowLeft');s=g.snapshot()}if(s.dir!==dir)press(g,'ArrowUp');press(g,' ');for(let i=0;i<1200&&g.snapshot().ball;i++)g.update(1/60,false)}
test('manual recipe steps and installation award source points',()=>{const g=foundry();route(g,0,-1);assert.equal(g.snapshot().sessionScore,8);route(g,1,-1);route(g,2,-1);route(g,1,1);assert.equal(g.snapshot().sessionScore,54);g.reset();assert.equal(g.snapshot().sessionScore,0)});
test('preview production does not award manual points',()=>{const g=foundry();for(let i=0;i<12000&&g.snapshot().parts<1;i++)g.update(1/60,true);assert.ok(g.snapshot().parts>=1);assert.equal(g.snapshot().sessionScore,0)});

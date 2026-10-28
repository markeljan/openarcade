import test from 'node:test';
import assert from 'node:assert/strict';
import {foundry} from '../src/feature-games16.js';
const step=(g,n=1200)=>{for(let i=0;i<n&&g.snapshot().ball;i++)g.update(1/60,false)};
const press=(g,k)=>{g.input(k,true);g.input(k,false)};
function route(g,port,dir){let s=g.snapshot();while(s.port<port){press(g,'ArrowRight');s=g.snapshot()}while(s.port>port){press(g,'ArrowLeft');s=g.snapshot()}if(s.dir!==dir)press(g,'ArrowUp');press(g,' ');step(g)}
test('foundry preserves a charge through separate machine launches and installs the order',()=>{
 const g=foundry();route(g,0,-1);assert.equal(g.snapshot().charge.stage,'HEATED');route(g,1,-1);assert.equal(g.snapshot().charge.stage,'SHAPED');route(g,2,-1);assert.equal(g.snapshot().charge.stage,'TEMPERED');route(g,1,1);let s=g.snapshot();assert.equal(s.parts,1);assert.equal(s.order,1);assert.equal(s.charge.stage,'RAW');assert.equal(s.shots,4);
 route(g,0,1);assert.equal(g.snapshot().dependencies,1);route(g,0,1);assert.equal(g.snapshot().dependencies,2);
});
test('wrong-order machine scraps the charge and returns a raw replacement',()=>{
 const g=foundry();press(g,'ArrowUp');press(g,' ');for(let i=0;i<600&&g.snapshot().charge.stage!=='SCRAP';i++)g.update(1/60,false);assert.equal(g.snapshot().charge.stage,'SCRAP');step(g);assert.equal(g.snapshot().charge.stage,'RAW');assert.equal(g.snapshot().pressure,10);
});

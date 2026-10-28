import test from 'node:test';
import assert from 'node:assert/strict';
import {createIceboundAscent} from '../src/feature-games36.js';
test('manual jump permits an airborne directional dash and landing restores it',()=>{
 const g=createIceboundAscent();for(let i=0;i<20;i++)g.update(.05,false);assert.equal(g.snapshot().ground,true);g.input(' ',true);g.input(' ',false);g.input('ArrowUp',true);g.input('x',true);let s=g.snapshot();assert.equal(s.dashes,0);assert.ok(s.p.vy<0);g.input('x',false);g.input('ArrowUp',false);for(let i=0;i<90&&!g.snapshot().ground;i++)g.update(.05,false);assert.equal(g.snapshot().dashes,1);
});
test('AI uses crystals and temporary footholds, reaches checkpoints and completes three rooms',()=>{
 const g=createIceboundAscent();let crumble=false,checkpoint=false,refill=false;for(let i=0;i<12000;i++){g.update(.05,true);const s=g.snapshot();crumble ||= s.platforms.some(p=>p.timer>0||p.gone>0);checkpoint ||= s.checkpoint>0;refill ||= s.crystals.some(c=>c.cooldown>0);if(s.celebrate>0)break}const s=g.snapshot();assert.equal(s.completed,3);assert.equal(s.level,3);assert.ok(s.celebrate>0);assert.ok(crumble);assert.ok(checkpoint);assert.ok(refill);
});

test('grip consumes stamina and a grounded dash is unavailable',()=>{
 const g=createIceboundAscent();for(let i=0;i<20;i++)g.update(.05,false);g.input('x',true);assert.equal(g.snapshot().dashes,1);g.input('x',false);g.input('ArrowLeft',true);for(let i=0;i<20;i++)g.update(.05,false);g.input('ArrowLeft',false);g.input('z',true);g.input('ArrowUp',true);for(let i=0;i<10;i++)g.update(.05,false);assert.ok(g.snapshot().stamina<100);
});

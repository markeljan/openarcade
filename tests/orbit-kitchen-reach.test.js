import test from 'node:test';
import assert from 'node:assert/strict';
import {createKitchen} from '../src/feature-games23.js';
const press=g=>{g.input(' ',true);g.input(' ',false)};
test('manual catch chooses the closest ingredient, including a wrong one',()=>{const old=Math.random;Math.random=()=>0;try{const g=createKitchen(()=>{},{p:{x:120,y:200},ingredients:[{x:138,y:200,kind:0,vx:0,vy:0},{x:123,y:200,kind:2,vx:0,vy:0}]});press(g);const s=g.snapshot();assert.equal(s.notice,'WRONG INGREDIENT');assert.equal(s.ingredients.length,1);assert.equal(s.ingredients[0].kind,0)}finally{Math.random=old}});
test('manual chop only reaches the reference 19.5-unit station radius',()=>{for(const [distance,expected] of [[20,5],[19.5,6]]){const g=createKitchen(()=>{},{p:{x:50+distance,y:220},stage:5,carried:0});press(g);assert.equal(g.snapshot().stage,expected)}});
test('AI toggles magnetic boots near targets and releases them for distant travel while serving',()=>{const cues=[],g=createKitchen(c=>cues.push(c));let on=false,off=false;for(let i=0;i<15000;i++){let before=g.snapshot().boots;g.update(1/60,true);const s=g.snapshot();if(!before&&s.boots)on=true;if(before&&!s.boots)off=true;if(on&&off&&s.served>=2)break}assert.ok(on);assert.ok(off);assert.ok(g.snapshot().served>=2);assert.ok(cues.filter(x=>x==='kitchen-boots').length>=2)});

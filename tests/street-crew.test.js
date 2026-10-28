import test from 'node:test';
import assert from 'node:assert/strict';
import {createRoadsGame} from '../src/feature-games39.js';
const press=(g,k)=>{g.input(k,true);g.input(k,false)};
test('manual crew must connect roads and earn a bridge grant',()=>{const g=createRoadsGame();press(g,'ArrowUp');press(g,' ');let s=g.snapshot();assert.ok(s.grid[4][0]);assert.equal(s.stock,17);press(g,'ArrowUp');press(g,' ');press(g,' ');s=g.snapshot();assert.equal(s.grid[2][0],false);assert.equal(s.notice,'EARN BRIDGE THROUGH DELIVERIES');assert.equal(s.stock,16);press(g,'x');assert.equal(g.snapshot().notice,'DRIVE TO JUNCTION')});
test('preview delivers traffic, earns a bridge and keeps its road network',()=>{const g=createRoadsGame();let initial,bridge=false;for(let i=0;i<30000;i++){g.update(1/60,true);const s=g.snapshot();if(s.district===2&&!initial)initial=s.grid.map(row=>row.slice());if(s.grid[2].some(Boolean))bridge=true;if(s.complete){assert.ok(initial);for(let y=0;y<6;y++)for(let x=0;x<6;x++)if(initial[y][x])assert.ok(s.grid[y][x]);assert.ok(bridge);return}}assert.fail('preview did not complete three districts')});

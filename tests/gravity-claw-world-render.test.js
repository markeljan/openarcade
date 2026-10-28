import test from 'node:test';
import assert from 'node:assert/strict';
import {createGravityClawGame} from '../src/feature-games15.js';
function frame(g){const calls=[],noop=()=>{},ctx=new Proxy({fillRect(x,y,w,h){calls.push([this.fillStyle,x,y,w,h])}},{get:(o,k)=>o[k]??noop,set:(o,k,v)=>(o[k]=v,true)});g.draw(ctx);return calls}
for(const auto of [false,true])test(`${auto?'AI':'manual'} shaft draws built floor, crystals and scrolling structures`,()=>{const g=createGravityClawGame();let before=frame(g);assert.ok(before.some(v=>v[0]==='#0f1720'));assert.ok(before.some(v=>v[0]==='#ffb24d'));if(!auto)g.input('ArrowUp',true);for(let i=0;i<500&&g.snapshot().height<30;i++)g.update(1/60,auto);assert.ok(g.snapshot().height>=30);let after=frame(g);assert.notDeepEqual(after.filter(v=>v[0]==='#2f4d63'),before.filter(v=>v[0]==='#2f4d63'))});

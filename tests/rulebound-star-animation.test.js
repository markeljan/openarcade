import test from 'node:test';import assert from 'node:assert/strict';import {createRuleboundPuzzle} from '../src/feature-games35.js';
function sparkle(g){const hits=[],noop=()=>{},c=new Proxy({fillRect(x,y,w,h){if(x===247&&w===4&&h===4&&c.fillStyle==='#fff7dd')hits.push(y)}},{get:(o,k)=>o[k]??noop,set:(o,k,v)=>(o[k]=v,true)});g.draw(c);return hits}
for(const auto of [false,true])test(`${auto?'AI':'manual'} active star twinkles at the reference cadence`,()=>{const g=createRuleboundPuzzle({seed:0});assert.deepEqual(sparkle(g),[198]);for(let i=0;i<10;i++)g.update(1/60,auto);assert.deepEqual(sparkle(g),[196])});
test('star without WIN has no twinkle',()=>{const g=createRuleboundPuzzle({page:2,seed:0});assert.deepEqual(sparkle(g),[])});

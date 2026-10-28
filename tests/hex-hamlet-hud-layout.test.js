import test from 'node:test';
import assert from 'node:assert/strict';
import { createHexHamlet } from '../src/feature-games35.js';

for (const auto of [false,true]) test(`${auto ? 'AI' : 'manual'} tray presents valley name, fit and reserve in reference order`, () => {
  const game = createHexHamlet();
  if (auto) for (let i=0;i<80;i++) game.update(1/60,true);
  else { game.input('x',true); game.input('x',false); }
  const labels=[],noop=()=>{};
  const c=new Proxy({fillText(text,x,y){labels.push({text,x,y})}},{get:(o,k)=>o[k]??noop,set:(o,k,v)=>(o[k]=v,true)});
  game.draw(c);
  assert.ok(labels.some(v=>v.text==='APPLE VALE'&&v.x===160&&v.y===516));
  assert.ok(labels.some(v=>v.text.startsWith('TILES ')&&v.x===16&&v.y===670));
  assert.ok(labels.some(v=>v.text.startsWith('LAND ')&&v.x===304&&v.y===670));
  assert.ok(labels.some(v=>v.y===628&&v.x===216));
  assert.ok(labels.some(v=>v.y===702));
});

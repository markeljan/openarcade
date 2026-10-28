import test from 'node:test';import assert from 'node:assert/strict';import {createHexHamlet} from '../src/feature-games35.js';
function seeded(fn){const old=Math.random;let seed=1;Math.random=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/2**32);try{fn()}finally{Math.random=old}}
function strokes(g){const out=[],noop=()=>{},c=new Proxy({stroke(){if(['#147d69','#c64a37'].includes(c.strokeStyle))out.push(c.strokeStyle)}},{get:(o,k)=>o[k]??noop,set:(o,k,v)=>(o[k]=v,true)});g.draw(c);return out}
const tap=(g,k)=>{g.input(k,true);g.input(k,false)};
test('manual placement creates a brief visual feedback burst',()=>seeded(()=>{const g=createHexHamlet(),p=g.previewPlan();for(let i=0;i<40&&g.snapshot().selected!==p.key;i++)tap(g,'ArrowRight');for(let i=0;i<6&&g.snapshot().rot!==p.rot;i++)tap(g,'x');const before=strokes(g).length;tap(g,' ');assert.ok(strokes(g).length>before);for(let i=0;i<27;i++)g.update(1/60,false);assert.equal(strokes(g).length,before)}));
test('AI placement displays the same event feedback',()=>seeded(()=>{const g=createHexHamlet();for(let i=0;i<76;i++)g.update(1/60,true);assert.ok(strokes(g).length>0)}));

import test from 'node:test';import assert from 'node:assert/strict';import {pursuit} from '../src/feature-games9.js';
function seed(){let state=7;return()=>((state=(Math.imul(state,1664525)+1013904223)>>>0)/4294967296)}
test('manual driver can break a helicopter pursuit by staying in an alley',()=>{
 const old=Math.random;Math.random=seed();try{const g=pursuit();g.input('ArrowUp',true);let observed=false,escaped;
 for(let i=0;i<2000;i++){g.update(.05,false);const s=g.snapshot();if(s.heli.active){observed=true;g.input('ArrowLeft',true)}if(s.escapes){escaped=s;break}}
 assert.ok(observed);assert.ok(escaped);assert.equal(escaped.heat,17);assert.ok(escaped.decoy);assert.ok(escaped.x<45);
 }finally{Math.random=old}
});
test('AI pursues an alley escape once a helicopter joins the chase',()=>{
 const old=Math.random;Math.random=seed();try{const g=pursuit();let observed=false,escaped=false;
 for(let i=0;i<12000;i++){g.update(.05,true);const s=g.snapshot();observed ||= s.heli.active;if(s.escapes){escaped=true;break}}
 assert.ok(observed);assert.ok(escaped);
 }finally{Math.random=old}
});

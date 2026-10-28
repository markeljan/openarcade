import test from 'node:test';
import assert from 'node:assert/strict';
import {machineHunt, machineHuntAdvanceMortars} from '../src/feature-games.js';

test('mortar telegraphs before landing, follows camera, and can be escaped',()=>{
 const marks=[{x:100,y:100,time:55/60}],hero={x:100,y:110};
 assert.equal(machineHuntAdvanceMortars(marks,hero,.5,10),false);
 assert.equal(marks[0].y,110);
 assert.equal(machineHuntAdvanceMortars(marks,hero,.5),true);
 const escaped=[{x:100,y:100,time:55/60}];
 assert.equal(machineHuntAdvanceMortars(escaped,{x:131,y:100},1),false);
});
test('seeded preview reaches a Thunderjaw warning and moves away from a nearby reticle',()=>{
 const old=Math.random;let seed=1;Math.random=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/2**32);
 try{const game=machineHunt();let warned=false,evaded=false;for(let i=0;i<60*120&&!evaded;i++){const before=game.snapshot();game.update(1/60,true);const after=game.snapshot();if(after.reticles.length)warned=true;const mark=before.reticles.filter(r=>Math.hypot(r.x-before.hero.x,r.y-before.hero.y)<48).sort((a,b)=>Math.hypot(a.x-before.hero.x,a.y-before.hero.y)-Math.hypot(b.x-before.hero.x,b.y-before.hero.y))[0];if(mark){const dx=before.hero.x-mark.x,dy=before.hero.y-mark.y,mx=after.hero.x-before.hero.x,my=after.hero.y-before.hero.y;if(dx*mx+dy*my>0)evaded=true}}assert.ok(warned,'boss should telegraph mortar');assert.ok(evaded,'preview should move away');}finally{Math.random=old}
});

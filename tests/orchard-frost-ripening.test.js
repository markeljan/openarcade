import test from 'node:test';import assert from 'node:assert/strict';import {createOrchardWardens} from '../src/feature-games22.js';
const seeded=()=>{let state=1;return()=>((state=(Math.imul(state,1664525)+1013904223)>>>0)/4294967296)};
test('frost pauses mature graft branch ripening until the chill eases',()=>{
 const random=Math.random;Math.random=seeded();try{const g=createOrchardWardens();let index=-1,s;
 for(let i=0;i<12000;i++){g.update(1/60,true);s=g.snapshot();index=s.trees.findIndex(t=>t.chain===3&&!t.branchFruit&&t.moisture>35&&t.chill>1.5);if(index>=0)break}assert.ok(index>=0,'AI must establish a branch and leave it exposed to frost');
 const before=s.trees[index].branchRipen;let paused=0,resumed=false;for(let i=0;i<60;i++){g.update(1/60,false);const tree=g.snapshot().trees[index];if(tree.chill>=85/60){assert.equal(tree.branchRipen,before,'ripening must stay paused while chill is high');assert.equal(tree.branchFruit,0);paused++}else if(tree.moisture>35&&tree.branchRipen>before){resumed=true;break}}assert.ok(paused>0,'must exercise the chilled interval');assert.ok(resumed,'ripening must resume once chill eases');
 }finally{Math.random=random}
});
test('AI harvests and ships frost-saved fruit in an ordinary orchard run',()=>{
 const random=Math.random;Math.random=seeded();try{const g=createOrchardWardens();let produced=false;
 for(let i=0;i<12000;i++){g.update(1/60,true);const s=g.snapshot();produced ||= s.trees.some(t=>t.savedFruit>0);if(produced&&s.stockedSavedFruit>0)return}
 assert.fail('AI never produced and shipped a frost-saved fruit');
 }finally{Math.random=random}
});

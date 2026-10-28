import test from 'node:test';
import assert from 'node:assert/strict';
import {createSwarmKeeper} from '../src/feature-games8.js';
function run(auto){const old=Math.random;Math.random=()=>0;try{const g=createSwarmKeeper();let previous=0,landmark=false,carrier=false;for(let i=0;i<16000;i++){g.input('x',true);g.update(1/60,auto);const s=g.snapshot(),done=s.challenges.filter(c=>c.done).length;if(done>previous){const c=s.challenges[done-1];if(c.kind==='carry'){assert.equal(s.members.at(-1).role,'carrier');carrier=true;}if(done===4){assert.equal(s.members.at(-1).role,'rescuer');landmark=true;break;}previous=done;}}assert.ok(carrier);assert.ok(landmark);}finally{Math.random=old}}
test('manual crew recruits a carrier and a landmark rescuer',()=>run(false));
test('automatic crew recruits a carrier and a landmark rescuer',()=>run(true));

import test from 'node:test';
import assert from 'node:assert/strict';
import {race} from '../src/feature-games2.js';
const steps=(g,n,auto=false)=>{for(let i=0;i<n;i++)g.update(1/60,auto)};
test('hungry slime rises faster than the normal slime and accelerates',()=>{
 const normal=race({firstCourse:2,modifier:'none'}),hungry=race({firstCourse:2,modifier:'hungry'});steps(normal,100);steps(hungry,100);const n0=normal.snapshot(),h0=hungry.snapshot();steps(normal,60);steps(hungry,60);const n=normal.snapshot(),h=hungry.snapshot();assert.ok(h.slimeY<h0.slimeY);assert.ok(h.slimeSpeed>n.slimeSpeed);assert.ok(n.slimeSpeed>n0.slimeSpeed);
});
test('frenzy hazards span the course and automatic racers make progress',()=>{
 const game=race({firstCourse:1,modifier:'frenzy'});let s=game.snapshot();assert.equal(s.modifier,'frenzy');assert.ok(s.sweepers.length<=4);assert.ok(s.sweepers.every(q=>q.speed>=1.32&&q.speed<=2.04));let advanced=false;for(let i=0;i<60*78;i++){game.update(1/60,true);s=game.snapshot();advanced ||= s.round>0||s.finished>0||s.beans.some(b=>b.minY<400)}assert.ok(advanced);
});


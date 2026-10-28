import test from 'node:test';
import assert from 'node:assert/strict';
import {castle,castlePlanShot} from '../src/feature-games13.js';
test('manual gust warns, becomes live, and bracing does not change its force',()=>{
 const plain=castle(),braced=castle();
 for(let i=0;i<401;i++){plain.update(.05,false);braced.update(.05,false)}
 assert.equal(plain.snapshot().weather.phase,'warn');assert.equal(plain.snapshot().wind,0);
 for(let i=0;i<80;i++){plain.update(.05,false);braced.update(.05,false)}
 assert.equal(plain.snapshot().weather.phase,'live');braced.input('z',true);plain.input(' ',true);braced.input(' ',true);plain.update(.05,false);braced.update(.05,false);
 assert.equal(braced.snapshot().wind,plain.snapshot().wind);assert.equal(braced.snapshot().shot.vx,plain.snapshot().shot.vx);assert.equal(braced.snapshot().weather.brace,true);
 for(let i=0;i<161;i++)plain.update(.05,false);assert.equal(plain.snapshot().weather.phase,'calm');assert.equal(plain.snapshot().wind,0);
});
test('autoplay plays through weather and continues siege',()=>{
 const game=castle();let warned=false,live=false,shot=false;
 for(let i=0;i<720;i++){game.update(.05,true);const s=game.snapshot();warned||=s.weather.phase==='warn';live||=s.weather.phase==='live';shot||=!!s.shot}
 assert.ok(warned&&live&&shot);
});

test('autoplay chooses a trajectory using the forecast gust',()=>{
 const game=castle();let checked=false;
 for(let i=0;i<1600;i++){
  const before=game.snapshot();game.update(.05,true);const after=game.snapshot();
  if(before.phase==='aim'&&after.phase==='flight'&&after.weather.phase==='live'){
   const plan=castlePlanShot(before.turn,before.blocks,after.wind);
   assert.ok(plan);assert.ok(Math.abs(after.angle-plan.angle)<1e-10);checked=true;break;
  }
 }
 assert.ok(checked,'expected an AI launch during a live gust');
 const blocks=castle().snapshot().blocks;
 assert.notEqual(castlePlanShot(1,blocks,-14.76).angle,castlePlanShot(1,blocks,14.76).angle);
});


import test from 'node:test';
import assert from 'node:assert/strict';
import {prism} from '../src/feature-games28.js';
function step(game,seconds,auto=false){for(let t=0;t<seconds*60;t++)game.update(1/60,auto)}
test('a breach needs a deliberate prism turn, aligned mirror and charged lenses',()=>{
 const game=prism();step(game,1.85);assert.equal(game.snapshot().breaches[0].state,'advancing');
 game.input('ArrowLeft',true);step(game,.8);game.input('ArrowLeft',false);game.input(' ',true);game.input(' ',false);
 step(game,.4);assert.equal(game.snapshot().breaches[0].state,'advancing','alignment alone cannot seal a breach');
 for(let i=0;i<3;i++){game.input('x',true);game.input('x',false)}
 step(game,.4);const result=game.snapshot();assert.equal(result.breaches[0].state,'sealed');assert.equal(result.sealed,1);
});
test('an unattended breach ruptures while AI seals all three',()=>{
 const idle=prism();step(idle,6);assert.equal(idle.snapshot().breaches[0].state,'ruptured');assert.ok(idle.snapshot().hp<100);
 const game=prism();step(game,15,true);const result=game.snapshot();assert.equal(result.sealed,3);assert.ok(result.breaches.every(b=>b.state==='sealed'));
});

test('receiver charge follows actual beam contact and mirror settling',()=>{
 const game=prism();let s=game.snapshot();assert.equal(s.lenses[1].reflectPowered,undefined);game.input(' ',true);game.input(' ',false);game.update(1/60,false);s=game.snapshot();assert.ok(s.mirrorAngles[1]>0&&s.mirrorAngles[1]<1,'mirror travels rather than jumping');assert.equal(s.lenses[1].reflectPowered,false);
 step(game,.3);s=game.snapshot();assert.equal(s.mirrorAngles[1],1);assert.equal(s.lenses[1].reflectPowered,true);assert.ok(s.lenses[1].reflect>0);assert.ok(s.beams.some(b=>b.branch===1&&b.bounce===1));
 game.input('x',true);game.input('x',false);step(game,.25);s=game.snapshot();assert.equal(s.lenses[1].splitPowered,false);assert.equal(s.lenses[1].reflectPowered,false);
});

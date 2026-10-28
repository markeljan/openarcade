import test from 'node:test';
import assert from 'node:assert/strict';
import {runeFlipperCounters,createRuneRebound} from '../src/feature-games24.js';
test('raised flipper counters a hex only when its actual segment is touched',()=>{
 const f={side:'left',angle:-.56,on:true}, midpoint={x:86+37*Math.cos(f.angle),y:564+37*Math.sin(f.angle)};
 assert.equal(runeFlipperCounters(midpoint,f),true);
 assert.equal(runeFlipperCounters({...midpoint,y:midpoint.y+30},f),false);
 assert.equal(runeFlipperCounters(midpoint,{...f,on:false}),false);
 assert.equal(runeFlipperCounters(midpoint,{side:'right',angle:Math.PI+.56,on:true}),false);
});
test('automated Rune Rebound continues playing with geometric hex counters',()=>{
 const game=createRuneRebound();for(let i=0;i<60*90;i++)game.update(1/60,true);const s=game.snapshot();assert.ok(s.crests>0);assert.ok(s.hexCountered+s.hexHits>0);
});

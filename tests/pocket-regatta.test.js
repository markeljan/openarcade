import test from 'node:test';
import assert from 'node:assert/strict';
import {createPocketRegatta} from '../src/feature-games24.js';
test('manual helm, trim, ease, tack and yield affect sailing',()=>{
 const g=createPocketRegatta(),start=g.snapshot();g.input('ArrowRight',true);g.input('ArrowUp',true);g.update(.25,false);g.input('ArrowRight',false);g.input('ArrowUp',false);let s=g.snapshot();assert.ok(s.boat.heading>start.boat.heading);assert.ok(s.trim>start.trim);assert.notDeepEqual([s.boat.x,s.boat.y],[start.boat.x,start.boat.y]);
 g.input('x',true);g.update(.2,false);g.input('x',false);assert.ok(g.snapshot().trim<s.trim);g.input(' ',true);assert.ok(g.snapshot().tack>0);g.input('z',true);assert.equal(g.snapshot().yieldTime,0,'yield requires a crossing');
});
test('gust warns before striking and eased sails weather it',()=>{
 const g=createPocketRegatta();for(let i=0;i<52;i++)g.update(.05,false);assert.equal(g.snapshot().gust,'warning');for(let i=0;i<16;i++)g.update(.05,false);const s=g.snapshot();assert.equal(s.gust,'active');assert.equal(s.weathered,1);
});
test('AI rounds four authored courses while rivals sail their own marks',()=>{
 const g=createPocketRegatta();let rivalAdvanced=false;for(let i=0;i<12000&&g.snapshot().course<5;i++){g.update(.05,true);rivalAdvanced ||= g.snapshot().rivals.some(r=>r.mark>0)}const s=g.snapshot();assert.deepEqual(s.completed.slice(0,4),['CEDAR SOUND','NEEDLE REACH','GOLDEN KEYS','MOONWAKE BAY']);assert.ok(rivalAdvanced);assert.ok(s.currents>0);assert.ok(s.weathered>0);
});

test('manual sailor can yield only during a warned rival crossing',()=>{const g=createPocketRegatta();let s;for(let i=0;i<4000;i++){g.update(1/60,false);s=g.snapshot();if(s.crossing)break}assert.ok(s.crossing,'no crossing warning');const heading=s.boat.heading;g.input('z',true);s=g.snapshot();assert.equal(s.rightsYielded,1);assert.equal(s.crossing.yielded,true);assert.notEqual(s.boat.heading,heading);g.input('z',true);assert.equal(g.snapshot().rightsYielded,1,'same crossing was yielded twice');});
test('preview yields to approaching rivals',()=>{const g=createPocketRegatta();let warned=false;for(let i=0;i<5000;i++){g.update(1/60,true);const s=g.snapshot();warned ||= !!s.crossing;if(s.rightsYielded){assert.ok(warned);return}}assert.fail('preview never yielded at a warned crossing');});

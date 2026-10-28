import test from 'node:test';
import assert from 'node:assert/strict';
import {ghost,wing} from '../src/feature-games7.js';

test('Ghost Shift emits one cue at each manual lockdown transition',()=>{
 const events=[],game=ghost(cue=>events.push(cue));
 for(let i=0;i<31*60;i++)game.update(1/60,false);
 assert.equal(events.filter(e=>e==='ghost-lockdown-warning').length,1);
 assert.equal(events.filter(e=>e==='ghost-lockdown-live').length,1);
});

test('Ghost Shift AI cues reflect its pulse, sigil, relay and loot progress',()=>{
 const old=Math.random;Math.random=()=>.5;
 try{const events=[],game=ghost(cue=>events.push(cue));for(let i=0;i<5000;i++)game.update(1/60,true);
 for(const cue of ['ghost-pulse','ghost-sigil','ghost-relay','ghost-loot','ghost-escape'])assert.ok(events.includes(cue),cue);
 }finally{Math.random=old}
});

test('Wingrush emits launch, collision, core and topple events during AI flight',()=>{
 const old=Math.random;Math.random=()=>.5;
 try{const events=[],game=wing(cue=>events.push(cue));for(let i=0;i<5000;i++)game.update(1/60,true);
 for(const cue of ['wing-launch','wing-impact','wing-core','wing-topple'])assert.ok(events.includes(cue),cue);
 }finally{Math.random=old}
});

import test from 'node:test';import assert from 'node:assert/strict';
import {coral,beacon} from '../src/feature-games19.js';
test('Coral Courier emits rescue and full reef restoration cues from actual AI events',()=>{
 const sounds=[],g=coral(s=>sounds.push(s));for(let i=0;i<60*120&&!sounds.includes('coral-reef-restored');i++)g.update(1/60,true);assert.ok(sounds.includes('coral-rescue'));assert.ok(sounds.includes('coral-reef-restored'));assert.ok(g.snapshot().cycles>0);
});
test('Beacon Bay emits crank, bell, dock and convoy cues on actual events',()=>{
 const old=Math.random;let seed=42;Math.random=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/2**32);try{const sounds=[],g=beacon(s=>sounds.push(s));g.input('ArrowLeft',true);for(let i=0;i<6;i++)g.update(1/60,false);g.input('ArrowLeft',false);g.input('ArrowUp',true);for(let i=0;i<12;i++)g.update(1/60,false);g.input('ArrowUp',false);g.input('x',true);g.input('ArrowRight',true);for(let i=0;i<8;i++)g.update(1/60,false);g.input('x',false);g.input('ArrowRight',false);assert.ok(sounds.includes('beacon-crank'));for(let i=0;i<60*240&&!sounds.includes('beacon-convoy-arrival');i++)g.update(1/60,true);for(const cue of ['beacon-bell','beacon-safe-dock','beacon-convoy-arrival'])assert.ok(sounds.includes(cue),cue)}finally{Math.random=old}
});

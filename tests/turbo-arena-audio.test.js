import test from 'node:test';
import assert from 'node:assert/strict';
import {soccer} from '../src/feature-games2.js';
import {createAudioManager} from '../src/audio.js';

test('soccer emits kickoff and bounded impact, pad and collision cues during play',t=>{
 const previous=Math.random;let seed=42;Math.random=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/2**32);t.after(()=>{Math.random=previous});
 const events=[],game=soccer({},event=>events.push(event));for(let i=0;i<60*50;i++)game.update(1/60,true);
 for(const event of ['arena-kickoff','arena-pickup','arena-ball','arena-collision'])assert.ok(events.includes(event),`missing ${event}`);
 assert.ok(events.filter(x=>x==='arena-ball').length<60*50/5,'repeated ball contacts are rate limited');
});
test('arena cues are silent for previews and release audio when paused',()=>{
 let played=0,closed=0;const manager=createAudioManager({storage:{getItem:()=>null,setItem(){}},createContext:()=>({state:'running',currentTime:0,destination:{},createOscillator(){return{frequency:{setValueAtTime(){}},connect(){},start(){played++},stop(){}}},createGain(){return{gain:{setValueAtTime(){},exponentialRampToValueAtTime(){}},connect(){}}},close(){closed++}})});
 manager.setEnabled(true);const preview=manager.session(false);manager.unlock();preview.emit('arena-goal');assert.equal(played,0);const player=manager.session(true);manager.unlock();player.emit('arena-goal');assert.equal(played,1);player.setActive(false);assert.equal(closed,1);player.emit('arena-ball');assert.equal(played,1);player.destroy();preview.destroy();
});

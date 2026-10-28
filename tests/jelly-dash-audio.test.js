import test from 'node:test';
import assert from 'node:assert/strict';
import {race} from '../src/feature-games2.js';
import {createAudioManager} from '../src/audio.js';
test('manual jump and dive and AI races emit bounded Jelly Dash cues',t=>{
 const previous=Math.random;let seed=42;Math.random=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/2**32);t.after(()=>{Math.random=previous});
 const events=[],game=race({sound:event=>events.push(event)});for(let i=0;i<160;i++)game.update(1/60,false);game.input(' ',true);game.input(' ',false);game.input('x',true);game.input('x',false);assert.ok(events.includes('jelly-jump'));assert.ok(events.includes('jelly-dive'));for(let i=0;i<12000;i++)game.update(1/60,true);for(const name of ['jelly-round','jelly-impact','jelly-qualify','jelly-eliminate','jelly-crown'])assert.ok(events.includes(name),`missing ${name}`);assert.ok(events.length<2000,'crowd events must be rate limited');
});
test('jelly cues stay silent in preview and stop while paused',()=>{
 let played=0,closed=0;const manager=createAudioManager({storage:{getItem:()=>null,setItem(){}},createContext:()=>({state:'running',currentTime:0,destination:{},createOscillator(){return{frequency:{setValueAtTime(){}},connect(){},start(){played++},stop(){}}},createGain(){return{gain:{setValueAtTime(){},exponentialRampToValueAtTime(){}},connect(){}}},close(){closed++}})});manager.setEnabled(true);const preview=manager.session(false);manager.unlock();preview.emit('jelly-jump');assert.equal(played,0);const player=manager.session(true);manager.unlock();player.emit('jelly-jump');assert.equal(played,1);player.setActive(false);assert.equal(closed,1);player.emit('jelly-impact');assert.equal(played,1);player.destroy();preview.destroy();
});

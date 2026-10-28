import test from 'node:test';
import assert from 'node:assert/strict';
import {createOrchardWardens} from '../src/feature-games22.js';
const walk=(game,key,seconds)=>{game.input(key,true);for(let i=0;i<seconds*20;i++)game.update(.05,false);game.input(key,false)};
const act=game=>{game.input(' ',true);game.update(.25,false);game.input(' ',false)};
test('nursery scions graft bare stock and pump supplies water',()=>{
 const game=createOrchardWardens();let s=game.snapshot();assert.equal(s.stage,0);assert.equal(s.water,0);assert.equal(s.trees.filter(t=>t.grafted).length,0);
 walk(game,'ArrowLeft',1.1);walk(game,'ArrowDown',.38);act(game);assert.equal(game.snapshot().scion,0);
 walk(game,'ArrowUp',1.26);walk(game,'ArrowRight',.38);act(game);s=game.snapshot();assert.equal(s.trees[0].grafted,true);assert.equal(s.scion,null);
 walk(game,'ArrowRight',1.92);walk(game,'ArrowDown',1.2);act(game);assert.equal(game.snapshot().water,3);
});
test('autoplay harvests three fruit per shipment and opens terraces at one and three crates',()=>{
 const game=createOrchardWardens();let last=0;
 for(let i=0;i<16000;i++){game.update(.05,true);const s=game.snapshot();if(s.shipments!==last){last=s.shipments;assert.equal(s.stage,last>=3?2:last>=1?1:0);if(last>=3)break}}
 const s=game.snapshot();assert.ok(s.shipments>=3);assert.equal(s.stage,2);assert.ok(s.trees.filter(t=>t.grafted).length>=2);assert.equal(s.season,0);
});

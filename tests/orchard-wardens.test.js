import test from 'node:test';
import assert from 'node:assert/strict';
import {createOrchardWardens,orchardMoistureRate} from '../src/feature-games22.js';
const walk=(game,key,seconds)=>{game.input(key,true);for(let elapsed=0;elapsed<seconds*100/261.6;){const dt=Math.min(.01,seconds*100/261.6-elapsed);game.update(dt,false);elapsed+=dt}game.input(key,false)};
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
 let s=game.snapshot();assert.ok(s.shipments>=3);assert.equal(s.stage,2);assert.equal(s.season,0);for(let i=0;i<16000&&s.trees.filter(t=>t.grafted).length<2;i++){game.update(.05,true);s=game.snapshot()}assert.ok(s.trees.filter(t=>t.grafted).length>=2,'AI should eventually graft another tree');
});

test('orchard emits one-time graft, warning and shipment cues',()=>{
 const events=[],game=createOrchardWardens(e=>events.push(e));for(let i=0;i<16000&&!events.includes('gallery');i++)game.update(.05,true);
 assert.ok(events.includes('garden-plant'));assert.ok(events.includes('warning'));assert.ok(events.includes('garden-harvest'));assert.ok(events.includes('gallery'));
});

test('frost front uses reference phase lengths and a stage-dependent clear interval',()=>{const old=Math.random;Math.random=()=>0;try{const g=createOrchardWardens();for(let i=0;i<259;i++)g.update(1/60,false);assert.equal(g.snapshot().weather,'clear');for(let i=0;i<2;i++)g.update(1/60,false);let s=g.snapshot();assert.equal(s.weather,'warning');for(let i=0;i<67;i++)g.update(1/60,false);s=g.snapshot();assert.equal(s.weather,'sweep');assert.ok(s.front>=154&&s.front<160);for(let i=0;i<149;i++)g.update(1/60,false);s=g.snapshot();assert.equal(s.weather,'clear');assert.ok(s.weatherTimer>7.6&&s.weatherTimer<=465/60)}finally{Math.random=old}});
test('AI records opened irrigation channels and shipped special harvests',()=>{const g=createOrchardWardens();let branch=false,saved=false;for(let i=0;i<15000;i++){g.update(1/60,true);const s=g.snapshot();branch ||= s.stockedGraftFruit>0;saved ||= s.stockedSavedFruit>0;if(branch&&saved){assert.ok(s.rowOpen.some(Boolean));break}}assert.ok(branch,'graft fruit should reach the crate');assert.ok(saved,'frost-saved fruit should reach the crate')});


test('manual keeper cannot walk above a locked terrace',()=>{
 const g=createOrchardWardens();walk(g,'ArrowUp',8);assert.equal(g.snapshot().keeper.y,448);
});
test('AI opens terraces and manual movement reaches each new boundary',()=>{
 for(const goal of [1,2]){const g=createOrchardWardens();let s;for(let i=0;i<12000;i++){g.update(.05,true);s=g.snapshot();if(s.stage>=goal)break}assert.ok(s.stage>=goal);walk(g,'ArrowUp',8);assert.equal(g.snapshot().keeper.y,goal===1?300:158)}
});
test('upper rows dry faster and active irrigation reduces moisture loss',()=>{
 assert.equal(orchardMoistureRate(0,0),6.6);assert.ok(Math.abs(orchardMoistureRate(2,0)-8.76)<1e-9);assert.ok(Math.abs(orchardMoistureRate(2,1)-6.06)<1e-9);
});


test('manual keeper moves at reference speed and normalizes diagonal travel',()=>{const g=createOrchardWardens(),start=g.snapshot().keeper;g.input('ArrowRight',true);g.update(.1,false);let pos=g.snapshot().keeper;assert.ok(Math.abs(pos.x-start.x-26.16)<1e-8);g.input('ArrowDown',true);const before={...pos};g.update(.1,false);pos=g.snapshot().keeper;assert.ok(Math.abs(Math.hypot(pos.x-before.x,pos.y-before.y)-26.16)<1e-8)});

test('AI moves at the same speed without overshooting its target',()=>{const g=createOrchardWardens(),start=g.snapshot().keeper,target={x:48,y:642};g.update(.05,true);const pos=g.snapshot().keeper;assert.ok(Math.abs(Math.hypot(pos.x-start.x,pos.y-start.y)-13.08)<1e-8);assert.ok(Math.hypot(pos.x-target.x,pos.y-target.y)<Math.hypot(start.x-target.x,start.y-target.y))});

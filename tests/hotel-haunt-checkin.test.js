import test from 'node:test';
import assert from 'node:assert/strict';
import {hotel,hotelCheckinDelay} from '../src/feature-games13.js';

test('manual check-in warns for four seconds and braces the incoming bellhop',()=>{
 const g=hotel(()=>{}, {firstCheckin:0});g.update(1/60,false);g.input('ArrowRight',true);for(let i=0;i<62;i++)g.update(1/60,false);g.input('ArrowRight',false);g.input(' ',true);g.update(1/60,false);let s=g.snapshot();assert.equal(s.checkin.phase,'warning');assert.equal(s.checkin.braced,true);g.input(' ',false);for(let i=0;i<174;i++)g.update(1/60,false);assert.equal(g.snapshot().checkin.phase,'warning');for(let i=0;i<10;i++)g.update(1/60,false);s=g.snapshot();assert.equal(s.checkin.phase,'live');const bellhop=s.ghosts.find(v=>v.maxHp===78);assert.equal(bellhop.state,'arrival');assert.equal(bellhop.speed,55.2);for(let i=0;i<500&&g.snapshot().ghosts.find(v=>v.maxHp===78).state==='arrival';i++)g.update(1/60,false);s=g.snapshot();const guest=s.ghosts.find(v=>v.maxHp===78);assert.equal(guest.state,'possessed');assert.equal(s.props[guest.dest].ghost,true);assert.equal(s.props[guest.dest].searched,false);
});

test('AI braces for a check-in and continues clearing floors',()=>{
 const g=hotel(()=>{}, {firstCheckin:1});let sawBrace=false,sawArrival=false,advanced=false;for(let i=0;i<60*100;i++){g.update(1/60,true);if(i%3===0){const s=g.snapshot();sawBrace||=s.checkin.phase==='warning'&&s.checkin.braced;sawArrival||=s.ghosts.some(v=>v.state==='arrival');advanced||=s.floor>1;if(sawBrace&&sawArrival&&advanced)break}}assert.ok(sawBrace);assert.ok(sawArrival);assert.ok(advanced);
});


test('seeded check-in lead and repeat follow the reference timing ranges',()=>{
 const reference=(seed,count)=>{const x=count?seed+count*19:seed,y=count?7:17,n=Math.sin(x*127.1+y*311.7)*43758.5453,u=n-Math.floor(n);return ((count?3300:1500)+Math.floor(u*(count?900:600)))/60};for(const seed of [1,42,127,90817])for(const count of [0,1,3]){const actual=hotelCheckinDelay(seed,count);assert.equal(actual,reference(seed,count));assert.ok(count?actual>=55&&actual<70:actual>=25&&actual<35)}assert.notEqual(hotelCheckinDelay(1,0),hotelCheckinDelay(42,0));
});

test('manual warning, brace, arrival and possession emit once at their transitions',()=>{
 const cues=[],g=hotel(c=>cues.push(c),{firstCheckin:0,checkinSeed:42});g.update(1/60,false);assert.deepEqual(cues,['hotel-checkin-warning']);g.input('ArrowRight',true);for(let i=0;i<62;i++)g.update(1/60,false);g.input('ArrowRight',false);g.input(' ',true);for(let i=0;i<250;i++)g.update(1/60,false);g.input(' ',false);for(let i=0;i<400;i++)g.update(1/60,false);for(const cue of ['hotel-checkin-warning','hotel-checkin-brace','hotel-checkin-arrival','hotel-possession'])assert.equal(cues.filter(c=>c===cue).length,1,cue);
});

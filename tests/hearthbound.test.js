import test from 'node:test';
import assert from 'node:assert/strict';
import {createHearthGame,hearthMoveSpeed,hearthNeedsStep} from '../src/feature-games37.js';
function move(g,x,y){for(let i=0;i<600;i++){const p=g.snapshot().people[0],dx=x-p.x,dy=y-p.y;if(Math.hypot(dx,dy)<20)break;for(const [k,on] of [['ArrowLeft',dx < -3],['ArrowRight',dx>3],['ArrowUp',dy < -3],['ArrowDown',dy>3]])g.input(k,on);g.update(.02,false)}for(const k of ['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'])g.input(k,false)}
function action(g){g.input(' ',true);for(let i=0;i<25;i++)g.update(.02,false);g.input(' ',false)}
test('manual builder carries individual logs and installs all three at the shelter',()=>{const g=createHearthGame();for(let i=0;i<3;i++){move(g,50,222);action(g);assert.equal(g.snapshot().people[0].carry,'wood');move(g,86,318);action(g)}const s=g.snapshot();assert.equal(s.buildings.shelter.wood,3);assert.equal(s.buildings.shelter.built,true);assert.equal(s.stock.wood,21)});
test('AI feeds and tends colonists, defends each season and boards the rescue',()=>{const g=createHearthGame(),seen=new Set();for(let i=0;i<20000&&!g.snapshot().rescued;i++){g.update(.033,true);seen.add(g.snapshot().stage)}const s=g.snapshot();assert.deepEqual([...seen],[0,1,2]);assert.equal(s.rescued,true);assert.ok(s.people.every(p=>p.boarded&&p.hp>0&&!p.wounds));assert.ok(Object.values(s.buildings).every(b=>b.built));assert.ok(s.cleared);assert.ok(s.meals>=3);assert.ok(s.tended>=1)});
test('manual rescue requires muster then the assigned seat',()=>{const g=createHearthGame();for(let i=0;i<25000&&g.snapshot().mode!=='rescue';i++)g.update(.033,true);let s=g.snapshot();assert.equal(s.mode,'rescue');assert.ok(!s.people[0].boarded);function approach(point){for(let i=0;i<1600;i++){const p=g.snapshot().people[0],dx=point.x-p.x,dy=point.y-p.y;if(Math.hypot(dx,dy)<1.5)break;for(const [k,on] of [['ArrowLeft',dx<-.8],['ArrowRight',dx>.8],['ArrowUp',dy<-.8],['ArrowDown',dy>.8]])g.input(k,on);g.update(.01,false)}for(const k of ['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'])g.input(k,false)}approach(s.muster[0]);action(g);s=g.snapshot();assert.equal(s.people[0].mustered,true);assert.ok(!s.people[0].boarded);approach(s.cabin[0]);action(g);for(let i=0;i<1000&&!g.snapshot().rescued;i++)g.update(.02,false);s=g.snapshot();assert.ok(s.people[0].boarded);assert.ok(s.rescued,'all three must be seated to complete rescue');});
test('rising flood inundates low ground in pulses and a built levee drains it',()=>{const g=createHearthGame();for(let i=0;i<20000&&g.snapshot().stage<1;i++)g.update(.033,true);assert.equal(g.snapshot().stage,1);move(g,160,570);let s=g.snapshot();assert.ok(!s.buildings.levee.built);for(let i=0;i<600&&!g.snapshot().people[0].floodHits;i++)g.update(.02,false);s=g.snapshot();assert.ok(s.flood.active);assert.ok(s.people[0].floodHits>0,'standing in flood should suffer a pulse');for(let i=0;i<3&&!g.snapshot().buildings.levee.built;i++){if(g.snapshot().people[0].carry!=='wood'){move(g,50,222);action(g)}move(g,162,514);action(g)}s=g.snapshot();assert.ok(s.buildings.levee.built);assert.equal(s.flood.active,false);});
test('AI hero escorts an unmustered colonist before approaching its own muster point',()=>{const g=createHearthGame();for(let i=0;i<25000&&g.snapshot().mode!=='rescue';i++)g.update(.033,true);const before=g.snapshot(),waiting=before.people.slice(1).filter(p=>!p.mustered);assert.ok(waiting.length);const last=waiting.reduce((a,b)=>{const ia=before.people.indexOf(a),ib=before.people.indexOf(b),dist=(p,q)=>Math.hypot(p.x-q.x,p.y-q.y);return dist(a,before.muster[ia])>dist(b,before.muster[ib])?a:b});g.update(.001,true);const target=g.snapshot().people[0].rescueTarget;assert.equal(target.x,last.x-56);assert.equal(target.y,last.y+20);});


test('cold, hunger and wounds affect movement and health before depletion',()=>{
 const a={hp:80,hunger:13,warmth:14,wounds:1};assert.ok(Math.abs(hearthMoveSpeed(a)-95*.63*.78*.7)<1e-9);
 hearthNeedsStep(a,1,{stage:2,sheltered:false,fire:false,levee:false});assert.ok(Math.abs(a.hp-(80-.21-1.14-.96))<1e-9);assert.ok(Math.abs(a.warmth-11.66)<1e-9);
});
test('nearby shelter or fire restores warmth; an empty shelter is not global heat',()=>{
 const exposed={hp:100,hunger:80,warmth:50,wounds:0},warm={...exposed};hearthNeedsStep(exposed,1,{stage:2,sheltered:false,fire:false,levee:true});hearthNeedsStep(warm,1,{stage:2,sheltered:true,fire:false,levee:true});assert.ok(exposed.warmth<50);assert.ok(warm.warmth>50);
 const dead={hp:0,hunger:10,warmth:10,wounds:1};hearthNeedsStep(dead,1,{stage:2,sheltered:false,fire:false,levee:false});assert.deepEqual(dead,{hp:0,hunger:10,warmth:10,wounds:1});
});

test('manual hearth burns independently and a carried log adds fifteen seconds',()=>{
 const g=createHearthGame();let s=g.snapshot();assert.equal(s.fireTime,25);g.update(1,false);assert.equal(g.snapshot().fireTime,24);
 move(g,50,222);action(g);assert.equal(g.snapshot().people[0].carry,'wood');move(g,160,420);const before=g.snapshot().fireTime;action(g);s=g.snapshot();assert.equal(s.people[0].carry,null);assert.ok(s.fireTime>before+14&&s.fireTime<=before+15);assert.equal(s.stock.wood,23);
});
test('AI carries timber to replenish the fire while the colony advances',()=>{
 const g=createHearthGame();let previous=g.snapshot().fireTime,refilled=false;for(let i=0;i<12000;i++){g.update(.033,true);const s=g.snapshot();if(s.fireTime>previous+1){refilled=true;break}previous=s.fireTime}assert.ok(refilled,'builder must feed the independent fire');
});

test('manual colonist can use stocked medicine before clinic completion',()=>{
 const g=createHearthGame();g.input(' ',true);for(let i=0;i<2000;i++){const s=g.snapshot(),p=s.people[0],dx=234-p.x,dy=314-p.y;for(const [k,on] of [['ArrowLeft',dx<-3],['ArrowRight',dx>3],['ArrowUp',dy<-3],['ArrowDown',dy>3]])g.input(k,on);g.update(.01,false);if(g.snapshot().people[0].tended)break}
 const s=g.snapshot();assert.equal(s.buildings.clinic.built,false);assert.equal(s.people[0].tended,1);assert.equal(s.people[2].wounds,0);assert.equal(s.stock.medicine,6);assert.equal(s.stock.clinicMedicine,0);
});
test('AI medic tends the initial wound before clinic completion',()=>{
 const g=createHearthGame();let s;for(let i=0;i<3000;i++){g.update(.01,true);s=g.snapshot();if(s.tended)break}assert.equal(s.buildings.clinic.built,false);assert.equal(s.people[2].wounds,0);assert.equal(s.people[2].tended,1);
});

test('AI medic restocks a two-dose reserve and cook builds a five-meal pantry',()=>{const g=createHearthGame();for(let i=0;i<60*15;i++)g.update(1/60,true);const s=g.snapshot();assert.ok(s.tended>=1,'initial wound was treated');assert.ok(s.stock.clinicMedicine>=2,'medic replaced the used dose and built a reserve');assert.ok(s.stock.medicine<=4,'reserve came from the finite aid pile');assert.ok(s.stock.meals>=5,'cook prepared meals beyond immediate demand')});

test('manual colonist can eat again above 70 hunger while below the reference 99 threshold',()=>{
 const g=createHearthGame();move(g,160,420);
 for(let i=0;i<1500&&g.snapshot().stock.meals<2;i++)g.update(1/60,false);
 assert.ok(g.snapshot().stock.meals>=2,'the cook should stock the hearth');
 g.input(' ',true);for(let i=0;i<9;i++)g.update(1/60,false);g.input(' ',false);
 const afterFirst=g.snapshot();assert.ok(afterFirst.people[0].hunger>70&&afterFirst.people[0].hunger<99);
 g.input(' ',true);for(let i=0;i<9;i++)g.update(1/60,false);g.input(' ',false);
 const afterSecond=g.snapshot();assert.ok(afterSecond.people[0].hunger>afterFirst.people[0].hunger);assert.equal(afterSecond.stock.meals,afterFirst.stock.meals-1);
});

test('a finished rescue holds briefly and starts a fresh settlement in manual play',()=>{
 const g=createHearthGame();for(let i=0;i<20000&&!g.snapshot().rescued;i++)g.update(1/60,true);
 assert.ok(g.snapshot().rescued);const hunger=g.snapshot().people[0].hunger;for(let i=0;i<60;i++)g.update(1/60,false);
 assert.ok(g.snapshot().rescued,'the rescue remains visible during its hold');
 assert.ok(g.snapshot().people[0].hunger<hunger,'colonist needs continue during the result');
 for(let i=0;i<25;i++)g.update(1/60,false);
 const s=g.snapshot();assert.equal(s.rescued,false);assert.equal(s.stage,0);assert.equal(s.notice,'BUILD SHELTER');
});

test('an unattended manual settlement eventually fails and starts a fresh episode',()=>{
 const g=createHearthGame();let loss=false;for(let i=0;i<12000;i++){g.update(1/60,false);if(g.snapshot().notice==='COLONY LOST'){loss=true;break}}
 assert.ok(loss,'loss must occur by the reference episode limit');
 for(let i=0;i<30;i++)g.update(1/60,false);assert.equal(g.snapshot().notice,'COLONY LOST');
 for(let i=0;i<20;i++)g.update(1/60,false);const s=g.snapshot();assert.equal(s.notice,'BUILD SHELTER');assert.equal(s.stage,0);assert.ok(s.episodeTime<1);
});

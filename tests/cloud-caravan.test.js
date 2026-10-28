import test from 'node:test';
import assert from 'node:assert/strict';
import {createCaravanGame} from '../src/feature-games21.js';
function manualStep(g){const s=g.snapshot(),p=s.ship,t=s.target;for(const [k,v] of [['ArrowRight',t.x-p.x-p.vx*1.1>3],['ArrowLeft',t.x-p.x-p.vx*1.1< -3],['ArrowDown',t.y-p.y-p.vy*1.1>3],['ArrowUp',t.y-p.y-p.vy*1.1< -3]])g.input(k,v);if(Math.hypot(t.x-p.x,t.y-p.y)<35)g.input(' ',true);g.update(.02,false)}
test('manual docking transfers manifest one crate at a time',()=>{const g=createCaravanGame(),loads=new Set(),unloads=new Set(),phases=new Set();for(let i=0;i<15000&&g.snapshot().route<1;i++){let s=g.snapshot();if(s.phase==='loading')loads.add(s.cargo);if(s.phase==='dock'){unloads.add(s.cargo);if(s.anchor)phases.add(s.anchor.phase)}manualStep(g)}let s=g.snapshot();assert.equal(s.route,1);for(const n of [0,1,2,3])assert.ok(loads.has(n),`missing load ${n}`);for(const n of [0,1,2,3])assert.ok(unloads.has(n),`missing unload ${n}`);assert.equal(s.delivered,3);if(s.transfers)for(const p of ['casting','tension','hauling'])assert.ok(phases.has(p))});
test('autoplay loads, anchors, and supplies several islands',()=>{const g=createCaravanGame(),phases=new Set();for(let i=0;i<20000&&g.snapshot().route<3;i++){g.update(.033,true);let s=g.snapshot();if(s.anchor)phases.add(s.anchor.phase)}let s=g.snapshot();assert.ok(s.route>=3);assert.ok(s.transfers>0);for(const p of ['casting','tension','hauling'])assert.ok(phases.has(p));assert.ok(s.delivered>=6)});
test('manual delivery persists freight, residents and anchored transfer on the supplied island',()=>{const g=createCaravanGame();for(let i=0;i<15000&&g.snapshot().route<1;i++)manualStep(g);const s=g.snapshot(),island=s.islands.find(i=>i.index===1);assert.equal(s.route,1);assert.equal(island.supplied,true);assert.equal(island.freight,3);assert.equal(island.residents,2+(island.gustDockings?1:0));assert.equal(island.landmarkLevel,1+(island.gustDockings?1:0));assert.equal(island.anchoredFreight,s.transfers);assert.equal(s.origin.index,1);assert.equal(s.target.index,2);assert.equal(s.target.freight,0)});
test('AI keeps recent supplied islands while advancing the route',()=>{const g=createCaravanGame();for(let i=0;i<30000&&g.snapshot().route<5;i++)g.update(.033,true);const s=g.snapshot();assert.ok(s.route>=5);assert.equal(s.islands.length,5);assert.ok(s.islands.slice(0,-1).every(i=>i.supplied&&i.freight>0&&i.landmarkLevel>=1));assert.equal(s.islands.at(-1).supplied,false)});


test('manual and AI pilots can ride a warned gust and improve the destination',()=>{
 for(const auto of [false,true]){const g=createCaravanGame(),phases=new Set();let caught=false;for(let i=0;i<20000&&g.snapshot().route<1;i++){const s=g.snapshot();if(s.gust){phases.add(s.gust.phase);caught ||= s.gust.claimed}if(auto)g.update(.02,true);else manualStep(g)}const s=g.snapshot(),island=s.islands.find(i=>i.index===1);assert.ok(phases.has('warn'));assert.ok(phases.has('active'));assert.ok(caught,'pilot must catch the active gust');assert.equal(s.route,1);assert.equal(island.gustDockings,1);assert.equal(island.residents,3);assert.equal(island.landmarkLevel,2);}
});


test('lightning warns after 108 flight frames and a pilot can clear its aim',()=>{
 const g=createCaravanGame();while(g.snapshot().phase!=='flight')g.update(1/60,false);for(let i=0;i<107;i++)g.update(1/60,false);assert.equal(g.snapshot().storm.phase,'idle');g.update(1/60,false);let s=g.snapshot();assert.equal(s.storm.phase,'charge');assert.ok(Math.abs(s.storm.t-38/60)<1e-8);const health=s.integrity;g.input('ArrowDown',true);for(let i=0;i<38;i++)g.update(1/60,false);g.input('ArrowDown',false);s=g.snapshot();assert.equal(s.storm.phase,'spent');assert.equal(s.strikes,1);assert.equal(s.storm.hit,false);assert.equal(s.integrity,health);assert.equal(s.dodges,1);
});

test('AI reads storm warnings and continues delivering while dodging',()=>{
 const g=createCaravanGame();let warned=false;for(let i=0;i<10000&&(g.snapshot().route<2||!g.snapshot().dodges);i++){g.update(1/60,true);warned ||= g.snapshot().storm.phase==='charge'}const s=g.snapshot();assert.ok(warned);assert.ok(s.dodges>0);assert.ok(s.route>=2);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import {createHexHamlet} from '../src/feature-games35.js';
function seeded(seed,fn){const old=Math.random;Math.random=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296);try{return fn()}finally{Math.random=old}}
const press=(g,k)=>{g.input(k,true);g.input(k,false)};
test('initial landscape is connected and frontier rotation rejects broken waterways',()=>seeded(1,()=>{const g=createHexHamlet(),start=g.snapshot();assert.equal(Object.keys(start.map).length,5);assert.equal(start.reserve,20);assert.equal(start.sizes.R,3);let broken=false;for(let i=0;i<100&&!broken;i++){const s=g.snapshot();if(!s.fit.legal&&s.fit.reason.startsWith('BROKEN')){press(g,' ');const after=g.snapshot();assert.equal(Object.keys(after.map).length,5);assert.equal(after.reserve,20);assert.match(after.notice,/BROKEN/);broken=true}else{press(g,'x');if(i%6===5)press(g,'ArrowRight')}}assert.ok(broken,'expected a broken river or rail edge');}));
test('manual legal placement applies matching score and rough-fit reserve cost',()=>seeded(4,()=>{const g=createHexHamlet();let chosen;for(let i=0;i<150;i++){const s=g.snapshot();if(s.fit.legal&&s.fit.mismatch){chosen=s;break}press(g,'x');if(i%6===5)press(g,'ArrowRight')}assert.ok(chosen,'expected a legal rough fit');press(g,' ');const s=g.snapshot();assert.equal(Object.keys(s.map).length,6);assert.equal(s.reserve,20-1-chosen.fit.mismatch);assert.equal(s.score,chosen.fit.matches*10+chosen.fit.special*10);}));
test('AI connects quest regions and unlocks rail',()=>seeded(9,()=>{const g=createHexHamlet();let found=false;for(let i=0;i<2000;i++){g.update(.05,true);const s=g.snapshot();if(s.unlocked&&s.quests.some(q=>q.done)){found=true;assert.ok(s.sizes.H>=3);break}}assert.ok(found,'AI failed to connect the hamlet quest');}));
test('exchange spends a tile and preserves the three-tile queue',()=>seeded(3,()=>{const g=createHexHamlet(),before=g.snapshot();press(g,'z');const after=g.snapshot();assert.equal(after.reserve,before.reserve-1);assert.equal(after.queue.length,3);assert.deepEqual(after.queue.slice(0,2),before.queue.slice(1));}));

test('manual rotation, illegal placement, rough fit and exchange emit their cues',()=>seeded(4,()=>{
 const sounds=[],g=createHexHamlet(s=>sounds.push(s));press(g,'x');assert.equal(sounds.at(-1),'hex-rotate');let sawBroken=false,placed=false;
 for(let i=0;i<180&&!placed;i++){const state=g.snapshot();if(!state.fit.legal&&!sawBroken){press(g,' ');assert.equal(sounds.at(-1),'hex-broken-edge');sawBroken=true}else if(state.fit.legal&&state.fit.mismatch){press(g,' ');assert.ok(sounds.includes('hex-rough-fit'));placed=true;break}press(g,'x');if(i%6===5)press(g,'ArrowRight')}
 assert.ok(sawBroken&&placed);press(g,'z');assert.equal(sounds.at(-1),'hex-exchanged');
}));
test('AI placement emits join and region cues without planner side effects',()=>seeded(9,()=>{
 const sounds=[],g=createHexHamlet(s=>sounds.push(s));for(let i=0;i<2000&&!g.snapshot().unlocked;i++)g.update(.05,true);assert.ok(g.snapshot().unlocked);assert.ok(sounds.includes('hex-region-grown'));assert.ok(sounds.some(s=>s==='hex-matched'||s==='hex-rough-fit'));
}));

test('manually connecting river lets a boat deliver once for score and a tile',()=>seeded(1,()=>{
 const sounds=[],g=createHexHamlet(s=>sounds.push(s));for(let i=0;i<10&&!['R','B'].includes(g.snapshot().queue[0].type);i++)press(g,'z');let chosen;
 for(let i=0;i<180;i++){const s=g.snapshot();if(s.fit.legal&&s.fit.special){chosen=s;break}press(g,'x');if(i%6===5)press(g,'ArrowRight')}
 assert.ok(chosen);press(g,' ');const placed=g.snapshot(),key=chosen.selected;assert.equal(placed.map[key].serviced,false);for(let i=0;i<4000&&!g.snapshot().deliveries;i++)g.update(.05,false);const delivered=g.snapshot();assert.equal(delivered.deliveries,1);assert.equal(delivered.map[key].serviced,true);assert.equal(delivered.reserve,placed.reserve+1);assert.equal(delivered.score,placed.score+15);assert.ok(sounds.includes('hex-delivery'));for(let i=0;i<1200;i++)g.update(.05,false);assert.equal(g.snapshot().deliveries,1);
}));
test('AI-built routes permit physical boat deliveries',()=>seeded(9,()=>{
 const g=createHexHamlet();for(let i=0;i<2400&&!g.snapshot().deliveries;i++)g.update(.05,true);const s=g.snapshot();assert.ok(s.deliveries>0);assert.ok(s.actors.find(a=>a.id==='boat').crossings>0);
}));

test('AI rail connections allow the train to cross and service a new tile',()=>seeded(1,()=>{
 const g=createHexHamlet();for(let i=0;i<5000&&!g.snapshot().actors.find(a=>a.id==='train').deliveries;i++)g.update(.05,true);const train=g.snapshot().actors.find(a=>a.id==='train');assert.ok(train.crossings>0);assert.ok(train.deliveries>0);
}));

test('travelers follow the reference opening route at 60 ticks per second',()=>seeded(2,()=>{
 const a=createHexHamlet(),b=createHexHamlet();for(let i=0;i<60;i++)a.update(1/60,false);for(let i=0;i<20;i++)b.update(.05,false);const sa=a.snapshot(),sb=b.snapshot(),boat=sa.actors.find(v=>v.id==='boat'),train=sa.actors.find(v=>v.id==='train');assert.ok(Math.abs(boat.x-147.8)<1e-8);assert.ok(Math.abs(train.x-131.98)<1e-8);assert.equal(boat.tile,'-1,0');assert.equal(boat.destination,'0,0');assert.equal(train.tile,'0,-1');assert.equal(train.endpoint,true);assert.equal(sa.deliveries,0);assert.deepEqual(sa.actors,sb.actors);
}));
test('a completed preview episode advances the traveler route cycle; restart resets it',()=>seeded(5,()=>{
 const g=createHexHamlet();for(let i=0;i<20;i++)press(g,'z');assert.equal(g.snapshot().phase,'exhausted');g.update(5,true);assert.equal(g.snapshot().episode,1);g.reset();assert.equal(g.snapshot().episode,0);
}));

test('two-tile AI lookahead changes a greedy rotation without mutating the board',()=>seeded(9,()=>{
 const g=createHexHamlet(),before=g.snapshot(),plan=g.previewPlan();assert.deepEqual(g.snapshot(),before);assert.notDeepEqual({key:plan.key,rot:plan.rot},plan.greedy);assert.ok(Number.isFinite(plan.future));g.update(1.27,true);const after=g.snapshot();assert.equal(after.map[plan.key].rot,plan.rot);assert.equal(Object.keys(after.map).length,Object.keys(before.map).length+1);
}));

test('manual exhausted valleys advance through the reference biome cycle after five seconds',()=>seeded(5,()=>{const g=createHexHamlet();for(const [episode,name] of [[0,'APPLE VALE'],[1,'SUNFLOWER FEN'],[2,'PINE RIDGE']]){let s=g.snapshot();assert.equal(s.episode,episode);assert.equal(s.biome,name);for(let i=0;i<20;i++)press(g,'z');assert.equal(g.snapshot().phase,'exhausted');g.update(4.9,false);assert.equal(g.snapshot().phase,'exhausted');g.update(.1,false)}const s=g.snapshot();assert.equal(s.episode,3);assert.equal(s.biome,'APPLE VALE');assert.equal(s.phase,'build');assert.equal(s.reserve,20)}));

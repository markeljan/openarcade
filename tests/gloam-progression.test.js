import test from 'node:test';
import assert from 'node:assert/strict';
import {createFeatureGame38} from '../src/feature-games38.js';
function harness(interactive){let frame=0,scheduled,labels=[],boat,seed=1;const previous=Math.random;Math.random=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296);const handlers=new Map(),noop=()=>{};globalThis.window={devicePixelRatio:1};globalThis.ResizeObserver=class{observe(){} disconnect(){}};globalThis.requestAnimationFrame=f=>(scheduled=f,1);globalThis.cancelAnimationFrame=noop;const c=new Proxy({fillText(s){labels.push(s)},translate(x,y){boat={x,y}}},{get:(o,k)=>o[k]??noop,set:(o,k,v)=>(o[k]=v,true)}),canvas={getContext:()=>c,getBoundingClientRect:()=>({width:320,height:720}),setAttribute:noop,addEventListener(k,f){handlers.set(k,f)},removeEventListener:noop},game=createFeatureGame38(canvas,'gloam-trawler',{interactive});return {game,close(){game.destroy();Math.random=previous},step(){labels=[];scheduled(++frame*1000/60);return {labels,boat}},key(k,d){handlers.get(d?'keydown':'keyup')({key:k,preventDefault:noop})},press(k){this.key(k,true);this.key(k,false)}}}
test('manual sailor cannot collect an island bell before fitting both tools',()=>{const h=harness(true);try{let s=h.step();for(let i=0;i<500;i++){h.key('ArrowLeft',s.boat.x>96);h.key('ArrowUp',s.boat.y>422);s=h.step();if(s.boat.x<=98&&s.boat.y<=424)break}h.key('ArrowLeft',false);h.key('ArrowUp',false);h.press(' ');s=h.step();assert.ok(s.labels.includes('FIT BOTH TOOLS FIRST'), JSON.stringify(s));assert.ok(s.labels.some(x=>x.includes('RELICS 0/3')));}finally{h.close()}});
test('preview fits both tools before returning each bell',()=>{const h=harness(false);try{let seen=0;for(let i=0;i<10800;i++){const {labels}=h.step(),cargo=labels.find(x=>x.includes('RELICS ')),gear=labels.find(x=>x.startsWith('HULL '));if(!cargo||!gear)continue;const bells=+cargo.match(/RELICS (\d)/)[1],m=/TACKLE (\d)\/3  LIGHT (\d)\/3/.exec(gear);if(bells>seen){assert.equal(bells,seen+1);assert.ok(+m[1]>=bells&&+m[2]>=bells);seen=bells}if(seen===3)break}assert.equal(seen,3,'preview did not deliver three bells');}finally{h.close()}});



import {gloam,gloamSteer} from '../src/feature-games38.js';
test('manual abbey bell needs a nearby lantern reveal that later expires',()=>{
 const old=Math.random;let seed=1;Math.random=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/2**32);try{
  const g=gloam();let s;for(let i=0;i<60*180;i++){g.update(1/60,true);s=g.snapshot();if(s.stage===2&&s.tackle>=3&&s.light>=3)break}assert.equal(s.stage,2);
  for(let i=0;i<600;i++){s=g.snapshot();const dx=130-s.boat.x,dy=130-s.boat.y;if(Math.hypot(dx,dy)<25)break;for(const [k,on] of [['ArrowLeft',dx<-5],['ArrowRight',dx>5],['ArrowUp',dy<-5],['ArrowDown',dy>5]])g.input(k,on);g.update(1/60,false)}for(const k of ['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'])g.input(k,false);
  g.input(' ',true);g.input(' ',false);s=g.snapshot();assert.equal(s.hook,null);assert.equal(s.notice,'X LIGHT REVEALS ABBEY BELL');
  g.update(.31,false);g.input('x',true);g.input('x',false);s=g.snapshot();assert.ok(s.abbeyLight>0);assert.ok(s.beamCd>0);assert.equal(s.beamTime,24/60);assert.deepEqual(s.beamTarget,{x:152,y:156});const cooldown=s.beamCd;g.input('x',true);g.input('x',false);assert.equal(g.snapshot().beamCd,cooldown);assert.match(g.snapshot().notice,/^LANTERN COOLING/);g.input(' ',true);g.input(' ',false);assert.equal(g.snapshot().hook.kind,'relic');assert.equal(g.snapshot().nightForced,800/60);
  g.update(3.1,false);assert.equal(g.snapshot().abbeyLight,0);assert.equal(g.snapshot().beamTime,0);
 }finally{Math.random=old}
});

test('gloam feedback audio follows actual cast and mistimed reel',()=>{
 const old=Math.random;let seed=1;Math.random=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/2**32);try{const cues=[],g=gloam(c=>cues.push(c));g.input('x',true);g.input('x',false);assert.deepEqual(cues,[]);let s;for(let i=0;i<60*60;i++){g.update(1/60,true);s=g.snapshot();if(s.hook)break}assert.ok(s.hook);assert.ok(cues.includes('gloam-cast'));for(let i=0;i<28;i++)g.update(1/60,false);g.input(' ',true);g.input(' ',false);assert.ok(cues.includes('gloam-slip'))}finally{Math.random=old}
});
test('gloam AI sounds track catches, upgrades, bells and abbey light',()=>{
 const old=Math.random;let seed=1;Math.random=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/2**32);try{const cues=[],g=gloam(c=>cues.push(c));for(let i=0;i<60*180;i++){g.update(1/60,true);if(g.snapshot().stage===3)break}for(const cue of ['gloam-cast','gloam-reel','gloam-fish','gloam-sale','gloam-upgrade','gloam-relic','gloam-home','gloam-light'])assert.ok(cues.includes(cue),cue)}finally{Math.random=old}
});

test('manual successful reel hauls for thirteen frames before stowing',()=>{
 const old=Math.random;let seed=1;Math.random=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/2**32);try{const cues=[],g=gloam(c=>cues.push(c));let s;for(let i=0;i<3600;i++){g.update(1/60,true);s=g.snapshot();if(s.hook)break}assert.equal(s.hook.kind,'fish');for(let i=0;i<19;i++)g.update(1/60,false);g.input(' ',true);g.input(' ',false);s=g.snapshot();assert.equal(s.hook.phase,'hauling');assert.equal(s.cargo,0);assert.ok(!cues.includes('gloam-fish'));for(let i=0;i<12;i++)g.update(1/60,false);assert.equal(g.snapshot().cargo,0);g.update(1/60,false);assert.equal(g.snapshot().cargo,2);assert.equal(g.snapshot().hook,null);assert.ok(cues.includes('gloam-fish'));}finally{Math.random=old}
});
test('island schools retain distinct fish values and manual sale pays for the landed fish',()=>{const old=Math.random;Math.random=()=>.5;try{const g=gloam();let s=g.snapshot();assert.deepEqual([0,1,2].map(i=>s.fish.filter(f=>f.island===i).map(f=>f.value)),[Array(6).fill(8),Array(6).fill(12),Array(6).fill(16)]);for(let i=0;i<3600;i++){g.update(1/60,true);s=g.snapshot();if(s.cargo>0&&!s.hook)break}assert.equal(s.cargo,2);const value=s.fish.find(f=>f.inHold).value;for(let i=0;i<1000;i++){s=g.snapshot();const dx=160-s.boat.x,dy=595-s.boat.y;if(Math.hypot(dx,dy)<30&&Math.hypot(s.boat.vx,s.boat.vy)<102)break;for(const [k,on] of [['ArrowLeft',dx< -8],['ArrowRight',dx>8],['ArrowUp',dy< -8],['ArrowDown',dy>8],['z',Math.hypot(dx,dy)<55]])g.input(k,on);g.update(1/60,false)}for(const k of ['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','z'])g.input(k,false);for(let i=0;i<20;i++)g.update(1/60,false);const before=g.snapshot().coins;g.input(' ',true);g.input(' ',false);s=g.snapshot();assert.equal(s.cargo,0);assert.equal(s.coins-before,value);assert.ok(s.fish.some(f=>f.caught&&!f.inHold),'sold fish remain depleted')}finally{Math.random=old}});
test('automatic fishing targets each active island school',()=>{const old=Math.random;let seed=1;Math.random=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/2**32);try{const g=gloam(),seen=new Set();for(let i=0;i<18000;i++){g.update(1/60,true);const s=g.snapshot();if(s.hook?.kind==='fish'){assert.equal(s.hook.item.island,s.stage);seen.add(s.stage)}if(s.stage===3)break}assert.deepEqual([...seen],[0,1,2])}finally{Math.random=old}});

test('automatic relic casts force night and summon the eel',()=>{const old=Math.random;let seed=1;Math.random=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/2**32);try{const g=gloam();let s;for(let i=0;i<12000;i++){g.update(1/60,true);s=g.snapshot();if(s.hook?.kind==='relic')break}assert.equal(s.hook.kind,'relic');assert.ok(s.nightForced>13);for(let i=0;i<5;i++)g.update(1/60,true);assert.ok(['warn','chase','retreat'].includes(g.snapshot().shadow.state))}finally{Math.random=old}});

test('relics occupy the same hold capacity as fish throughout a voyage',()=>{
 const old=Math.random;let seed=1;Math.random=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/2**32);try{const g=gloam();let carried=false;for(let i=0;i<18000;i++){g.update(1/60,true);const s=g.snapshot();const items=s.fish.filter(f=>f.inHold).length+s.relics.filter(r=>r.carried).length;assert.equal(s.cargo,items*2);assert.ok(s.cargo<=6);if(s.relics.some(r=>r.carried)){carried=true;assert.ok(s.cargo>=2)}if(s.stage===3)break}assert.ok(carried)}finally{Math.random=old}
});

test('mistimed reel increases panic and a safe harbor visit clears it',()=>{
 const old=Math.random;let seed=1;Math.random=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/2**32);try{const g=gloam();let s;for(let i=0;i<3600;i++){g.update(1/60,true);s=g.snapshot();if(s.hook?.kind==='fish')break}assert.ok(s.hook);for(let i=0;i<33;i++)g.update(1/60,false);const before=g.snapshot().panic;g.input(' ',true);g.input(' ',false);s=g.snapshot();assert.ok(s.panic>=before+4);assert.equal(s.notice,'LINE SLIP');for(let i=0;i<12000;i++){g.update(1/60,true);s=g.snapshot();if(s.panic===0&&!s.hook&&Math.hypot(s.boat.x-160,s.boat.y-595)<40)break}assert.equal(s.panic,0)}finally{Math.random=old}
});

test('a damaged boat loses its hold and must steer to harbor for repair',()=>{
 const old=Math.random;let seed=1;Math.random=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/2**32);try{const g=gloam();let s;for(let i=0;i<10000;i++){g.update(1/60,true);s=g.snapshot();if(s.stage>=1)break}const delivered=s.stage,tackle=s.tackle,light=s.light;g.input('ArrowUp',true);for(let i=0;i<90;i++)g.update(1/60,false);g.input('ArrowUp',false);for(let i=0;i<36000;i++){g.update(1/60,false);s=g.snapshot();if(s.rescue)break}assert.ok(s.rescue);assert.equal(s.cargo,0);const rescueStart=s.phase,shadowStart={x:s.shadow.x,y:s.shadow.y};for(let i=0;i<120;i++)g.update(1/60,false);s=g.snapshot();assert.ok(s.rescue,'manual boat should not teleport home');assert.notDeepEqual({x:s.shadow.x,y:s.shadow.y},shadowStart,'eel should continue moving during rescue');assert.equal(s.hull,0);assert.ok(s.phase>=rescueStart+1.99,'the tide clock must continue during rescue');assert.equal(s.stage,delivered);assert.equal(s.tackle,tackle);assert.equal(s.light,light);
 for(let i=0;i<2500&&s.rescue;i++){const dx=160-s.boat.x,dy=595-s.boat.y;for(const [k,on] of [['ArrowLeft',dx< -8],['ArrowRight',dx>8],['ArrowUp',dy< -8],['ArrowDown',dy>8]])g.input(k,on);g.update(1/60,false);s=g.snapshot()}assert.equal(s.rescue,0);assert.equal(s.hull,6);assert.equal(s.stage,delivered);
 }finally{Math.random=old}
});

test('AI can steer a damaged vessel back to harbor',()=>{
 const old=Math.random;let seed=1;Math.random=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/2**32);try{const g=gloam();let s;for(let i=0;i<10000;i++){g.update(1/60,true);s=g.snapshot();if(s.stage>=1)break}g.input('ArrowUp',true);for(let i=0;i<90;i++)g.update(1/60,false);g.input('ArrowUp',false);for(let i=0;i<36000;i++){g.update(1/60,false);s=g.snapshot();if(s.rescue)break}assert.ok(s.rescue);for(let i=0;i<3000&&g.snapshot().rescue;i++)g.update(1/60,true);s=g.snapshot();assert.equal(s.rescue,0);assert.equal(s.hull,6)}finally{Math.random=old}
});

test('harbor delivery ends the forced-night pursuit in manual and AI play',()=>{
 const old=Math.random;try{for(const auto of [false,true]){let seed=1;Math.random=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/2**32);const g=gloam();let s;for(let i=0;i<12000;i++){g.update(1/60,true);s=g.snapshot();if(s.relics.some(r=>r.carried)&&s.nightForced>0&&Math.hypot(s.boat.x-160,s.boat.y-595)<80)break}assert.ok(s.relics.some(r=>r.carried));assert.ok(s.nightForced>0);if(auto){for(let i=0;i<1000&&g.snapshot().stage===0;i++)g.update(1/60,true)}else{for(let i=0;i<1000;i++){s=g.snapshot();const dx=160-s.boat.x,dy=595-s.boat.y,d=Math.hypot(dx,dy);if(d<30&&Math.hypot(s.boat.vx,s.boat.vy)<102)break;for(const [k,on] of [['ArrowLeft',dx< -8],['ArrowRight',dx>8],['ArrowUp',dy< -8],['ArrowDown',dy>8],['z',d<55]])g.input(k,on);g.update(1/60,false)}for(const k of ['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','z'])g.input(k,false);for(let i=0;i<15;i++)g.update(1/60,false);g.input(' ',true);g.input(' ',false)}s=g.snapshot();assert.equal(s.stage,1);assert.equal(s.nightForced,0);assert.ok(['deep','retreat'].includes(s.shadow.state));assert.equal(s.panic,0)}}finally{Math.random=old}
});

test('casts choose the nearest eligible fish within the current island school',()=>{
 const old=Math.random;let seed=1;Math.random=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/2**32);try{const g=gloam();let s;for(let i=0;i<3000;i++){g.update(1/60,true);s=g.snapshot();if(s.hook?.kind==='fish')break}assert.ok(s.hook);const chosen=s.hook.item,chosenDistance=Math.hypot(chosen.x-s.boat.x,chosen.y-s.boat.y);for(const f of s.fish.filter(f=>!f.caught&&f.island===s.stage))assert.ok(chosenDistance<=Math.hypot(f.x-s.boat.x,f.y-s.boat.y)+2);assert.equal(chosen.island,s.stage)}finally{Math.random=old}
});

test('manual casts also select the nearest fish',()=>{
 const g=gloam();g.input('ArrowUp',true);for(let i=0;i<20;i++)g.update(1/60,false);g.input('ArrowUp',false);g.input(' ',true);g.input(' ',false);const s=g.snapshot();assert.equal(s.hook?.kind,'fish');const d=Math.hypot(s.hook.item.x-s.boat.x,s.hook.item.y-s.boat.y);for(const f of s.fish.filter(f=>!f.caught&&f.island===s.stage))assert.ok(d<=Math.hypot(f.x-s.boat.x,f.y-s.boat.y)+1e-8);
});

test('voyage display identifies each island and distinguishes its fish schools',()=>{
 const old=Math.random;let seed=1;Math.random=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/2**32);try{const g=gloam(),seen=new Set(),labels=[],colors=new Set(),ctx=new Proxy({fillText(value){labels.push(value)},fill(){colors.add(this.fillStyle)}},{get:(o,k)=>o[k]??(()=>{}),set:(o,k,v)=>(o[k]=v,true)});for(let i=0;i<18000;i++){g.update(1/60,true);const s=g.snapshot();if(!seen.has(s.stage)){labels.length=0;colors.clear();g.draw(ctx);assert.ok(labels.includes(['BELL MARSH','CINDER TEETH','DROWNED ABBEY','ALL BELLS HOME'][s.stage]));if(s.stage===0)for(const color of ['#9dbfb0','#ba7860','#a0e5c9'])assert.ok(colors.has(color));seen.add(s.stage)}if(s.stage===3)break}assert.deepEqual([...seen],[0,1,2,3])}finally{Math.random=old}
});

test('a shoal strike damages the hull once and raises panic',()=>{
 const events=[],g=gloam(e=>events.push(e));g.input('ArrowRight',true);g.input('ArrowUp',true);let s;for(let i=0;i<300;i++){g.update(1/60,false);s=g.snapshot();if(s.notice==='SHOAL STRIKE')break}assert.equal(s.notice,'SHOAL STRIKE');assert.equal(s.hull,5);assert.equal(s.panic,19);assert.equal(events.filter(e=>e==='gloam-hurt').length,1);for(let i=0;i<30;i++)g.update(1/60,false);assert.equal(g.snapshot().hull,5);
});

test('harbor purchases share a seventeen-frame action cooldown in manual and AI play',()=>{
 const old=Math.random;let seed=1;Math.random=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/2**32);try{const g=gloam();let s;for(let i=0;i<8000;i++){g.update(1/60,true);s=g.snapshot();if(s.coins>=16&&s.tackle===0)break}assert.equal(s.coins,16);g.input('z',true);for(let i=0;i<12;i++)g.update(1/60,false);g.input('z',false);g.input('x',true);g.input('x',false);s=g.snapshot();assert.equal(s.tackle,1);assert.equal(s.light,0);g.input('x',true);g.input('x',false);assert.equal(g.snapshot().light,0);for(let i=0;i<17;i++)g.update(1/60,false);g.input('x',true);g.input('x',false);assert.equal(g.snapshot().light,1);
 const events=[],ai=gloam(e=>events.push(e));let first=-1,second=-1;for(let i=0;i<10000;i++){const oldCount=events.length;ai.update(1/60,true);if(events.slice(oldCount).includes('gloam-upgrade')){if(first<0)first=i;else{second=i;break}}}assert.ok(first>=0&&second-first>=17);
 }finally{Math.random=old}
});

test('AI lantern activation displays a timed beam toward its target',()=>{
 const old=Math.random;let seed=1;Math.random=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/2**32);try{const g=gloam();let s;for(let i=0;i<18000;i++){g.update(1/60,true);s=g.snapshot();if(s.beamTime>0)break}assert.ok(s.beamTime>0);assert.ok(Number.isFinite(s.beamTarget.x));const segments=[],ctx=new Proxy({moveTo(x,y){segments.push(['move',x,y])},lineTo(x,y){segments.push(['line',x,y])}},{get:(o,k)=>o[k]??(()=>{}),set:(o,k,v)=>(o[k]=v,true)});g.draw(ctx);assert.ok(segments.some(p=>p[0]==='line'&&p[1]===s.beamTarget.x&&p[2]===s.beamTarget.y));for(let i=0;i<25;i++)g.update(1/60,false);assert.equal(g.snapshot().beamTime,0)}finally{Math.random=old}
});

test('AI returns a critically damaged hull for repair before continuing fishing',()=>{
 const g=gloam();g.input('ArrowRight',true);g.input('ArrowUp',true);let s;for(let i=0;i<5000;i++){g.update(1/60,false);s=g.snapshot();if(s.hull<=2)break}assert.equal(s.hull,2);assert.equal(s.rescue,0);g.input('ArrowRight',false);g.input('ArrowUp',false);for(let i=0;i<1000;i++){g.update(1/60,true);s=g.snapshot();if(s.hull===6)break}assert.equal(s.hull,6);assert.equal(s.rescue,0);assert.ok(Math.hypot(s.boat.x-160,s.boat.y-595)<40);
});

test('AI diverts around the cinder vent while continuing the voyage',()=>{
 const old=Math.random;let seed=1;Math.random=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/2**32);try{const g=gloam();let bypass=false,stage=0;for(let i=0;i<18000;i++){g.update(1/60,true);const s=g.snapshot();if(s.navigation==='vent-bypass'){bypass=true;assert.ok(s.stage<2);assert.ok(s.boat.y>230&&s.boat.y<385)}stage=Math.max(stage,s.stage);if(stage===3)break}assert.ok(bypass);assert.equal(stage,3)}finally{Math.random=old}
});

test('AI pursues the nearest available fish at each active island',()=>{
 const old=Math.random;let seed=1;Math.random=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/2**32);try{const g=gloam(),seen=new Set();for(let i=0;i<18000;i++){const before=g.snapshot();g.update(1/60,true);const after=g.snapshot();if(!before.hook&&after.navigationTarget?.startsWith('fish-')){const options=before.fish.filter(f=>!f.caught&&f.island===before.stage),closest=options.reduce((a,b)=>Math.hypot(a.x-before.boat.x,a.y-before.boat.y)<=Math.hypot(b.x-before.boat.x,b.y-before.boat.y)?a:b);assert.equal(after.navigationTarget,closest.id);seen.add(before.stage)}if(seen.size===3)break}assert.deepEqual([...seen],[0,1,2])}finally{Math.random=old}
});

test('water current drifts a resting manual boat and braking resists it',()=>{
 const old=Math.random;Math.random=()=>.5;try{const free=gloam(),braked=gloam();braked.input('z',true);for(let i=0;i<45;i++){free.update(1/60,false);braked.update(1/60,false)}const a=free.snapshot().boat,b=braked.snapshot().boat;assert.ok(a.y<550);assert.ok(Math.abs(a.x-160)>0.1);assert.ok(Math.hypot(b.x-160,b.y-550)<Math.hypot(a.x-160,a.y-550))}finally{Math.random=old}
});

test('manual steering turns the boat heading gradually and AI uses the same heading',()=>{
 const g=gloam(),initial=g.snapshot().boat.angle;g.input('ArrowRight',true);g.update(1/60,false);let s=g.snapshot();assert.ok(Math.abs(s.boat.angle-initial-.085)<1e-8);for(let i=0;i<20;i++)g.update(1/60,false);s=g.snapshot();assert.ok(Math.abs(s.boat.angle)<.01);const lines=[],ctx=new Proxy({lineTo(x,y){lines.push([x,y])}},{get:(o,k)=>o[k]??(()=>{}),set:(o,k,v)=>(o[k]=v,true)});g.draw(ctx);assert.ok(lines.some(([x,y])=>Math.abs(x-(s.boat.x+Math.cos(s.boat.angle)*16))<1e-8&&Math.abs(y-(s.boat.y+Math.sin(s.boat.angle)*16))<1e-8));
 const ai=gloam(),a=ai.snapshot().boat.angle;for(let i=0;i<60;i++)ai.update(1/60,true);assert.notEqual(ai.snapshot().boat.angle,a);
});

test('boat rendering follows heading and harbor displays the available gear offer',()=>{
 const old=Math.random;let seed=1;Math.random=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/2**32);try{const g=gloam();let s;for(let i=0;i<8000;i++){g.update(1/60,true);s=g.snapshot();if(s.coins>=16&&s.tackle===0)break}assert.ok(s.coins>=16);const labels=[],rotations=[],ctx=new Proxy({fillText(t){labels.push(t)},rotate(a){rotations.push(a)}},{get:(o,k)=>o[k]??(()=>{}),set:(o,k,v)=>(o[k]=v,true)});g.draw(ctx);assert.ok(labels.includes('X TACKLE $8 READY'));assert.ok(rotations.some(a=>Math.abs(a-(s.boat.angle+Math.PI/2))<1e-8))}finally{Math.random=old}
});

test('delivered bells visibly restore their matching island buildings',()=>{
 const old=Math.random;let seed=1;Math.random=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/2**32);try{const g=gloam(),seen=new Set(),rects=[],ctx=new Proxy({fillRect(x,y,w,h){rects.push({x,y,w,h,color:this.fillStyle})}},{get:(o,k)=>o[k]??(()=>{}),set:(o,k,v)=>(o[k]=v,true)}),islands=[[50,474],[268,306],[58,186]];for(let i=0;i<18000;i++){g.update(1/60,true);const s=g.snapshot();if(!seen.has(s.stage)){rects.length=0;g.draw(ctx);for(let j=0;j<3;j++){const [x,y]=islands[j],marker=rects.some(r=>r.x===x-3&&r.y===y-36&&r.w===6&&r.h===8&&r.color==='#f6cd83');assert.equal(marker,s.relics[j].got)}seen.add(s.stage)}if(s.stage===3)break}assert.deepEqual([...seen],[0,1,2,3])}finally{Math.random=old}
});

test('AI steers back toward a displaced line while reeling',()=>{
 const old=Math.random;let seed=1;Math.random=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/2**32);try{const g=gloam();let s;for(let i=0;i<3600;i++){g.update(1/60,true);s=g.snapshot();if(s.hook?.kind==='fish')break}assert.ok(s.hook);const key=s.boat.x>=s.hook.item.x?'ArrowRight':'ArrowLeft';g.input(key,true);for(let i=0;i<30;i++)g.update(1/60,false);g.input(key,false);s=g.snapshot();assert.ok(s.hook);const origin=s.hook.item.origin,before=Math.hypot(s.boat.x-origin.x,s.boat.y-origin.y);for(let i=0;i<8;i++)g.update(1/60,true);s=g.snapshot();assert.ok(s.hook);assert.ok(Math.hypot(s.boat.x-origin.x,s.boat.y-origin.y)<before-1)}finally{Math.random=old}
});

test('AI protects a manually displaced fishing line near a shoal and reels in its central window',()=>{
 const old=Math.random;let seed=1;Math.random=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/2**32);try{const events=[],g=gloam(e=>events.push(e));let s;for(let i=0;i<2000;i++){g.update(1/60,true);s=g.snapshot();if(s.hook?.kind==='fish')break}assert.ok(s.hook);g.input('ArrowLeft',true);g.input('ArrowUp',true);for(let i=0;i<300;i++){g.update(1/60,false);s=g.snapshot();if(!s.hook||Math.hypot(s.boat.x-50,s.boat.y-474)<68)break}g.input('ArrowLeft',false);g.input('ArrowUp',false);assert.ok(s.hook);const distance=Math.hypot(s.boat.x-50,s.boat.y-474);assert.ok(distance<68);let reel=false;for(let i=0;i<40;i++){const n=events.length;g.update(1/60,true);s=g.snapshot();if(events.slice(n).includes('gloam-reel')){assert.ok(s.reelNeedle>=.44&&s.reelNeedle<=.63);reel=true}if(i===7){assert.ok(Math.hypot(s.boat.x-50,s.boat.y-474)>distance);assert.equal(s.hull,6)}if(!s.hook)break}assert.ok(reel)}finally{Math.random=old}
});

test('steering applies rock repulsion even when the line origin is the current position',()=>{const boat={x:110,y:500,vx:0,vy:0},intent=gloamSteer(boat,{x:110,y:500});assert.ok(intent.dx>0);assert.ok(intent.dy>0)});

test('map marks unavailable relics locked and reveals a ready bell after fitting gear',()=>{
 const old=Math.random;let seed=1;Math.random=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/2**32);try{const g=gloam(),rects=[],ctx=new Proxy({fillRect(x,y,w,h){rects.push({x,y,w,h,color:this.fillStyle})}},{get:(o,k)=>o[k]??(()=>{}),set:(o,k,v)=>(o[k]=v,true)});g.draw(ctx);assert.ok(rects.some(r=>r.x===91&&r.y===420&&r.w===10&&r.color==='#718780'));let s;for(let i=0;i<8000;i++){g.update(1/60,true);s=g.snapshot();if(s.stage===0&&s.tackle>=1&&s.light>=1&&!s.relics[0].carried)break}assert.equal(s.stage,0);assert.ok(s.tackle>=1&&s.light>=1);rects.length=0;g.draw(ctx);assert.ok(rects.some(r=>r.x===92&&r.y===417&&r.w===8&&r.color==='#f6cd83'))}finally{Math.random=old}
});

test('homecoming continues the tide and sends the eel away during celebration',()=>{
 const old=Math.random;let seed=1;Math.random=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/2**32);try{const g=gloam();let s;for(let i=0;i<18000;i++){g.update(1/60,true);s=g.snapshot();if(s.finish)break}assert.ok(s.finish);const start=s.phase;for(let i=0;i<30;i++)g.update(1/60,false);s=g.snapshot();assert.ok(s.finish);assert.ok(s.phase>=start+.49);assert.equal(s.shadow.state,'retreat')}finally{Math.random=old}
});

test('harbor action notices expire after one hundred frames',()=>{
 const g=gloam();g.input('ArrowDown',true);for(let i=0;i<20;i++)g.update(1/60,false);g.input('ArrowDown',false);g.input('z',true);g.input('x',true);g.input('x',false);let s=g.snapshot();assert.equal(s.notice,'MORE COINS NEEDED');assert.equal(s.noticeClock,100/60);for(let i=0;i<99;i++)g.update(1/60,false);assert.equal(g.snapshot().notice,'MORE COINS NEEDED');g.update(1/60,false);s=g.snapshot();assert.equal(s.notice,'');assert.equal(s.noticeClock,0);
});

test('restoring bells changes the three regional water palettes',()=>{
 const old=Math.random;let seed=1;Math.random=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/2**32);try{const g=gloam(),seen=new Set(),colors=new Set(),ctx=new Proxy({fill(){colors.add(this.fillStyle)}},{get:(o,k)=>o[k]??(()=>{}),set:(o,k,v)=>(o[k]=v,true)});for(let i=0;i<18000;i++){g.update(1/60,true);const s=g.snapshot();if(!seen.has(s.stage)){colors.clear();g.draw(ctx);assert.ok(colors.has(s.stage>0?'#497f77':'#3f5d60'));assert.ok(colors.has(s.stage>1?'#405b69':'#4e495a'));assert.ok(colors.has(s.stage>2?'#507f82':'#35495e'));seen.add(s.stage)}if(s.stage===3)break}assert.deepEqual([...seen],[0,1,2,3])}finally{Math.random=old}
});

test('manual light explains the missing lantern instead of silently doing nothing',()=>{
 const events=[],g=gloam(e=>events.push(e));g.input('x',true);g.input('x',false);const s=g.snapshot();assert.equal(s.notice,'BUY A LANTERN AT HARBOR');assert.equal(s.beamTime,0);assert.ok(!events.includes('gloam-light'));
});

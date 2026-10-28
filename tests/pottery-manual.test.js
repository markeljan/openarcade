import test from 'node:test';
import assert from 'node:assert/strict';
import {createPotteryHouse} from '../src/feature-games20.js';

const points={clay:[42,402],wheel:[114,393],glaze:[189,357],ash:[189,409],water:[30,296],kiln:[166.5,243],vent:[213,192],wood:[208.5,280.5],shelf:[61.5,186]};
function go(g,name){const [x,y]=points[name];for(const [axis,target,minus,plus] of [['x',x,'ArrowLeft','ArrowRight'],['y',y,'ArrowUp','ArrowDown']]){let n=0;while(Math.abs(g.snapshot().hero[axis]-target)>1.12&&n++<1000){const diff=target-g.snapshot().hero[axis],key=diff<0?minus:plus;g.input(key,true);g.update(1/60,false);g.input(key,false)}}}
function work(g,name,key=' '){go(g,name);g.input(key,true);for(let i=0;i<20;i++)g.update(1/60,false);g.input(key,false)}

test('manual firing and ash cooling can reach gallery using keyboard actions',()=>{
 const g=createPotteryHouse();for(const station of ['clay','wheel','glaze','ash','wood','kiln'])work(g,station);
 assert.ok(g.snapshot().kiln.baking);assert.equal(g.snapshot().kiln.curve.phase,'rising');assert.equal(g.snapshot().kiln.baking.ash.batch,1);
 for(let i=0;i<1500&&g.snapshot().kiln.soak<76;i++){
  const s=g.snapshot();
  if(s.kiln.fuel<2)work(g,'wood');
  else if(s.kiln.temp>=76&&!s.kiln.curve.vented)work(g,'vent','Shift');
  else if(s.kiln.vent&&s.kiln.temp<65)work(g,'vent','Shift');
  else g.update(1/60,false);
 }
 assert.ok(g.snapshot().kiln.soak>=76,'kiln reaches firing completion');
 for(let i=0;i<20;i++)g.update(1/60,false);const firing=g.snapshot();assert.ok(firing.kiln.soak>76);const labels=[];const canvas=new Proxy({fillText:(label)=>labels.push(label)},{get:(obj,key)=>key in obj?obj[key]:()=>{},set:(obj,key,value)=>(obj[key]=value,true)});g.draw(canvas);assert.ok(labels.includes(`ASH FIRING ${Math.round(firing.kiln.soak/76*100)}%`));assert.ok(labels.includes(`PEAK ${Math.round(firing.kiln.curve.peak)}  BLOOM ${Math.floor(firing.kiln.curve.bloom)}/8  STRESS ${Math.floor(firing.kiln.curve.stress)}/24`));
 const bars=[];let color='';const gaugeCanvas=new Proxy({fillRect(x,y,w,h){bars.push({x,y,w,h,color})}},{get:(o,k)=>k==='fillStyle'?color:o[k]??(()=>{}),set:(o,k,v)=>{if(k==='fillStyle')color=v;else o[k]=v;return true}});g.draw(gaugeCanvas);assert.ok(bars.some(b=>b.x===123&&b.y===277&&b.w===68&&b.color==='#5eb9a4'),'soak indicator caps at full width');assert.ok(bars.some(b=>b.x===123&&b.y===283&&b.w>0&&b.color==='#f5e0bd'),'ash heat indicator advances');if(firing.kiln.curve.vented)assert.ok(bars.some(b=>b.x===123&&b.y===281&&b.w>0&&b.color==='#f4bb61'),'vented bloom indicator advances');
 assert.ok(bars.some(b=>b.x===144&&b.y===188&&b.color==='#a18786'),'heated ash glaze has a kiln glow');go(g,'kiln');g.input(' ',true);g.update(1/60,false);bars.length=0;g.draw(gaugeCanvas);assert.ok(bars.some(b=>b.x===189&&b.y===209&&b.color==='#241a20'),'door opens while working at kiln');g.input(' ',false);
 work(g,'kiln');assert.equal(g.snapshot().hero.carry.state,'cooling');
 const hot=[];let hotColor='';const hotCtx=new Proxy({fillRect(x,y,w,h){hot.push({x,y,w,h,color:hotColor})}},{get:(o,k)=>k==='fillStyle'?hotColor:o[k]??(()=>{}),set:(o,k,v)=>{if(k==='fillStyle')hotColor=v;else o[k]=v;return true}});g.draw(hotCtx);const hotHero=g.snapshot().hero,hotX=hotHero.x+hotHero.facing*13;assert.ok(hot.some(p=>p.x===hotX-1&&p.y===hotHero.y-16&&p.color==='#f26d3d'),'hot carried pottery visibly steams');
 go(g,'water');g.input('z',true);g.update(1/60,false);hot.length=0;g.draw(hotCtx);assert.ok(hot.some(p=>p.x===29&&p.y===278&&p.color==='#e6d8f4'),'hot ash produces cooling sparkles while working at water');g.input('z',false);
 work(g,'water','z');assert.equal(g.snapshot().hero.carry.state,'fired');assert.ok(g.snapshot().hero.carry.ash.crystals>=2);assert.ok(g.snapshot().hero.carry.ash.cooling>=11);
 work(g,'shelf');const s=g.snapshot();assert.equal(s.completed,1);assert.equal(s.shelf[0].iridescent,true);assert.equal(s.shelf[0].ash.phase,'revealed');assert.ok(s.shelf[0].ash.crystals>=2);
});


test('holding interact repeats vent operations at the station interval',()=>{
 const old=Math.random;Math.random=()=>.999;try{const g=createPotteryHouse();go(g,'vent');g.input('Shift',true);for(let i=0;i<20;i++)g.update(1/60,false);
 assert.equal(g.snapshot().kiln.vent,0,'two completed operations toggle the vent twice');for(let i=0;i<4;i++)g.update(1/60,false);assert.equal(g.snapshot().kiln.vent,1);g.input('Shift',false);
 }finally{Math.random=old}
});


test('an active draft adds heat beyond raising the kiln target',()=>{
 const g=createPotteryHouse();let before;
 for(let i=0;i<400;i++){const s=g.snapshot();if(s.hazard.phase==='active'&&s.hazard.kind==='draft'){before=s;break}g.update(1/60,false)}
 assert.ok(before,'draft reaches its active phase');g.update(1/60,false);const after=g.snapshot();
 const target=48+after.kiln.fuel*8-after.kiln.vent*17+14;
 const withoutGust=before.kiln.temp+(target-before.kiln.temp)*.032;
 assert.ok(after.kiln.temp>withoutGust+.4,'draft injects additional heat');
});

test('HUD counts displayed masterworks even after the shelf rotates',()=>{
 const old=Math.random;Math.random=()=>.37;try{const g=createPotteryHouse();let previous=0,master=0;
 for(let i=0;i<150000;i++){g.update(1/60,true);const s=g.snapshot();if(s.completed>previous){if(s.shelf.at(-1)?.quality==='masterwork')master++;previous=s.completed}if(s.completed>=20)break}
 const s=g.snapshot();assert.ok(s.completed>=20);assert.ok(master>0);assert.equal(s.masterworks,master);assert.equal(s.shelf.length,18);
 const labels=[];const canvas=new Proxy({fillText:(label)=>labels.push(label)},{get:(obj,key)=>key in obj?obj[key]:()=>{},set:(obj,key,value)=>(obj[key]=value,true)});g.draw(canvas);assert.ok(labels.includes(`GALLERY ${s.completed}    MASTER ${master}`));
 g.reset();assert.equal(g.snapshot().masterworks,0);
 }finally{Math.random=old}
});


test('first hazard begins within the reference warning interval',()=>{
 const old=Math.random;try{for(const value of [0,.999]){Math.random=()=>value;const g=createPotteryHouse();assert.ok(g.snapshot().hazard.next>=174/60&&g.snapshot().hazard.next<=210/60)}}finally{Math.random=old}
});
test('kiln vent indicator changes with a manual vent operation',()=>{const g=createPotteryHouse();const paint=[];let color='';const ctx=new Proxy({fillRect(x,y,w,h){paint.push({x,y,w,h,color})},fillText(){}},{get:(o,k)=>k==='fillStyle'?color:o[k]??(()=>{}),set:(o,k,v)=>{if(k==='fillStyle')color=v;else o[k]=v;return true}});g.draw(ctx);assert.ok(paint.some(p=>p.x===204&&p.y===153&&p.color==='#241a20'));go(g,'vent');g.input('Shift',true);for(let i=0;i<9;i++)g.update(1/60,false);g.input('Shift',false);assert.equal(g.snapshot().kiln.vent,1);paint.length=0;g.draw(ctx);assert.ok(paint.some(p=>p.x===204&&p.y===153&&p.color==='#467776'))});
test('potter faces and animates in the direction of manual movement',()=>{const g=createPotteryHouse();g.input('ArrowLeft',true);g.update(.05,false);g.input('ArrowLeft',false);let h=g.snapshot().hero;assert.equal(h.facing,-1);assert.ok(h.moving&&h.gait>0);const gait=h.gait;g.update(.05,false);h=g.snapshot().hero;assert.equal(h.facing,-1);assert.equal(h.moving,false);assert.equal(h.gait,gait);g.input('ArrowRight',true);g.update(.05,false);g.input('ArrowRight',false);assert.equal(g.snapshot().hero.facing,1)});

test('workshop notices expire to the reference prompt and reset restarts the welcome',()=>{
 const g=createPotteryHouse();const labels=[];const canvas=new Proxy({fillText(label){labels.push(label)}},{get:(o,k)=>o[k]??(()=>{}),set:(o,k,v)=>(o[k]=v,true)});const read=()=>{labels.length=0;g.draw(canvas);return [...labels]};
 assert.ok(read().includes('OPEN THE POTTERY'));for(let i=0;i<101;i++)g.update(1/60,false);assert.ok(read().includes('SHAPE · GLAZE · FIRE'));
 g.reset();work(g,'clay');assert.ok(read().includes('CLAY IS READY'));for(let i=0;i<74;i++)g.update(1/60,false);assert.ok(read().includes('SHAPE · GLAZE · FIRE'));g.reset();assert.ok(read().includes('OPEN THE POTTERY'));
});

test('AI patrols the kiln while firing and completes an iridescent masterwork',()=>{
 const old=Math.random;Math.random=()=>.37;try{const g=createPotteryHouse();let patrolled=false;
 for(let i=0;i<5000&&!g.snapshot().completed;i++){const before=g.snapshot();g.update(1/60,true);const after=g.snapshot();if(before.kiln.baking&&after.kiln.baking&&before.hazard.phase==='idle'&&before.kiln.temp>=64&&before.kiln.temp<=91&&before.kiln.soak<70&&after.hero.moving)patrolled=true}
 const s=g.snapshot();assert.ok(patrolled,'potter moves between kiln and wood while the firing progresses');assert.ok(s.completed>=1);assert.equal(s.shelf[0].quality,'masterwork');assert.equal(s.shelf[0].iridescent,true);
 }finally{Math.random=old}
});

test('gallery displays fifteen recent vessels over three reference rows',()=>{
 const old=Math.random;Math.random=()=>.37;try{const g=createPotteryHouse();for(let i=0;i<120000&&g.snapshot().completed<15;i++)g.update(1/60,true);assert.ok(g.snapshot().completed>=15);const paints=[];let color='';const ctx=new Proxy({fillRect(x,y,w,h){paints.push({x,y,w,h,color})}},{get:(o,k)=>k==='fillStyle'?color:o[k]??(()=>{}),set:(o,k,v)=>{if(k==='fillStyle')color=v;else o[k]=v;return true}});g.draw(ctx);const bodies=paints.filter(p=>p.w===6.5&&Math.abs(p.h-3.9)<.001&&[91.8,120.8,160.8].some(y=>Math.abs(p.y-y)<.001));assert.equal(bodies.length,15);assert.equal(new Set(bodies.map(p=>p.y.toFixed(1))).size,3);
 }finally{Math.random=old}
});

test('a vent operation completing on the draft warning frame counters it',()=>{
 const old=Math.random;Math.random=()=>0;try{const g=createPotteryHouse();go(g,'vent');const target=g.snapshot().hazard.next-8/60;while(g.snapshot().time<target-1e-7)g.update(1/60,false);g.input('Shift',true);for(let i=0;i<8;i++)g.update(1/60,false);g.input('Shift',false);const s=g.snapshot();assert.equal(s.kiln.vent,1);assert.equal(s.hazard.phase,'idle');assert.equal(s.notice,'DRAFT TAMED');assert.ok(s.hazard.next>s.time);
 }finally{Math.random=old}
});

test('AI begins station work during its final approach and still completes the craft',()=>{
 const g=createPotteryHouse();let approaching=false;for(let i=0;i<300;i++){g.update(1/60,true);const s=g.snapshot();if(s.workStation==='clay'&&s.work>0&&s.hero.moving)approaching=true;if(s.hero.carry?.state==='clay')break}assert.ok(approaching,'work begins in the reference approach zone while moving');assert.equal(g.snapshot().hero.carry?.state,'clay');
});

test('station completion shows a temporary payoff and reset clears it',()=>{
 const g=createPotteryHouse(),labels=[];const ctx=new Proxy({fillText(t){labels.push(t)}},{get:(o,k)=>o[k]??(()=>{}),set:(o,k,v)=>(o[k]=v,true)});const draw=()=>{labels.length=0;g.draw(ctx);return [...labels]};work(g,'clay');assert.ok(draw().includes('+'));for(let i=0;i<40;i++)g.update(1/60,false);assert.ok(!draw().includes('+'));g.reset();assert.ok(!draw().includes('+'));
});

test('countering a draft while tempering preserves the reference counter message',()=>{
 const old=Math.random;Math.random=()=>0;try{const g=createPotteryHouse();let found=false;for(let i=0;i<20000;i++){g.update(1/60,true);const s=g.snapshot();if(s.hazard.kind==='draft'&&s.hazard.phase==='warning'&&s.kiln.baking&&s.kiln.curve.preheated&&!s.kiln.curve.vented&&s.kiln.temp>=69){found=true;break}}assert.ok(found,'AI reaches a hot, preheated draft encounter');go(g,'vent');g.input('Shift',true);for(let i=0;i<8;i++)g.update(1/60,false);g.input('Shift',false);const s=g.snapshot();assert.equal(s.hazard.phase,'idle');assert.equal(s.kiln.curve.vented,true);assert.equal(s.notice,'DRAFT TAMED');
 }finally{Math.random=old}
});

test('gallery renders each glaze highlight and the iridescent violet accent',()=>{
 const old=Math.random;Math.random=()=>0;try{const g=createPotteryHouse();for(let i=0;i<30000&&g.snapshot().completed<3;i++)g.update(1/60,true);const s=g.snapshot();assert.ok(s.completed>=3);assert.deepEqual(new Set(s.shelf.slice(-3).map(v=>v.glaze)),new Set([0,1,2]));assert.ok(s.shelf.some(v=>v.iridescent));const colors=new Set();let color='';const ctx=new Proxy({fillRect(){colors.add(color)}},{get:(o,k)=>k==='fillStyle'?color:o[k]??(()=>{}),set:(o,k,v)=>{if(k==='fillStyle')color=v;else o[k]=v;return true}});g.draw(ctx);for(const expected of ['#a0dfbe','#b8dcf2','#f4b7ab','#a68ed4'])assert.ok(colors.has(expected),`missing vessel accent ${expected}`);
 }finally{Math.random=old}
});

import test from 'node:test';
import assert from 'node:assert/strict';
import {createPotteryHouse} from '../src/feature-games20.js';

const points={clay:[42,402],wheel:[114,393],glaze:[189,357],ash:[189,409],water:[30,296],kiln:[166.5,243],vent:[213,192],wood:[208.5,280.5],shelf:[61.5,186]};
function go(g,name){const [x,y]=points[name];for(const [axis,target,minus,plus] of [['x',x,'ArrowLeft','ArrowRight'],['y',y,'ArrowUp','ArrowDown']]){let n=0;while(Math.abs(g.snapshot().hero[axis]-target)>.01&&n++<1000){const diff=target-g.snapshot().hero[axis],key=diff<0?minus:plus;g.input(key,true);g.update(Math.min(.05,Math.abs(diff)/133.2),false);g.input(key,false)}}}
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
 work(g,'kiln');assert.equal(g.snapshot().hero.carry.state,'cooling');
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

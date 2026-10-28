import test from 'node:test';
import assert from 'node:assert/strict';
import {createGravityClawGame} from '../src/feature-games15.js';
const withSeed=(seed,fn)=>{const original=Math.random;Math.random=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296);try{fn()}finally{Math.random=original}};
function press(g,key){g.input(key,true);g.input(key,false);if(key==='x')for(let i=0;i<30&&g.snapshot().yank;i++)g.update(.02,false)}
function move(g,target){for(let i=0;i<800;i++){const p=g.snapshot().p,dx=target.x-p.x,dy=target.y-p.y;for(const [key,on] of [['ArrowLeft',dx< -3],['ArrowRight',dx>3],['ArrowUp',dy< -3],['ArrowDown',dy>3]])g.input(key,on);if(Math.hypot(dx,dy)<6)break;g.update(.02,false)}for(const key of ['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'])g.input(key,false);const p=g.snapshot().p;assert.ok(Math.hypot(p.x-target.x,p.y-target.y)<10,`could not reach ${JSON.stringify(target)}`)}

test('manual ascent crosses shaft bands before the cell-locked gate',()=>withSeed(3,()=>{
 const g=createGravityClawGame();move(g,{x:120,y:95});g.input('ArrowUp',true);for(let i=0;i<900&&!g.snapshot().doorReady;i++)g.update(.02,false);g.input('ArrowUp',false);let s=g.snapshot();assert.ok(s.height>=500);assert.equal(s.zoneBand,2);assert.equal(s.gate,false);let height=s.height;g.input('ArrowUp',true);for(let i=0;i<30;i++)g.update(.02,false);g.input('ArrowUp',false);assert.equal(g.snapshot().height,height);
 const cell=g.snapshot().props.filter(p=>p.kind==='cell').sort((a,b)=>Math.hypot(a.x-g.snapshot().p.x,a.y-g.snapshot().p.y)-Math.hypot(b.x-g.snapshot().p.x,b.y-g.snapshot().p.y))[0];move(g,cell);press(g,'x');assert.equal(g.snapshot().held?.kind,'cell');move(g,{x:60,y:135});press(g,'x');for(let i=0;i<25;i++)g.update(.02,false);s=g.snapshot();assert.equal(s.gate,true);assert.equal(s.slots,1);move(g,{x:120,y:95});g.input('ArrowUp',true);for(let i=0;i<35;i++)g.update(.02,false);g.input('ArrowUp',false);assert.ok(g.snapshot().height>height);
}));

test('manual zap cannot damage the tripod but a physical throw can',()=>withSeed(3,()=>{
 const g=createGravityClawGame();for(let i=0;i<6000&&!g.snapshot().enemies.some(e=>e.kind==='tripod');i++)g.update(.033,true);let s=g.snapshot();assert.equal(s.zone,2);assert.equal(s.enemies.find(e=>e.kind==='tripod').hp,6);const crate=s.props.filter(p=>p.kind==='crate').sort((a,b)=>Math.hypot(a.x-s.p.x,a.y-s.p.y)-Math.hypot(b.x-s.p.x,b.y-s.p.y))[0];move(g,crate);press(g,'x');assert.equal(g.snapshot().held?.kind,'crate');
 let boss=s.enemies.find(e=>e.kind==='tripod');move(g,{x:boss.x,y:boss.y+30});s=g.snapshot();assert.ok(Math.hypot(s.p.x-s.enemies.find(e=>e.kind==='tripod').x,s.p.y-s.enemies.find(e=>e.kind==='tripod').y)<55);press(g,'z');g.update(.02,false);assert.equal(g.snapshot().enemies.find(e=>e.kind==='tripod').hp,6);if(!g.snapshot().held){press(g,'x');for(let i=0;i<12;i++)g.update(.02,false)}assert.equal(g.snapshot().held?.kind,'crate');press(g,'x');assert.notEqual(g.snapshot().recoil.y,0,'hurl produces recoil');for(let i=0;i<50;i++)g.update(.02,false);s=g.snapshot();assert.equal(s.enemies.find(e=>e.kind==='tripod').hp,5);
 const can=s.props.filter(o=>o.kind==='can').sort((a,b)=>Math.hypot(a.x-s.p.x,a.y-s.p.y)-Math.hypot(b.x-s.p.x,b.y-s.p.y))[0];move(g,can);press(g,'x');assert.ok(['can','bolt'].includes(g.snapshot().held?.kind));for(let i=0;i<12;i++)g.update(.02,false);boss=g.snapshot().enemies.find(e=>e.kind==='tripod');move(g,{x:boss.x,y:boss.y+25});press(g,'x');for(let i=0;i<100&&!g.snapshot().tripodStaggers;i++)g.update(.02,false);s=g.snapshot();assert.equal(s.tripodStaggers,1);assert.equal(s.enemies.find(e=>e.kind==='tripod').hp,3);assert.ok(s.enemies.find(e=>e.kind==='tripod').stun>.5);
}));

for(const seed of [1,42,123])test(`AI slots gates and defeats the tripod with physical objects (seed ${seed})`,()=>withSeed(seed,()=>{
 const g=createGravityClawGame();let highest=0;for(let i=0;i<3600&&!g.snapshot().bossKills;i++){g.update(.033,true);const s=g.snapshot();assert.ok(s.zone>=highest,'AI run should not reset before boss defeat');highest=s.zone}const s=g.snapshot();assert.ok(s.slots>=2);assert.ok(s.height>=1080);assert.equal(s.bossKills,1);if(seed===42)assert.ok(s.shieldBreaks>0,'AI must physically break a warden shield');
}));

test('a misplaced thrown cell remains recoverable while the gate is locked',()=>withSeed(42,()=>{
 const g=createGravityClawGame();move(g,{x:80,y:260});press(g,'x');assert.equal(g.snapshot().held?.kind,'cell');for(let i=0;i<10;i++)g.update(.02,false);press(g,'x');for(let i=0;i<180;i++)g.update(.02,false);const s=g.snapshot();assert.ok(s.gate||s.props.some(p=>p.kind==='cell'),'the only cell must not disappear before opening the gate');
}));

test('the claw must charge before hurling and gains speed with charge',()=>withSeed(42,()=>{
 const g=createGravityClawGame();move(g,{x:80,y:260});press(g,'x');press(g,'x');assert.equal(g.snapshot().held?.kind,'cell');assert.equal(g.snapshot().projectiles.length,0);
 for(let i=0;i<30;i++)g.update(.02,false);press(g,'x');const s=g.snapshot();assert.equal(s.held,null);assert.ok(Math.hypot(s.projectiles[0].vx,s.projectiles[0].vy)>240);
}));

test('wardens patrol, telegraph fire, and a manual player can catch a bolt',()=>withSeed(42,()=>{
 const g=createGravityClawGame();for(let i=0;i<3000&&g.snapshot().zone<1;i++)g.update(.033,true);
 assert.equal(g.snapshot().zone,1);move(g,{x:70,y:260});let sawTell=false,caught=false,first=g.snapshot().enemies.find(e=>e.kind==='warden');
 for(let i=0;i<500&&!caught;i++){const s=g.snapshot(),warden=s.enemies.find(e=>e.kind==='warden');if(!warden)break;if(warden.tele>0)sawTell=true;if(s.bolts.some(b=>Math.hypot(b.x-s.p.x,b.y-s.p.y)<25)){press(g,'x');caught=g.snapshot().held?.kind==='bolt';}g.update(.02,false)}
 assert.ok(sawTell,'warden should warn before firing');assert.ok(caught,'the player should be able to catch the incoming bolt');assert.notDeepEqual([first.x,first.y],[g.snapshot().enemies.find(e=>e.kind==='warden').x,g.snapshot().enemies.find(e=>e.kind==='warden').y]);
}));

test('AI catches incoming plasma during ascent',()=>withSeed(42,()=>{
 const g=createGravityClawGame();for(let i=0;i<1500&&!g.snapshot().catches;i++)g.update(.033,true);assert.ok(g.snapshot().catches>0);
}));

test('tripod fires a three-bolt spread during manual play',()=>withSeed(42,()=>{
 const g=createGravityClawGame();for(let i=0;i<6000&&!g.snapshot().enemies.some(e=>e.kind==='tripod');i++)g.update(.033,true);assert.equal(g.snapshot().zone,2);
 let spread=false;for(let i=0;i<250&&!spread;i++){g.update(.02,false);const b=g.snapshot().bolts;if(b.length>=3){for(let j=0;j<b.length-2;j++){const angles=b.slice(j,j+3).map(x=>Math.atan2(x.vy,x.vx));if(Math.abs(angles[0]-angles[1])>.1&&Math.abs(angles[1]-angles[2])>.1){spread=true;break}}}}
 assert.ok(spread,'tripod should fire three distinct directions');
}));

for(const [seed,side] of [[1000,180],[3,60]])test(`zones replenish two cells and AI opens the ${side===60?'left':'right'} socket (seed ${seed})`,()=>withSeed(seed,()=>{
 const g=createGravityClawGame();let s=g.snapshot();assert.equal(s.biome,'ANOMALY LABS');assert.equal(s.props.filter(p=>p.kind==='cell').length,2);
 for(let i=0;i<3000&&g.snapshot().zone<1;i++)g.update(.033,true);s=g.snapshot();assert.equal(s.zone,1);assert.equal(s.biome,'BIO WING');assert.equal(s.socket.x,side);assert.equal(s.props.filter(p=>p.kind==='cell').length,2);assert.equal(s.gate,false);
 for(let i=0;i<3000&&!g.snapshot().gate;i++)g.update(.033,true);s=g.snapshot();assert.equal(s.gate,true);assert.ok(s.slots>=2);
}));

test('every third zone introduces a tripod and the next biome advances',()=>withSeed(1,()=>{
 const g=createGravityClawGame();for(let i=0;i<6000&&!g.snapshot().enemies.some(e=>e.kind==='tripod');i++)g.update(.033,true);let s=g.snapshot();assert.equal(s.biome,'MAINTENANCE');assert.ok(s.enemies.some(e=>e.kind==='tripod'));
 for(let i=0;i<4000&&g.snapshot().zone<3;i++)g.update(.033,true);s=g.snapshot();assert.equal(s.zone,3);assert.equal(s.biome,'TRANSIT LINE');assert.ok(!s.enemies.some(e=>e.kind==='tripod'));
}));

test('manual claw can capture a nearby mite and throw it',()=>{
  const game=createGravityClawGame();let s=game.snapshot();
  for(let i=0;i<400&&!s.held;i++){
    const enemy=s.enemies.find(e=>e.kind==='mite');if(!enemy)break;
    for(const [key,on] of [['ArrowLeft',s.p.x>enemy.x+4],['ArrowRight',s.p.x<enemy.x-4],['ArrowUp',s.p.y>enemy.y+4],['ArrowDown',s.p.y<enemy.y-4]])game.input(key,on);
    if(Math.hypot(enemy.x-s.p.x,enemy.y-s.p.y)<24){game.input('x',true);game.input('x',false)}
    game.update(.02,false);s=game.snapshot();
  }
  assert.equal(s.held?.kind,'mite');assert.equal(s.foeGrabs,1);
  for(let i=0;i<12;i++)game.update(.02,false);game.input('x',true);game.input('x',false);
  assert.ok(game.snapshot().projectiles.some(p=>p.kind==='mite'));
});

test('opening zone has a shielded patrol and mites telegraph before lunging',()=>withSeed(42,()=>{
 const g=createGravityClawGame();let s=g.snapshot();assert.equal(s.enemies.filter(e=>e.kind==='mite').length,2);assert.ok(s.enemies.some(e=>e.kind==='warden'&&e.shield));let windup=false,lunge=false;
 for(let i=0;i<150&&!lunge;i++){g.update(.02,false);s=g.snapshot();const mite=s.enemies.find(e=>e.kind==='mite'&&e.x<120);if(mite?.state==='windup')windup=true;if(mite?.state==='lunge')lunge=true}
 assert.ok(windup,'mite must telegraph the attack');assert.ok(lunge,'mite must follow with a lunge');
}));

test('a surge warns before scattering loose props and stunning foes',()=>withSeed(42,()=>{
 const g=createGravityClawGame();for(let i=0;i<2000&&g.snapshot().surge.phase!=='warning';i++)g.update(.033,true);let s=g.snapshot();assert.equal(s.surge.phase,'warning');assert.equal(s.surge.count,0);const loose=s.props.length;
 for(let i=0;i<125&&g.snapshot().surge.count===0;i++)g.update(.033,false);s=g.snapshot();assert.equal(s.surge.count,1);assert.equal(s.surge.phase,'calm');assert.ok(loose>0&&s.props.some(p=>Math.abs(p.vx||0)>0||Math.abs(p.vy||0)>0));assert.ok(s.enemies.some(e=>e.kind!=='tripod'&&e.stun>0));
}));

test('AI moves toward the wall during the surge warning and resumes climbing',()=>withSeed(42,()=>{
 const g=createGravityClawGame();for(let i=0;i<2000&&g.snapshot().surge.phase!=='warning';i++)g.update(.033,true);let s=g.snapshot();const initial=Math.min(s.p.x-15,225-s.p.x);for(let i=0;i<80&&g.snapshot().surge.phase==='warning';i++)g.update(.033,true);s=g.snapshot();assert.ok(Math.min(s.p.x-15,225-s.p.x)<initial);for(let i=0;i<2000&&g.snapshot().zone<1;i++)g.update(.033,true);assert.ok(g.snapshot().zone>=1);
}));

test('zone vents replenish loose objects after a delay',()=>withSeed(42,()=>{
 const g=createGravityClawGame();const before=g.snapshot();assert.equal(before.vents.length,2);for(let i=0;i<360;i++)g.update(.02,false);const s=g.snapshot();assert.ok(s.props.some(p=>p.kind==='crate'&&p.x===30&&p.y===180));assert.equal(s.props.length,before.props.length+1);
}));

test('manual can impact explodes and consumes the prop',()=>withSeed(42,()=>{
 const g=createGravityClawGame();move(g,{x:80,y:360});press(g,'x');assert.equal(g.snapshot().held?.kind,'can');for(let i=0;i<15;i++)g.update(.02,false);press(g,'x');for(let i=0;i<180&&!g.snapshot().explosions;i++)g.update(.02,false);const s=g.snapshot();assert.ok(s.explosions>0);assert.ok(!s.projectiles.some(p=>p.kind==='can'));
}));

test('a thrown crate slows under drag and survives its first impact',()=>withSeed(42,()=>{
 const g=createGravityClawGame();move(g,{x:160,y:250});press(g,'x');assert.equal(g.snapshot().held?.kind,'crate');for(let i=0;i<12;i++)g.update(.02,false);press(g,'x');let shot=g.snapshot().projectiles.find(p=>p.kind==='crate');const speed=Math.hypot(shot.vx,shot.vy);g.update(.02,false);shot=g.snapshot().projectiles.find(p=>p.kind==='crate');assert.ok(shot&&Math.hypot(shot.vx,shot.vy)<speed);for(let i=0;i<180&&g.snapshot().projectiles.some(p=>p.kind==='crate');i++)g.update(.02,false);assert.ok(g.snapshot().props.some(p=>p.kind==='crate'&&p.hp>=1));
}));

test('AI latches an evasive sidestep while manual movement stays under player control',()=>withSeed(42,()=>{
 const g=createGravityClawGame();for(let i=0;i<2000&&!g.snapshot().dodges;i++)g.update(.033,true);let s=g.snapshot();assert.ok(s.dodges>0);assert.ok(s.dodge.time>0);const {x,y}=s.dodge;g.update(.033,true);s=g.snapshot();assert.equal(s.dodge.x,x);assert.equal(s.dodge.y,y);assert.ok(s.dodge.time>0);
 const manual=createGravityClawGame();for(let i=0;i<300;i++)manual.update(.02,false);assert.equal(manual.snapshot().dodges,0);
}));

test('a manual claw pulls a loose object before it becomes held and chargeable',()=>withSeed(42,()=>{
 const g=createGravityClawGame();move(g,{x:105,y:260});g.input('x',true);g.input('x',false);let s=g.snapshot();assert.equal(s.held,null);assert.equal(s.yank?.prop.kind,'cell');const d0=Math.hypot(s.yank.prop.x-s.p.x,s.yank.prop.y-s.p.y);g.update(.02,false);s=g.snapshot();assert.ok(s.yank);assert.ok(Math.hypot(s.yank.prop.x-s.p.x,s.yank.prop.y-s.p.y)<d0);assert.equal(s.charge,0);g.input('x',true);g.input('x',false);assert.equal(g.snapshot().projectiles.length,0);
 for(let i=0;i<30&&g.snapshot().yank;i++)g.update(.02,false);s=g.snapshot();assert.equal(s.yank,null);assert.equal(s.held?.kind,'cell');assert.equal(s.charge,0);
}));

test('manual return preserves an opened lower gate, carried prop and upper zone state',()=>withSeed(42,()=>{
 const g=createGravityClawGame();for(let i=0;i<5000&&g.snapshot().zone<1;i++)g.update(.033,true);let s=g.snapshot();assert.equal(s.zone,1);assert.ok(s.visitedZones.includes(0));const upperSocket=s.socket.x;const crate=s.props.find(p=>p.kind==='crate');move(g,crate);press(g,'x');assert.equal(g.snapshot().held?.kind,'crate');
 g.input('ArrowDown',true);for(let i=0;i<600&&g.snapshot().zone===1;i++)g.update(.02,false);g.input('ArrowDown',false);s=g.snapshot();assert.equal(s.zone,0);assert.equal(s.gate,true);assert.equal(s.held?.kind,'crate');assert.equal(s.slots,1);
 g.input('ArrowUp',true);for(let i=0;i<100&&g.snapshot().zone===0;i++)g.update(.02,false);g.input('ArrowUp',false);s=g.snapshot();assert.equal(s.zone,1);assert.equal(s.socket.x,upperSocket);assert.equal(s.gate,false);assert.equal(s.held?.kind,'crate');assert.equal(s.slots,1);
}));

test('shield absorbs zap and the first thrown impact breaks it without hull damage',()=>withSeed(42,()=>{
 const g=createGravityClawGame();move(g,{x:160,y:250});press(g,'x');assert.equal(g.snapshot().held?.kind,'crate');let w=g.snapshot().enemies.find(e=>e.kind==='warden');move(g,{x:w.x,y:w.y+25});w=g.snapshot().enemies.find(e=>e.kind==='warden');assert.ok(Math.hypot(w.x-g.snapshot().p.x,w.y-g.snapshot().p.y)<55);press(g,'z');g.update(.02,false);w=g.snapshot().enemies.find(e=>e.kind==='warden');assert.equal(w.shield,1);assert.equal(w.hp,2);press(g,'x');for(let i=0;i<80&&!g.snapshot().shieldBreaks;i++)g.update(.02,false);const s=g.snapshot();w=s.enemies.find(e=>e.kind==='warden');assert.equal(s.shieldBreaks,1);assert.equal(w.shield,0);assert.equal(w.hp,2);assert.ok(w.stun>0);
}));

test('a hit drops the held cell and grants a brief invulnerability window',()=>withSeed(42,()=>{
 const g=createGravityClawGame();move(g,{x:80,y:260});press(g,'x');let s=g.snapshot();assert.equal(s.held?.kind,'cell');const health=s.health,hits=s.hits;for(let i=0;i<1000&&g.snapshot().hits===hits;i++)g.update(.02,false);s=g.snapshot();assert.equal(s.hits,hits+1);assert.equal(s.health,health-25);assert.equal(s.held,null);assert.ok(s.props.some(p=>p.kind==='cell'&&Math.hypot(p.x-s.p.x,p.y-s.p.y)<15));assert.ok(s.invulnerable>1.5);for(let i=0;i<50;i++)g.update(.02,false);s=g.snapshot();assert.equal(s.hits,hits+1);assert.equal(s.health,health-25);
}));

test('a zap with no target does not consume its cooldown',()=>withSeed(42,()=>{
 const g=createGravityClawGame();press(g,'z');assert.equal(g.snapshot().zapCooldown,0);
}));

test('AI respawns after defeat without discarding its climbed zone',()=>withSeed(1,()=>{
 const g=createGravityClawGame();for(let i=0;i<8000&&!g.snapshot().dead;i++)g.update(.033,true);let s=g.snapshot();assert.ok(s.dead);assert.ok(s.zone>=1);const {zone,height,slots}=s;for(let i=0;i<100&&g.snapshot().dead;i++)g.update(.033,true);s=g.snapshot();assert.equal(s.dead,0);assert.equal(s.health,100);assert.equal(s.zone,zone);assert.equal(s.height,height);assert.equal(s.slots,slots);assert.ok(s.invulnerable>2);
}));

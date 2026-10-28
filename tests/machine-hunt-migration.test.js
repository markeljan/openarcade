import test from 'node:test';import assert from 'node:assert/strict';import {machineHunt,machineHuntAdvanceMigration,machineHuntMigrationCover,machineHuntHasNearbyAlert,machineHuntPickupTarget} from '../src/feature-games.js';
function seeded(fn,initial=1){const old=Math.random;let seed=initial;Math.random=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/2**32);try{fn()}finally{Math.random=old}}
test('herd warns at 250 metres, runs for its timed act and schedules the next migration',()=>{const m={phase:'calm',timer:0,next:250};assert.equal(machineHuntAdvanceMigration(m,249,1),null);assert.equal(machineHuntAdvanceMigration(m,250,1),'warning');assert.equal(machineHuntAdvanceMigration(m,260,3.9),null);assert.equal(machineHuntAdvanceMigration(m,260,.1),'stampede');assert.equal(machineHuntAdvanceMigration(m,270,8),null);assert.equal(machineHuntAdvanceMigration(m,270,1),'passed');assert.equal(m.next,570)});
test('manual travel and seeded preview encounter an actual moving stampede',()=>{for(const auto of [false,true])seeded(()=>{const g=machineHunt();if(!auto){g.input('ArrowUp',true);g.input('x',true)}let warned=false,herd=false;for(let i=0;i<60*480;i++){g.update(1/60,auto);const s=g.snapshot();warned ||= s.migration.phase==='warn';const group=s.robots.filter(r=>r.mode==='stampede');if(group.length>=6){assert.ok(group.every(r=>r.vy===264));assert.ok(s.lastMeters>=250);herd=true;break}if(!auto&&s.gameOver)break}assert.ok(warned&&herd,auto?'AI failed to reach herd':'manual travel failed to reach herd')},auto?1:2)});


test('migration cover chooses the nearest grass or tree',()=>{
 const hero={x:100,y:100},grass={x:150,y:100},tree={x:110,y:100};assert.equal(machineHuntMigrationCover([grass],[tree],hero),tree);assert.equal(machineHuntMigrationCover([],[],hero),null);
});

test('AI moves toward actual cover during a migration warning',()=>seeded(()=>{
 const game=machineHunt();let sought=false;for(let i=0;i<60*480;i++){const before=game.snapshot(),hero=before.hero,trees=before.obstacles.filter(o=>o.r===6),cover=machineHuntMigrationCover(before.grass,trees,hero),near=before.robots.some(r=>!r.dead&&(r.detect>=100||['windup','lunge','stampede'].includes(r.mode))&&Math.hypot(r.x-hero.x,r.y-hero.y)<104);game.update(1/60,true);const after=game.snapshot();
  if(before.migration.phase!=='warn'||before.aiState!=='trek'||before.roll||near||machineHuntHasNearbyAlert(before.robots,hero)||before.reticles.length||!cover||machineHuntPickupTarget(before.loot,before.crates,hero)||Math.hypot(cover.x-hero.x,cover.y-hero.y)<=20)continue;
  const dx=after.hero.x-hero.x,dy=after.hero.y-hero.y-(after.scroll-before.scroll);if(dx*(cover.x-hero.x)+dy*(cover.y-hero.y)>0){sought=true;break}
 }assert.ok(sought,'preview should seek nearby cover during a real warning');
}));

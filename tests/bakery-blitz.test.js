import test from 'node:test';import assert from 'node:assert/strict';import {createBakeryGame} from '../src/feature-games29.js';
function stop(g){for(const k of ['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'])g.input(k,false)}
function move(g,x,y){for(let i=0;i<1000;i++){const p=g.snapshot().baker,dx=x-p.x,dy=y-p.y;if(Math.abs(dx)<4&&Math.abs(dy)<4){stop(g);return}for(const [k,v] of [['ArrowLeft',dx< -3],['ArrowRight',dx>3],['ArrowUp',dy< -3],['ArrowDown',dy>3]])g.input(k,v);g.input('Shift',true);g.update(.02,false)}assert.fail('station unreachable')}
function use(g){stop(g);g.input(' ',true);g.update(.02,false);g.input(' ',false);for(let i=0;i<11;i++){g.input('Shift',true);g.update(.02,false)}}
function stoke(g){g.input('z',true);g.update(1/60,false);g.input('z',false)}
function makeRack(g){move(g,35,230);use(g);assert.equal(g.snapshot().carry.phase,'ingredients');move(g,70,230);use(g);assert.equal(g.snapshot().carry.phase,'mixed');move(g,250,230);use(g);use(g);assert.equal(g.snapshot().carry.kneads,2);use(g);move(g,250,330);use(g)}
test('manual bakery can proof two distinct recipes simultaneously',()=>{const g=createBakeryGame();makeRack(g);assert.equal(g.snapshot().rack.length,1);makeRack(g);const s=g.snapshot();assert.equal(s.rack.length,2);assert.deepEqual(s.rack.map(x=>x.recipe),['BOULE','RYE']);assert.equal(s.rack[0].proofTarget,108/60);assert.equal(s.rack[1].proofTarget,138/60);assert.equal(s.rack[0].bakeTarget,102/60);assert.equal(s.rack[1].bakeTarget,120/60);assert.ok(s.rack[0].timer>s.rack[1].timer)});
test('manual scored loaf is vented and served as artisan bread',()=>{const g=createBakeryGame();makeRack(g);while(g.snapshot().rack[0].timer<g.snapshot().rack[0].proofTarget)g.update(.02,false);use(g);assert.equal(g.snapshot().carry.phase,'risen');move(g,250,230);use(g);assert.equal(g.snapshot().carry.proofWindow,true);move(g,70,440);stoke(g);stoke(g);use(g);assert.equal(g.snapshot().oven.length,1);while(!g.snapshot().oven[0].warning)g.update(.02,false);use(g);assert.equal(g.snapshot().oven[0].vented,true);while(g.snapshot().oven[0].timer<g.snapshot().oven[0].bakeTarget)g.update(.02,false);use(g);assert.equal(g.snapshot().carry.artisan,true);assert.equal(g.snapshot().carry.showpiece,false);move(g,250,440);use(g);assert.equal(g.snapshot().artisanServed,1);assert.equal(g.snapshot().score,180);assert.equal(g.snapshot().manualScore,180);assert.equal(g.snapshot().display[0].recipe,'BOULE')});
test('autoplay completes distinct recipes and artisan loaves',()=>{const g=createBakeryGame(),recipes=new Set();let peakRack=0;for(let i=0;i<8000&&g.snapshot().served<2;i++){g.update(.033,true);const s=g.snapshot();peakRack=Math.max(peakRack,s.rack.length);if(s.carry)recipes.add(s.carry.recipe)}const s=g.snapshot();assert.equal(s.served,2);assert.ok(s.artisanServed>=1);assert.ok(s.showpieceServed>=1);assert.ok(peakRack>=1);assert.ok(recipes.has('BOULE')&&recipes.has('RYE'));assert.equal(s.spoiled-s.mouseStolen,0)});
test('manual player can load a second loaf while the first remains in the oven',()=>{const g=createBakeryGame();makeRack(g);makeRack(g);use(g);assert.equal(g.snapshot().carry.recipe,'BOULE');move(g,250,230);use(g);move(g,70,440);stoke(g);use(g);assert.equal(g.snapshot().oven.length,1);move(g,250,330);use(g);assert.equal(g.snapshot().carry.recipe,'RYE');move(g,70,440);if(g.snapshot().oven[0]?.warning&&!g.snapshot().oven[0].vented)use(g);stoke(g);use(g);assert.equal(g.snapshot().oven.length,2);assert.deepEqual(g.snapshot().oven.map(l=>l.recipe),['BOULE','RYE'])});

test('manual showpiece needs flour, correct load heat, vent and steam',()=>{const g=createBakeryGame();makeRack(g);while(g.snapshot().rack[0].timer<g.snapshot().rack[0].proofTarget)g.update(.02,false);use(g);move(g,250,230);use(g);use(g);assert.equal(g.snapshot().carry.showpieceAttempt,true);assert.ok(g.snapshot().flour<=4);move(g,70,440);stoke(g);stoke(g);use(g);assert.equal(g.snapshot().oven[0].loadWindow,true);while(!g.snapshot().oven[0].warning)g.update(.02,false);use(g);assert.equal(g.snapshot().oven[0].vented,true);while(g.snapshot().pressure<25)g.update(.02,false);use(g);assert.equal(g.snapshot().oven[0].steamInjected,true);assert.equal(g.snapshot().water,3);while(g.snapshot().oven[0].timer<g.snapshot().oven[0].bakeTarget)g.update(.02,false);use(g);assert.equal(g.snapshot().carry.showpiece,true);move(g,250,440);use(g);assert.equal(g.snapshot().showpieceServed,1);assert.equal(g.snapshot().showcase.recipe,'BOULE')});

test('displayed bread earns reference quality points and attracts a customer',()=>{
 const g=createBakeryGame();let s;
 for(let i=0;i<12000;i++){g.update(.033,true);s=g.snapshot();if(s.display.length>=2&&s.customer.visits)break}
 assert.ok(s.display.length>=2);assert.ok(s.customer.visits>=1);assert.equal(s.manualScore,0);
 assert.equal(s.score,s.display.reduce((sum,l)=>sum+(l.showpiece?240:l.artisan?180:l.quality==='dark'?65:120),0));
 assert.ok(s.display.some(l=>l.artisan));
 g.reset();assert.equal(g.snapshot().score,0);assert.deepEqual(g.snapshot().display,[]);assert.equal(g.snapshot().customer.visits,0);
});

test('manual baker may pull bread five frames before its target',()=>{
 const g=createBakeryGame();makeRack(g);while(g.snapshot().rack[0].timer<g.snapshot().rack[0].proofTarget)g.update(.01,false);use(g);move(g,70,440);stoke(g);use(g);
 let loaf=g.snapshot().oven[0];while(loaf.timer<loaf.bakeTarget-5/60){g.update(.005,false);loaf=g.snapshot().oven[0]}
 assert.ok(loaf.timer<loaf.bakeTarget);g.input(' ',true);g.update(1/60,false);g.input(' ',false);assert.equal(g.snapshot().carry?.phase,'baked');
});

test('bread burns after the reference 72-frame window and AI keeps serving',()=>{
 const g=createBakeryGame();makeRack(g);while(g.snapshot().rack[0].timer<g.snapshot().rack[0].proofTarget)g.update(.01,false);use(g);move(g,70,440);stoke(g);use(g);
 let s=g.snapshot();while(s.oven[0].timer<=s.oven[0].bakeTarget+70/60){g.update(.005,false);s=g.snapshot()}assert.equal(s.spoiled-s.mouseStolen,0);
 while(g.snapshot().oven.length)g.update(.005,false);s=g.snapshot();assert.equal(s.spoiled-s.mouseStolen,1);assert.equal(s.notice,'LOAF BURNED');
 const ai=createBakeryGame();for(let i=0;i<15000&&ai.snapshot().served<5;i++)ai.update(.033,true);s=ai.snapshot();assert.ok(s.served>=5);assert.equal(s.spoiled-s.mouseStolen,0);
});

test('mouse warns before raiding flour, and manual chase prevents theft',()=>{
 const g=createBakeryGame();for(let i=0;i<300&&g.snapshot().mice.length===0;i++)g.update(.02,false);let s=g.snapshot();assert.equal(s.mice[0].state,'warning');assert.equal(s.flour,6);while(!g.snapshot().mouseStolen)g.update(.02,false);s=g.snapshot();assert.equal(s.flour,4);assert.equal(s.mice[0].state,'flee');
 const guarded=createBakeryGame();move(guarded,25,230);for(let i=0;i<300&&guarded.snapshot().mice.length===0;i++)guarded.update(.02,false);guarded.input('Shift',true);guarded.input('Shift',false);s=guarded.snapshot();assert.equal(s.miceChased,1);assert.equal(s.mice[0].state,'flee');for(let i=0;i<40;i++)guarded.update(.02,false);assert.equal(guarded.snapshot().flour,6);
});

test('a rack raid delays the existing dough and marks it nibbled',()=>{
 const g=createBakeryGame();for(let i=0;i<400&&g.snapshot().mouseStolen===0;i++)g.update(.02,false);assert.equal(g.snapshot().mouseStolen,1);
 makeRack(g);let seen=false;for(let i=0;i<500;i++){g.update(.02,false);const s=g.snapshot();if(s.rack[0]?.quality==='nibbled'){assert.equal(s.rack.length,1);assert.equal(s.mouseStolen,2);seen=true;break}}assert.ok(seen,'rack-targeting raid should reach and nibble the loaf');
});

test('held stoke acts each frame after movement and takes priority over work',()=>{const cues=[],g=createBakeryGame(c=>cues.push(c));move(g,70,440);const before=g.snapshot().heat;g.input('z',true);g.input(' ',true);for(let i=0;i<3;i++)g.update(1/60,false);g.input('z',false);g.input(' ',false);assert.equal(cues.filter(c=>c==='bakery-stoke').length,3);assert.equal(g.snapshot().heat,100);assert.ok(before<52);assert.equal(g.snapshot().oven.length,0)});
test('AI stokes while preparing its loaf and continues through service',()=>{const cues=[],g=createBakeryGame(c=>cues.push(c));for(let i=0;i<12000&&!g.snapshot().served;i++)g.update(1/60,true);assert.ok(cues.includes('bakery-stoke'));assert.ok(g.snapshot().served>0)});


test('manual held stoking matches across 30 Hz and 60 Hz updates',()=>{const run=dt=>{const g=createBakeryGame();move(g,70,440);g.input('z',true);for(let i=0;i<Math.round(.2/dt);i++)g.update(dt,false);g.input('z',false);return g.snapshot()};const a=run(1/60),b=run(1/30);assert.equal(a.heat,b.heat);assert.equal(a.notice,b.notice)});
test('AI bakery state matches across 30 Hz and 60 Hz updates',()=>{const run=dt=>{const g=createBakeryGame();for(let i=0;i<Math.round(20/dt);i++)g.update(dt,true);return g.snapshot()};assert.deepEqual(run(1/60),run(1/30))});

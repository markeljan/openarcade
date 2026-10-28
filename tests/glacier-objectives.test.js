import test from 'node:test';
import assert from 'node:assert/strict';
import {createGlacierGame,glacierHungryChick} from '../src/feature-games32.js';

function moveTo(game,target,{slide=false}={}){
 if(slide)game.input(' ',true);
 for(let n=0;n<2500;n++){
  const {penguin}=game.snapshot(),dx=target.x-penguin.x,dy=target.y-penguin.y;
  for(const [key,on] of [['ArrowLeft',dx< -3],['ArrowRight',dx>3],['ArrowUp',dy< -3],['ArrowDown',dy>3]])game.input(key,on);
  if(Math.abs(dx)<5&&Math.abs(dy)<5)break;
  game.update(.02,false);
 }
 for(const key of ['ArrowLeft','ArrowRight','ArrowUp','ArrowDown',' ','z'])game.input(key,false);
 const p=game.snapshot().penguin;assert.ok(Math.hypot(p.x-target.x,p.y-target.y)<10,`could not reach ${JSON.stringify(target)} from ${JSON.stringify(p)}`);
}

function startSlideRun(g){g.input(' ',true);g.input('ArrowUp',true);for(let i=0;i<100&&g.snapshot().fishRun.phase==='idle';i++)g.update(.02,false);g.input(' ',false);g.input('ArrowUp',false);assert.equal(g.snapshot().fishRun.phase,'outbound');}

test('manual catch, feed and stranded-chick reunion are separate outcomes',()=>{
 const g=createGlacierGame();moveTo(g,{x:68,y:278},{slide:true});g.input('x',true);for(let i=0;i<30;i++)g.update(.02,false);
 let state=g.snapshot();assert.equal(state.fishHeld,1);assert.equal(state.score,0,'catching alone should not score a feeding');assert.equal(state.holes[0].stock,1);
 moveTo(g,{x:258,y:578});g.input(' ',true);g.input(' ',false);state=g.snapshot();assert.equal(state.fishHeld,0);assert.equal(state.fed,1);assert.equal(state.warmth,1);assert.equal(state.score,125);
 moveTo(g,{x:148,y:450},{slide:true});moveTo(g,{x:242,y:364},{slide:true});state=g.snapshot();assert.equal(state.chickHeld,true);assert.equal(state.stranded.state,'carried');assert.equal(state.stranded.x,state.penguin.x+state.penguin.facing*14);assert.equal(state.stranded.y,state.penguin.y-10);
 moveTo(g,{x:210,y:558});state=g.snapshot();assert.equal(state.stranded.state,'reunited');assert.equal(state.rescues,1);assert.equal(state.warmth,2);assert.equal(state.stones,3);assert.equal(state.score,350);
});

test('AI feeds multiple chicks, reunites the stranded chick and raises nursery stage',()=>{
 const g=createGlacierGame();for(let i=0;i<4500&&(g.snapshot().fed<4||g.snapshot().rescues<1);i++)g.update(.033,true);
 const state=g.snapshot();assert.ok(state.fed>=4);assert.equal(state.rescues,1);assert.equal(state.stranded.state,'reunited');assert.ok(state.warmth>=5);assert.ok(state.stage>=1);assert.ok(state.score>=725);
});

test('bridge rescue requires a belly slide to begin the crossing',()=>{
 const g=createGlacierGame();moveTo(g,{x:68,y:278},{slide:true});g.input('x',true);for(let i=0;i<30;i++)g.update(.02,false);moveTo(g,{x:258,y:578});g.input(' ',true);g.input(' ',false);
 moveTo(g,{x:148,y:450});assert.equal(g.snapshot().bridge.mission,'approach');g.input(' ',true);g.update(.02,false);g.input(' ',false);assert.equal(g.snapshot().bridge.mission,'approach','stationary slide input should not start crossing');moveTo(g,{x:200,y:510});moveTo(g,{x:148,y:450},{slide:true});assert.equal(g.snapshot().bridge.mission,'crossing');assert.equal(g.snapshot().bridge.crossings,1);
});
test('thin ice warns before breaking and can be escaped',()=>{
 const g=createGlacierGame();moveTo(g,{x:44,y:446});let seen=false;for(let i=0;i<100;i++){g.update(.02,false);if(g.snapshot().cracks[4].warn>0){seen=true;break}}assert.ok(seen,'standing on thin ice should produce a warning');assert.equal(g.snapshot().cracks[4].broken,0);g.input('ArrowRight',true);for(let i=0;i<35;i++)g.update(.02,false);g.input('ArrowRight',false);const s=g.snapshot();assert.ok(s.cracks[4].broken>0,'warned ice should break');assert.notEqual(s.notice,'ICE BROKE','moving clear avoids the break');
});
test('seal tells before lunging and AI uses the same bridge progression',()=>{
 const g=createGlacierGame();moveTo(g,{x:250,y:405});let tell=false,lunge=false,locked;for(let i=0;i<200;i++){g.update(.02,false);const s=g.snapshot();if(s.seal.state==='tell'){tell=true;locked??={x:s.seal.tx,y:s.seal.ty};assert.equal(s.seal.tx,locked.x);assert.equal(s.seal.ty,locked.y)}if(s.seal.state==='lunge'){lunge=true;break}}assert.ok(tell&&lunge,'seal should telegraph its lunge');
 const ai=createGlacierGame(),seen=new Set();for(let i=0;i<4500&&ai.snapshot().rescues<1;i++){ai.update(.033,true);seen.add(ai.snapshot().bridge.mission)}assert.ok(seen.has('approach'));assert.ok(seen.has('crossing'));assert.equal(ai.snapshot().bridge.mission,'reunited');
});

test('only a committed slide, chosen fishing hole, and promised chick unlock the bridge',()=>{
 const g=createGlacierGame();moveTo(g,{x:68,y:278});g.input('x',true);for(let i=0;i<30;i++)g.update(.02,false);assert.equal(g.snapshot().fishRun.phase,'idle');moveTo(g,{x:60,y:584});g.input(' ',true);g.input(' ',false);let s=g.snapshot();assert.equal(s.fed,1);assert.equal(s.warmth,0);assert.equal(s.slideFeedings,0);for(let i=0;i<10;i++)g.update(.02,false);assert.equal(g.snapshot().bridge.mission,'waiting','ordinary feeding must not unlock the bridge');
 startSlideRun(g);s=g.snapshot();assert.equal(s.fishRun.phase,'outbound');assert.equal(s.fishRun.chick,2);moveTo(g,s.holes[s.fishRun.hole],{slide:true});g.input('x',true);for(let i=0;i<30;i++)g.update(.02,false);s=g.snapshot();assert.equal(s.fishRun.phase,'returning');assert.equal(s.bridge.mission,'waiting');g.input('z',true);g.input('z',false);moveTo(g,{x:258,y:578},{slide:true});g.input(' ',true);g.input(' ',false);s=g.snapshot();assert.equal(s.slideFeedings,1);assert.equal(s.warmth,1);g.update(.02,false);assert.equal(g.snapshot().bridge.mission,'approach');
});

test('feeding a different chick does not complete the promised fish run',()=>{
 const g=createGlacierGame();moveTo(g,{x:68,y:278},{slide:true});assert.equal(g.snapshot().fishRun.chick,2);g.input('x',true);for(let i=0;i<30;i++)g.update(.02,false);moveTo(g,{x:60,y:584},{slide:true});g.input(' ',true);g.input(' ',false);g.update(.02,false);const s=g.snapshot();assert.equal(s.fed,1);assert.equal(s.slideFeedings,0);assert.equal(s.fishRun.phase,'idle');assert.equal(s.bridge.mission,'waiting');
});

test('thin ice strains at the reference-scaled 26 pixel radius',()=>{
 const g=createGlacierGame();moveTo(g,{x:66,y:446});let warned=false;for(let i=0;i<100;i++){g.update(.02,false);warned ||= g.snapshot().cracks[4].warn>0}assert.ok(warned,'a penguin 22 pixels from the crack should trigger its warning');
});

test('stationary slide input strains ice at the walking rate',()=>{const g=createGlacierGame();moveTo(g,{x:44,y:446});for(let i=0;i<3;i++)g.update(.02,false);const before=g.snapshot().cracks[4].strain;assert.ok(before<.9);g.input(' ',true);g.update(.02,false);const s=g.snapshot();assert.equal(s.slideFrames,0);assert.ok(Math.abs(s.cracks[4].strain-before-1.625*.02)<1e-8,'idle Space should not count as a fast belly slide');g.input(' ',false)});

test('calving warns before the shelf advances and affects an exposed penguin',()=>{
 const g=createGlacierGame();moveTo(g,{x:280,y:220});let warning=false,before;
 for(let i=0;i<800&&!g.snapshot().shelf.calvings;i++){before=g.snapshot().penguin;g.update(.02,false);if(g.snapshot().shelf.warning>0)warning=true}
 const s=g.snapshot();assert.ok(warning);assert.equal(s.shelf.calvings,1);assert.ok(s.shelf.edge>244);assert.equal(s.notice,'CALVING SHELF SPLASH');assert.ok(s.penguin.vy>0,'calving imparts downward velocity');assert.ok(Math.hypot(s.penguin.x-before.x,s.penguin.y-before.y)<5,'impact changes velocity without teleporting');
});
test('feeding raises nursery shelters and autoplay continues through calving',()=>{
 const g=createGlacierGame();let warned=false;
 for(let i=0;i<5000&&(g.snapshot().fed<6||g.snapshot().shelf.calvings<1);i++){g.update(.033,true);warned ||= g.snapshot().shelf.warning>0}
 const s=g.snapshot();assert.ok(warned);assert.ok(s.shelf.calvings>=1);assert.ok(s.fed>=6);assert.equal(s.shelter,2);assert.equal(s.stage,2);
});

test('manual feeding introduces a second seal at nursery stage one',()=>{
 const g=createGlacierGame();
 for(let n=0;n<10&&g.snapshot().fed<3;n++){if(!g.snapshot().holes[0].stock){moveTo(g,{x:160,y:500});while(!g.snapshot().holes[0].stock)g.update(.02,false)}moveTo(g,{x:68,y:278});g.input('x',true);g.input('x',false);for(let i=0;i<30;i++)g.update(.02,false);moveTo(g,{x:60,y:584});g.input(' ',true);g.input(' ',false)}
 const s=g.snapshot();assert.equal(s.fed,3);assert.equal(s.stage,1);assert.equal(s.seals.length,2);assert.equal(s.seals[1].baseY,340);
});
test('autoplay reaches the third seal as feeding raises the stage',()=>{
 const g=createGlacierGame();let seenSecond=false;for(let i=0;i<16000&&g.snapshot().fed<9;i++){g.update(.033,true);seenSecond ||= g.snapshot().seals.length===2}
 const s=g.snapshot();assert.ok(seenSecond);assert.ok(s.fed>=9);assert.equal(s.seals.length,3);assert.equal(s.stage,3);
});

test('fish run needs eight fast held-slide frames and release interrupts qualification',()=>{
 const g=createGlacierGame();g.input(' ',true);g.input('ArrowUp',true);while(g.snapshot().slideFrames<1)g.update(1/60,false);for(let i=0;i<6;i++)g.update(1/60,false);let s=g.snapshot();assert.equal(s.slideFrames,7);assert.equal(s.fishRun.phase,'idle');g.input(' ',false);g.update(1/60,false);assert.equal(g.snapshot().slideFrames,5);assert.equal(g.snapshot().fishRun.phase,'idle');g.input(' ',true);for(let i=0;i<2;i++)g.update(1/60,false);assert.equal(g.snapshot().fishRun.phase,'idle');g.update(1/60,false);s=g.snapshot();assert.equal(s.slideFrames,8);assert.equal(s.fishRun.phase,'outbound');assert.ok(s.boost>0);
});

test('manual sliding accelerates, coasts and spends its committed boost',()=>{
 const g=createGlacierGame();g.input(' ',true);g.input('ArrowRight',true);g.update(.02,false);let first=g.snapshot();assert.ok(first.penguin.vx>0&&first.penguin.vx<130);assert.equal(first.boost,0);for(let i=0;i<50&&!g.snapshot().boost;i++)g.update(.02,false);const committed=g.snapshot();assert.ok(committed.boost>0);for(let i=0;i<5;i++)g.update(.02,false);let moving=g.snapshot();assert.ok(moving.penguin.vx>first.penguin.vx);assert.ok(moving.boost<committed.boost);g.input('ArrowRight',false);const before=g.snapshot().penguin.x;g.update(.02,false);assert.ok(g.snapshot().penguin.x>before,'slide should coast after releasing steering');for(let i=0;i<70;i++)g.update(.02,false);assert.equal(g.snapshot().boost,0);g.input(' ',false);
});
test('autoplay uses and exhausts the same committed slide boost',()=>{
 const g=createGlacierGame();let boosted=false,spent=false;for(let i=0;i<2000&&!spent;i++){g.update(.033,true);const s=g.snapshot();boosted ||= s.boost>0;spent ||= boosted&&s.fishRun.phase!=='idle'&&s.boost===0}assert.ok(boosted&&spent);
});

test('manual fish run promises the chick least recently fed when counts tie',()=>{
 const g=createGlacierGame();for(const chick of [{x:60,y:584},{x:158,y:604},{x:258,y:578}]){const before=g.snapshot().fed;for(let attempt=0;attempt<8&&g.snapshot().fed===before;attempt++){moveTo(g,{x:68,y:278});while(!g.snapshot().holes[0].stock)g.update(.02,false);g.input('x',true);g.input('x',false);for(let i=0;i<30&&!g.snapshot().fishHeld;i++)g.update(.02,false);if(g.snapshot().fishHeld){moveTo(g,chick);g.input(' ',true);g.input(' ',false)}}}
 let s=g.snapshot();assert.deepEqual(s.chicks.map(c=>c.fed),[1,1,1]);assert.ok(s.chicks[0].lastFed<s.chicks[1].lastFed&&s.chicks[1].lastFed<s.chicks[2].lastFed);assert.deepEqual(glacierHungryChick(s.chicks),s.chicks[0]);
});
test('autoplay commits to the hungriest chick using feeding age and count',()=>{
 const g=createGlacierGame();let checked=0;for(let i=0;i<6000&&checked<3;i++){g.update(.033,true);const s=g.snapshot();if(s.fishRun.phase==='outbound'){const min=Math.min(...s.chicks.map(c=>c.lastFed+c.fed*22/60));const selected=s.chicks[s.fishRun.chick];assert.equal(selected.lastFed+selected.fed*22/60,min);checked++}}assert.ok(checked>=3);
});

test('manual hop can board a moving floe and ride its drift',()=>{
 const g=createGlacierGame();moveTo(g,{x:160,y:492});let boarded=false;for(let i=0;i<1000&&!boarded;i++){const s=g.snapshot(),f=s.floes[3],dx=f.x-s.penguin.x;g.input('ArrowRight',dx>3);g.input('ArrowLeft',dx< -3);if(Math.abs(dx)<12&&f.x>45&&f.x<230&&!s.hop){g.input('z',true);g.input('z',false)}g.update(.02,false);boarded=g.snapshot().floes[3].boarded}g.input('ArrowRight',false);g.input('ArrowLeft',false);assert.ok(boarded);const s=g.snapshot();assert.ok(s.hop>0&&s.hop<=1/60,'landing registers with one hop frame remaining');const before=s.penguin.x,fx=s.floes[3].x;for(let i=0;i<10;i++)g.update(.02,false);const after=g.snapshot();assert.ok(after.floes[3].boarded);assert.ok(after.penguin.x<before);assert.ok(after.floes[3].x<fx);g.update(.02,false);const next=g.snapshot();const observed=next.penguin.x-after.penguin.x-next.penguin.vx*.02;assert.ok(Math.abs(observed-after.floes[3].vx*.55*.02)<.01,'floe carries the penguin at 55% of base velocity');
});
test('autoplay boards moving ice and still reunites the chick',()=>{
 const g=createGlacierGame();let boarded=false;for(let i=0;i<8000&&(g.snapshot().rescues<1||!boarded);i++){g.update(.033,true);boarded ||= g.snapshot().floes.some(f=>f.boarded)}assert.ok(boarded);assert.ok(g.snapshot().rescues>=1);
});

test('four floes retain the reference-scaled widths and alternating drift speeds',()=>{
 const g=createGlacierGame(),s=g.snapshot();assert.equal(s.floes.length,4);assert.deepEqual(s.floes.map(f=>f.width).sort((a,b)=>a-b),[48,48,64,64]);assert.deepEqual(s.floes.map(f=>f.vx).sort((a,b)=>a-b),[-51.6,-51.6,45.6,45.6]);for(let i=0;i<30;i++)g.update(.02,false);const next=g.snapshot();assert.ok(next.floes[0].x>s.floes[0].x);assert.ok(next.floes[1].x<s.floes[1].x);
});

test('moving floes travel fully offscreen before wrapping',()=>{const g=createGlacierGame();let beyondOldEdge=false,wrapped=false;for(let i=0;i<600;i++){const before=g.snapshot().floes[0];g.update(1/60,false);const after=g.snapshot().floes[0];if(after.x>344)beyondOldEdge=true;if(after.x<before.x){assert.ok(before.x>386);assert.equal(after.x,-64);wrapped=true;break}}assert.ok(beyondOldEdge);assert.ok(wrapped)});

test('falling through broken ice drops fish and cancels a committed run',()=>{
 const g=createGlacierGame();moveTo(g,{x:68,y:278},{slide:true});g.input('x',true);g.input('x',false);for(let i=0;i<30;i++)g.update(.02,false);assert.equal(g.snapshot().fishRun.phase,'returning');moveTo(g,{x:44,y:446});let warned=false;for(let i=0;i<250&&g.snapshot().fishHeld;i++){g.update(.02,false);warned ||= g.snapshot().cracks[4].warn>0}const s=g.snapshot();assert.ok(warned);assert.equal(s.fishHeld,0);assert.equal(s.fishRun.phase,'idle');assert.equal(s.notice,'FISH LOST THROUGH ICE');
});
test('autoplay responds to cracking ice and continues its fish runs',()=>{
 const g=createGlacierGame();moveTo(g,{x:44,y:446});for(let i=0;i<150&&!g.snapshot().cracks[4].warn;i++)g.update(.02,false);assert.ok(g.snapshot().cracks[4].warn>0);let escaped=false;for(let i=0;i<6000&&(!escaped||g.snapshot().fed<4);i++){g.update(.033,true);const s=g.snapshot(),q=s.cracks[4];if(q.broken>0&&Math.hypot(q.x-s.penguin.x,q.y-s.penguin.y)>20)escaped=true}assert.ok(escaped);assert.ok(g.snapshot().fed>=4);
});

test('autoplay anticipates floes and spaces its hops while completing the rescue',()=>{
 const g=createGlacierGame(),times=[];let previous=-10;for(let i=0;i<8000&&(g.snapshot().rescues<1||times.length<2);i++){g.update(.033,true);const s=g.snapshot();if(s.lastAutoHop!==previous){times.push(s.lastAutoHop);previous=s.lastAutoHop}}const s=g.snapshot();assert.ok(s.autoFloeHops>=1);assert.ok(times.length>=2);for(let i=1;i<times.length;i++)assert.ok(times[i]-times[i-1]>=52/60-1e-8);assert.ok(s.rescues>=1);
});

test('shelf warns at the reference cadence before a scaled thirty-pixel calving',()=>{
 const g=createGlacierGame();for(let i=0;i<515;i++)g.update(.02,false);let s=g.snapshot();assert.equal(s.shelf.warning,0);assert.equal(s.shelf.edge,244);for(let i=0;i<5&&!g.snapshot().shelf.warning;i++)g.update(.02,false);s=g.snapshot();assert.ok(s.shelf.warning>0);assert.equal(s.shelf.calvings,0);for(let i=0;i<60&&!g.snapshot().shelf.calvings;i++)g.update(.02,false);s=g.snapshot();assert.equal(s.shelf.calvings,1);assert.equal(s.shelf.edge,274);
});
test('stranded chick follows bridge drift and autoplay retreats before calving',()=>{
 const g=createGlacierGame(),first=g.snapshot();for(let i=0;i<20;i++)g.update(.02,false);let s=g.snapshot();assert.notEqual(s.stranded.x,first.stranded.x);assert.equal(s.stranded.x,s.bridge.x+46);moveTo(g,{x:160,y:260});for(let i=0;i<600&&!g.snapshot().shelf.warning;i++)g.update(.02,false);assert.ok(g.snapshot().shelf.warning>0);for(let i=0;i<80&&!g.snapshot().shelf.calvings;i++)g.update(.02,true);s=g.snapshot();assert.equal(s.shelf.calvings,1);assert.notEqual(s.notice,'CALVING SHELF SPLASH');assert.ok(s.penguin.y>=s.shelf.edge+16);
});

test('equal hunger selects the last chick for manual and AI commitments',()=>{
 const manual=createGlacierGame();startSlideRun(manual);assert.equal(manual.snapshot().fishRun.chick,2);
 const auto=createGlacierGame();for(let i=0;i<40&&auto.snapshot().fishRun.phase==='idle';i++)auto.update(.02,true);const s=auto.snapshot();assert.equal(s.fishRun.phase,'outbound');assert.equal(s.fishRun.chick,2);
});

test('eight scaled thin-ice sites warn for 34 frames before breaking',()=>{
 const g=createGlacierGame();assert.deepEqual(g.snapshot().cracks.map(q=>[q.x,q.y]),[[44,344],[120,344],[196,344],[272,344],[44,446],[120,446],[196,446],[272,446]]);moveTo(g,{x:44,y:446});while(!g.snapshot().cracks[4].warn)g.update(.01,false);for(let i=0;i<55;i++)g.update(.01,false);assert.equal(g.snapshot().cracks[4].broken,0);for(let i=0;i<3;i++)g.update(.01,false);assert.ok(g.snapshot().cracks[4].broken>1.8);
});

test('manual wrong-hole catch preserves the outbound promise for a later proper run',()=>{
 const g=createGlacierGame();startSlideRun(g);let s=g.snapshot();assert.equal(s.fishRun.hole,0);assert.equal(s.fishRun.chick,2);moveTo(g,{x:236,y:316});g.input('x',true);g.input('x',false);for(let i=0;i<30&&!g.snapshot().fishHeld;i++)g.update(.02,false);s=g.snapshot();assert.equal(s.fishHeld,1);assert.equal(s.fishRun.phase,'outbound');g.input('z',true);g.input('z',false);moveTo(g,{x:258,y:578});g.input(' ',true);g.input(' ',false);s=g.snapshot();assert.equal(s.fed,1);assert.equal(s.slideFeedings,0);assert.equal(s.fishRun.phase,'outbound');assert.equal(s.fishRun.hole,0);assert.equal(s.fishRun.chick,2);assert.equal(s.bridge.mission,'waiting');
});
test('autoplay completes an existing outbound promise after a wrong-hole catch',()=>{
 const g=createGlacierGame();startSlideRun(g);moveTo(g,{x:236,y:316});g.input('x',true);g.input('x',false);for(let i=0;i<30&&!g.snapshot().fishHeld;i++)g.update(.02,false);assert.equal(g.snapshot().fishRun.phase,'outbound');assert.equal(g.snapshot().fishHeld,1);for(let i=0;i<9000&&g.snapshot().slideFeedings<1;i++)g.update(.033,true);const s=g.snapshot();assert.ok(s.fed>=2);assert.ok(s.slideFeedings>=1);assert.notEqual(s.bridge.mission,'waiting');
});

test('manual dives can carry two fish, and each feeding consumes one',()=>{
 const g=createGlacierGame();moveTo(g,{x:68,y:278});for(let n=0;n<2;n++){g.input('x',true);g.input('x',false);for(let i=0;i<30;i++)g.update(.02,false)}let s=g.snapshot();assert.equal(s.fishHeld,2);assert.equal(s.holes[0].stock,0);moveTo(g,{x:258,y:578});g.input(' ',true);g.input(' ',false);s=g.snapshot();assert.equal(s.fishHeld,1);assert.equal(s.chicks[2].fed,1);moveTo(g,{x:158,y:604});g.input(' ',true);g.input(' ',false);s=g.snapshot();assert.equal(s.fishHeld,0);assert.equal(s.fed,2);
});
test('broken ice drops one of two fish and autoplay feeds the remaining fish',()=>{
 const g=createGlacierGame();moveTo(g,{x:68,y:278});for(let n=0;n<2;n++){g.input('x',true);g.input('x',false);for(let i=0;i<30;i++)g.update(.02,false)}assert.equal(g.snapshot().fishHeld,2);moveTo(g,{x:44,y:446});for(let i=0;i<250&&g.snapshot().fishHeld===2;i++)g.update(.02,false);let s=g.snapshot();assert.equal(s.fishHeld,1);assert.equal(s.notice,'FISH LOST THROUGH ICE');for(let i=0;i<4000&&g.snapshot().fed<1;i++)g.update(.033,true);s=g.snapshot();assert.ok(s.fed>=1);assert.equal(s.chicks[2].fed,1);
});

test('manual diving requires a nearby stocked hole and advances the world during the dive',()=>{
 const g=createGlacierGame();moveTo(g,{x:160,y:460});g.input('x',true);g.input('x',false);assert.equal(g.snapshot().diveTime,0);moveTo(g,{x:68,y:278});g.input('x',true);g.input('x',false);let s=g.snapshot();assert.ok(s.diveTime>0);const x=s.floes[1].x,p={...s.penguin};let excursion=0;for(let i=0;i<20;i++){g.update(.02,false);const q=g.snapshot().penguin;excursion=Math.max(excursion,Math.hypot(q.x-p.x,q.y-p.y))}s=g.snapshot();assert.ok(s.diveTime>0);assert.notEqual(s.floes[1].x,x);assert.ok(excursion>1);for(let i=0;i<8;i++)g.update(.02,false);assert.equal(g.snapshot().fishHeld,1);
});
test('empty fishing hole restocks after the stage-scaled delay',()=>{
 const g=createGlacierGame();moveTo(g,{x:68,y:278});for(let n=0;n<2;n++){g.input('x',true);g.input('x',false);for(let i=0;i<26;i++)g.update(.02,false)}let s=g.snapshot();assert.equal(s.holes[0].stock,0);assert.ok(s.holes[0].restock>3.2&&s.holes[0].restock<=3.25);moveTo(g,{x:160,y:500});while(g.snapshot().holes[0].restock>.04)g.update(.02,false);assert.equal(g.snapshot().holes[0].stock,0);for(let i=0;i<4;i++)g.update(.02,false);assert.equal(g.snapshot().holes[0].stock,2);
});
test('autoplay dives and resumes feeding and rescue while hazards continue',()=>{
 const g=createGlacierGame();let diving=false,movingHazard=false,prev;for(let i=0;i<8000&&g.snapshot().rescues<1;i++){g.update(.033,true);const s=g.snapshot();if(s.diveTime>0){diving=true;if(prev!==undefined&&s.seal.x!==prev)movingHazard=true;prev=s.seal.x}else prev=undefined}assert.ok(diving);assert.ok(movingHazard);assert.ok(g.snapshot().fed>=1);assert.equal(g.snapshot().rescues,1);
});

test('autoplay dives only at its promised hole when the featured hole rotates',()=>{
 const g=createGlacierGame();let sawFirst=false,sawSecond=false;for(let i=0;i<12000&&!(sawFirst&&sawSecond);i++){g.update(.033,true);const s=g.snapshot();if(s.diveTime>0&&s.fishRun.phase==='outbound'){const h=s.holes[s.fishRun.hole];assert.ok(Math.hypot(h.x-s.penguin.x,h.y-s.penguin.y)<38);if(s.fishRun.hole===0)sawFirst=true;if(s.fishRun.hole===1)sawSecond=true}}assert.ok(sawFirst);assert.ok(sawSecond);
});

test('manual penguin can catch from the added lower-right fishing hole',()=>{
 const g=createGlacierGame();let s=g.snapshot();assert.equal(s.holes.length,5);assert.deepEqual(s.holes.map(h=>[h.x,h.y]),[[68,278],[236,316],[154,384],[78,444],[238,504]]);moveTo(g,{x:238,y:504});g.input('x',true);g.input('x',false);for(let i=0;i<30;i++)g.update(.02,false);s=g.snapshot();assert.equal(s.fishHeld,1);assert.equal(s.holes[4].stock,1);assert.equal(s.holes[0].stock,2);
});
test('autoplay uses additional fishing holes and still reunites the chick',()=>{
 const g=createGlacierGame(),visited=new Set();for(let i=0;i<18000&&(g.snapshot().rescues<1||!Array.from(visited).some(i=>i>=2));i++){g.update(.033,true);const s=g.snapshot();if(s.diveTime>0&&s.fishRun.phase==='outbound')visited.add(s.fishRun.hole)}assert.ok(Array.from(visited).some(i=>i>=2),`visited holes ${[...visited]}`);assert.equal(g.snapshot().rescues,1);
});

test('nursery, bridge and ordered fishing holes use reference-scaled geometry',()=>{
 const s=createGlacierGame().snapshot();assert.deepEqual(s.holes.map(h=>[h.x,h.y]),[[68,278],[236,316],[154,384],[78,444],[238,504]]);assert.deepEqual(s.chicks.map(c=>[c.x,c.y]),[[60,584],[158,604],[258,578]]);assert.deepEqual([s.bridge.x,s.bridge.y],[196,404]);assert.deepEqual([s.stranded.x,s.stranded.y],[242,364]);
});
test('seal patrols on a clock, stalks, then commits its predicted lunge aim',()=>{const g=createGlacierGame();for(let i=0;i<90;i++)g.update(1/60,false);assert.equal(g.snapshot().seal.state,'patrol');for(let i=0;i<8;i++)g.update(1/60,false);assert.equal(g.snapshot().seal.state,'stalk');for(let i=0;i<38;i++)g.update(1/60,false);let s=g.snapshot();assert.equal(s.seal.state,'tell');const aim=[s.seal.tx,s.seal.ty];g.input('ArrowLeft',true);for(let i=0;i<32;i++)g.update(1/60,false);s=g.snapshot();assert.equal(s.seal.state,'lunge');assert.deepEqual([s.seal.tx,s.seal.ty],aim)});

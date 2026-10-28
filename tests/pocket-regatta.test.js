import test from 'node:test';
import assert from 'node:assert/strict';
import {createPocketRegatta,regattaWind,regattaCurrent,regattaCrossingThreat,regattaRivalSteerage,regattaDuelReward,regattaLaylineReward} from '../src/feature-games24.js';
test('manual helm, trim, ease, tack and yield affect sailing',()=>{
 const g=createPocketRegatta(),start=g.snapshot();g.input('ArrowRight',true);g.input('ArrowUp',true);g.update(.25,false);g.input('ArrowRight',false);g.input('ArrowUp',false);let s=g.snapshot();assert.ok(s.boat.heading>start.boat.heading);assert.ok(s.trim>start.trim);assert.notDeepEqual([s.boat.x,s.boat.y],[start.boat.x,start.boat.y]);
 g.input('x',true);g.update(.2,false);g.input('x',false);assert.ok(g.snapshot().trim<s.trim);for(let i=0;i<100&&g.snapshot().tack>0;i++)g.update(.01,false);const headingBeforeTack=g.snapshot().boat.heading;g.input(' ',true);assert.notEqual(g.snapshot().boat.heading,headingBeforeTack);g.input('z',true);assert.equal(g.snapshot().yieldTime,0,'yield requires a crossing');
});
test('gust warns before striking and eased sails weather it',()=>{
 const g=createPocketRegatta();for(let i=0;i<52;i++)g.update(.05,false);assert.equal(g.snapshot().gust,'warning');for(let i=0;i<16;i++)g.update(.05,false);const s=g.snapshot();assert.equal(s.gust,'active');assert.equal(s.weathered,1);
});
test('AI rounds four authored courses while rivals sail their own marks',()=>{
 const g=createPocketRegatta();let rivalAdvanced=false;for(let i=0;i<12000&&g.snapshot().course<5;i++){g.update(.05,true);rivalAdvanced ||= g.snapshot().rivals.some(r=>r.mark>0)}const s=g.snapshot();assert.deepEqual(s.completed.slice(0,4),['CEDAR SOUND','NEEDLE REACH','GOLDEN KEYS','MOONWAKE BAY']);assert.ok(rivalAdvanced);assert.ok(s.currents>0);assert.ok(s.weathered>0);
});

test('manual sailor can yield only during a warned rival crossing',()=>{const g=createPocketRegatta();let s;for(let i=0;i<4000;i++){g.update(1/60,false);s=g.snapshot();if(s.crossing)break}assert.ok(s.crossing,'no crossing warning');const heading=s.boat.heading;g.input('z',true);s=g.snapshot();assert.equal(s.rightsYielded,1);assert.equal(s.crossing.yielded,true);assert.notEqual(s.boat.heading,heading);g.input('z',true);assert.equal(g.snapshot().rightsYielded,1,'same crossing was yielded twice');});
test('preview yields to approaching rivals',()=>{const g=createPocketRegatta();let warned=false;for(let i=0;i<5000;i++){g.update(1/60,true);const s=g.snapshot();warned ||= !!s.crossing;if(s.rightsYielded){assert.ok(warned);return}}assert.fail('preview never yielded at a warned crossing');});
test('trim uses discrete sheets with a cooldown, and tacks count only after crossing wind',()=>{const old=Math.random;Math.random=()=>.5;try{const g=createPocketRegatta();g.update(.25,false);const start=g.snapshot();g.input('ArrowUp',true);g.update(.01,false);let s=g.snapshot();assert.ok(Math.abs(s.trim-start.trim-.095)<1e-8);assert.equal(s.sailTrims,1);g.update(.2,false);assert.equal(g.snapshot().sailTrims,1);g.update(.11,false);assert.equal(g.snapshot().sailTrims,2);g.input('ArrowUp',false);const before=g.snapshot().tacksCompleted;g.input(' ',true);g.input(' ',false);assert.equal(g.snapshot().tacksCompleted,before,'a tack command alone is not a crossing');g.input('ArrowRight',true);for(let i=0;i<100&&g.snapshot().tacksCompleted===before;i++)g.update(.01,false);g.input('ArrowRight',false);assert.equal(g.snapshot().tacksCompleted,before+1);assert.ok(g.snapshot().tack>0);}finally{Math.random=old}});

test('wind oscillates and gusts shift direction and increase force',()=>{const base=-1.1,phase=.2,t=1;const calm=regattaWind(base,phase,t,'calm',1),gust=regattaWind(base,phase,t,'active',-1);assert.ok(Math.abs(calm.angle-(base+Math.sin(60*.008+phase)*.33))<1e-10);assert.ok(Math.abs(gust.angle-calm.angle+.38)<1e-10);assert.ok(Math.abs(gust.power-calm.power-.42)<1e-10);});

test('mark duel reward requires a completed tack, room and a rival behind at rounding',()=>{const boat={x:100,y:100},mark={x:100,y:100},rival={x:130,y:100,mark:0},duel={phase:'tacking',tacked:true,roomHeld:true,course:1,mark:0};assert.ok(regattaDuelReward(duel,boat,rival,mark,1,0));assert.equal(regattaDuelReward({...duel,tacked:false},boat,rival,mark,1,0),false);assert.equal(regattaDuelReward({...duel,roomHeld:false},boat,rival,mark,1,0),false);assert.equal(regattaDuelReward(duel,boat,{...rival,x:102},mark,1,0),false);});
test('AI encounters a rival and begins mark-duel setup',()=>{const old=Math.random;let seed=3;Math.random=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296);try{const g=createPocketRegatta();let observed=false;for(let i=0;i<6000;i++){g.update(1/60,true);if(g.snapshot().duelAttempts){observed=true;break}}assert.ok(observed);}finally{Math.random=old}});
test('AI completes a physical mark duel during a seeded race',()=>{const old=Math.random;let seed=3;Math.random=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296);try{const g=createPocketRegatta();for(let i=0;i<15000&&!g.snapshot().duelWins;i++)g.update(1/60,true);const s=g.snapshot();assert.ok(s.duelWins>0);assert.ok(s.duelAttempts>=s.duelWins);}finally{Math.random=old}});

test('manual sailor can commit a warned layline tack after yielding a crossing',()=>{
 const old=Math.random;let seed=1;Math.random=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296);try{const g=createPocketRegatta();let s;for(let i=0;i<6000;i++){g.update(1/60,false);s=g.snapshot();if(s.layline.phase==='setup')break}assert.equal(s.layline.phase,'setup');for(let i=0;i<60;i++){s=g.snapshot();if(s.crossing&&!s.crossing.yielded){g.input('z',true);g.input('z',false)}if(s.layline.timer>=10/60&&s.tack<=0)break;g.update(1/60,false)}g.input(' ',true);g.input(' ',false);s=g.snapshot();assert.equal(s.layline.phase,'committed');assert.equal(s.layline.crossedWind,false,'commit alone is not a completed tack');}finally{Math.random=old}
});
test('layline overtake requires crossing wind, clear water and a rival behind',()=>{
 const boat={x:100,y:100},mark={x:100,y:100},rival={x:150,y:100,mark:0},l={phase:'committed',crossedWind:true,course:1,mark:0,entryLead:0,rival:0};assert.ok(regattaLaylineReward(l,boat,rival,mark,1,0,null));assert.equal(regattaLaylineReward({...l,crossedWind:false},boat,rival,mark,1,0,null),false);assert.equal(regattaLaylineReward(l,boat,{...rival,x:120},mark,1,0,null),false);assert.equal(regattaLaylineReward(l,boat,rival,mark,1,0,{rival:0,yielded:false}),false);assert.ok(regattaLaylineReward(l,boat,rival,mark,1,0,{rival:0,yielded:true}));
});
test('AI completes a physical layline overtake in a seeded race',()=>{
 const old=Math.random;let seed=1;Math.random=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296);try{const g=createPocketRegatta();for(let i=0;i<12000&&!g.snapshot().laylineWins;i++)g.update(1/60,true);const s=g.snapshot();assert.ok(s.laylineAttempts>0);assert.ok(s.laylineWins>0);assert.ok(s.score>=110)}finally{Math.random=old}
});

test('tidal currents vary with wind phase, flow in both axes and stop near shore',()=>{
 const left=regattaCurrent(100,400,0,0),leftLater=regattaCurrent(100,400,Math.PI/(2*.54),0),right=regattaCurrent(220,400,0,0);
 assert.equal(left.lane,0);assert.ok(left.x>0&&left.y<0);assert.ok(leftLater.x>left.x&&leftLater.y<left.y);assert.equal(right.lane,1);assert.ok(right.x<0&&right.y>0);
 assert.equal(regattaCurrent(100,135,0,0).lane,-1);assert.equal(regattaCurrent(220,631,0,0).lane,-1);assert.equal(regattaCurrent(160,400,0,0).lane,-1);
});
test('manual sailor and AI physically enter tidal currents',()=>{
 const old=Math.random;Math.random=()=>.5;try{for(const auto of [false,true]){const g=createPocketRegatta();if(!auto)g.input('ArrowLeft',true);for(let i=0;i<300&&g.snapshot().currents===0;i++)g.update(1/60,auto);if(!auto)g.input('ArrowLeft',false);assert.ok(g.snapshot().currents>0);assert.ok(Number.isFinite(g.snapshot().boat.vx));}}finally{Math.random=old}
});

test('crossing warning uses reference closing-speed units',()=>{
 const boat={x:0,y:0,vx:0,vy:0},rival={x:100,y:0,vx:.1,vy:0};assert.equal(regattaCrossingThreat(boat,rival),true,'slowly separating boats still warn');assert.equal(regattaCrossingThreat(boat,{...rival,vx:.5}),false,'rapidly separating boats outside the close zone do not warn');assert.equal(regattaCrossingThreat(boat,{...rival,x:60,vx:2}),true,'close boats warn regardless of closing speed');assert.equal(regattaCrossingThreat(boat,{...rival,x:115,vx:-1}),false,'outside warning range');
});

test('a held yield control responds when a later crossing appears',()=>{
 const old=Math.random;Math.random=()=>.5;try{const g=createPocketRegatta();g.input('z',true);let warned=false;for(let i=0;i<1000;i++){g.update(1/60,false);const s=g.snapshot();if(s.crossing&&!s.crossing.yielded)warned=true;if(s.rightsYielded>0){assert.ok(warned);assert.equal(s.rightsYielded,1);assert.equal(s.crossing.yielded,true);for(let j=0;j<10;j++)g.update(1/60,false);assert.equal(g.snapshot().rightsYielded,1);return}}assert.fail('no crossing was yielded')}finally{Math.random=old}
});
test('rival steerage adds forward motion only below the reference minimum',()=>{
 const stalled={vx:0,vy:0,heading:Math.PI/2};regattaRivalSteerage(stalled);assert.ok(Math.abs(stalled.vx)<1e-9);assert.ok(Math.abs(stalled.vy-45.6)<1e-9);const fast={vx:50,vy:0,heading:0};regattaRivalSteerage(fast);assert.deepEqual(fast,{vx:50,vy:0,heading:0});
});
test('rival boats hunt, cover, and recover from shore while racing',()=>{
 const old=Math.random;Math.random=()=>.5;try{const g=createPocketRegatta(),seen=new Set();for(let i=0;i<8000&&!(seen.has('hunt')&&seen.has('cover')&&seen.has('shore'));i++){g.update(1/60,true);for(const r of g.snapshot().rivals)seen.add(r.tactic)}assert.ok(seen.has('hunt'));assert.ok(seen.has('cover'));assert.ok(seen.has('shore'));assert.ok(g.snapshot().rivals.some(r=>r.mark>0))}finally{Math.random=old}
});

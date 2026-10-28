import test from 'node:test';
import assert from 'node:assert/strict';
import {drawMachineHuntRobot,drawMachineHuntHero,drawMachineHuntCanopy,drawMachineHuntCorpse,drawMachineHuntLoot,machineHuntTier,machineHuntTierColors,machineHuntBiome,machineHunt} from '../src/feature-games.js';
function canvas(){const calls=[];const c={calls,fillRect(x,y,w,h){calls.push({x,y,w,h,color:this.fillStyle})},beginPath(){},arc(){},ellipse(){},fill(){},fillText(){},save(){},restore(){},translate(){},moveTo(){},lineTo(){},stroke(){}};return c}

test('machine silhouettes and damage bars use distinct reference body dimensions',()=>{
 for(const [kind,width,max] of [[0,10,3],[1,24,5],[2,32,12],[3,52,30]]){const c=canvas(),r={x:100,y:200,kind,hp:max-1,detect:0};drawMachineHuntRobot(c,r,{x:200,y:200},0);assert.ok(c.calls.some(a=>a.color==='#39424d'&&a.w===width),`missing kind ${kind} body`);assert.ok(c.calls.some(a=>a.color==='#ffb020'&&a.w>0&&a.w<28),`missing kind ${kind} damage bar`)}
});

test('manual and AI games render without changing their simulation state',()=>{
 const old=Math.random;try{for(const auto of [false,true]){let seed=42;Math.random=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/2**32);const game=machineHunt();if(!auto)game.input('ArrowUp',true);for(let i=0;i<600;i++)game.update(1/60,auto);const before=game.snapshot(),c=canvas();game.draw(c);assert.deepEqual(game.snapshot(),before);assert.ok(c.calls.some(a=>a.color==='#39424d'),'rendered a machine body');}}finally{Math.random=old}
});


test('hunter renders cover, down, dodge and power-up states without leaking alpha',()=>{
 const hero={x:100,y:200},c=canvas();drawMachineHuntHero(c,hero,{down:true});assert.ok(c.calls.some(a=>a.color==='#8a3b2a'));assert.equal(c.globalAlpha,1);
 c.calls.length=0;drawMachineHuntHero(c,hero,{roll:.2,rollX:0,rollY:-1});assert.ok(c.calls.some(a=>a.color==='#2e5f6e'&&a.w===10&&a.h===10));assert.equal(c.globalAlpha,1);
 let circles=0;c.arc=()=>circles++;drawMachineHuntHero(c,hero,{ward:2,speed:2,covered:true});assert.equal(circles,2);assert.equal(c.globalAlpha,1);
});


test('tree canopy matches generated radius and fades over a hunter underneath',()=>{
 const c=canvas(),calls=[];c.ellipse=(...args)=>calls.push({args,alpha:c.globalAlpha,color:c.fillStyle});const tree={x:100,y:200,r:26};drawMachineHuntCanopy(c,tree,{x:100,y:200},0);assert.equal(calls[0].args[2],26);assert.equal(calls[0].alpha,.7);assert.equal(c.globalAlpha,1);calls.length=0;drawMachineHuntCanopy(c,tree,{x:200,y:200},0);assert.equal(calls[0].alpha,.92);assert.equal(c.globalAlpha,1);
});

test('biome colors change at world seams instead of following the screen',()=>{
 assert.equal(machineHuntBiome(0,550),0);assert.equal(machineHuntBiome(2880,550),1);assert.equal(machineHuntBiome(2870,500),1);assert.equal(machineHuntBiome(2870,600),0);
});


test('defeated machines leave size-matched remains on the ground',()=>{
 for(const [kind,width] of [[0,16],[1,24],[2,32],[3,52]]){const c=canvas();drawMachineHuntCorpse(c,{x:100,y:200,kind});assert.ok(c.calls.some(a=>a.color==='#2b3238'&&a.w===width));}
});

test('manual and AI kills leave remains fixed to the scrolling world',()=>{
 const old=Math.random;try{for(const auto of [false,true]){let seed=42;Math.random=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/2**32);const game=machineHunt();if(!auto){game.input('ArrowUp',true);game.input('x',true)}let before=null;for(let i=0;i<60*120;i++){game.update(1/60,auto);const state=game.snapshot();if(state.corpses.length){before=state;break}if(!auto&&state.gameOver)break}assert.ok(before,`${auto?'AI':'manual'} run should defeat a machine`);const corpse=before.corpses[0];for(let i=0;i<15;i++)game.update(1/60,auto);const after=game.snapshot(),same=after.corpses.find(c=>c.x===corpse.x&&c.kind===corpse.kind);assert.ok(same);assert.ok(Math.abs((same.y-corpse.y)-(after.scroll-before.scroll))<1e-8);const c=canvas();game.draw(c);assert.ok(c.calls.some(a=>a.color==='#2b3238'));}}finally{Math.random=old}
});


test('weapon tiers and colors change at the reference power thresholds',()=>{
 for(const [power,tier] of [[0,0],[5,0],[6,1],[15,1],[16,2],[29,2],[30,3],[49,3],[50,4]])assert.equal(machineHuntTier(power),tier);assert.deepEqual(machineHuntTierColors,['#d9c58a','#cfe8ff','#ff9a4a','#ffb347','#7ef0ff']);
});

test('manual and AI hunts show upgraded bow pips and colored arrows',()=>{
 const old=Math.random;try{for(const auto of [false,true]){let seed=auto?9:11;Math.random=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/2**32);const game=machineHunt();if(!auto){game.input('ArrowUp',true);game.input('x',true)}let found=null;for(let i=0;i<60*200;i++){game.update(1/60,auto);const state=game.snapshot();if(state.arrows.some(a=>a.color==='#cfe8ff')){found=state;break}if(!auto&&state.gameOver)break}assert.ok(found,`${auto?'AI':'manual'} should fire an upgraded arrow`);assert.ok(found.power>=6);const c=canvas();game.draw(c);const pips=c.calls.filter(a=>a.color==='#cfe8ff'&&a.y===42&&a.w===6);assert.equal(pips.length,2);}}finally{Math.random=old}
});


test('loot kinds use distinct reference silhouettes and colors',()=>{
 const expected={heal:['#7ed957',2],power:['#ffd166',2],speed:['#7ef0ff',3],ward:['#ffd166',2],stamina:['#ffe9a8',2]};for(const [kind,[color,count]] of Object.entries(expected)){const c=canvas();drawMachineHuntLoot(c,{x:100,y:200,kind});assert.equal(c.calls.length,count);assert.equal(c.calls[0].color,color)}
 const c=canvas();drawMachineHuntLoot(c,{x:100,y:200,kind:'heal'});assert.ok(c.calls.some(a=>a.w===4&&a.h===12));assert.ok(c.calls.some(a=>a.w===12&&a.h===4));
});

test('manual and AI kills render real heal pickups as green crosses',()=>{
 const old=Math.random;try{for(const auto of [false,true]){let seed=42;Math.random=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/2**32);const game=machineHunt();if(!auto){game.input('ArrowUp',true);game.input('x',true)}let heal=null;for(let i=0;i<60*120;i++){game.update(1/60,auto);const state=game.snapshot();heal=state.loot.find(l=>l.kind==='heal');if(heal||(!auto&&state.gameOver))break}assert.ok(heal,`${auto?'AI':'manual'} should produce a heal pickup`);const c=canvas();game.draw(c);assert.ok(c.calls.some(a=>a.color==='#7ed957'&&a.w===4&&a.h===12&&Math.abs(a.x-heal.x)<4));}}finally{Math.random=old}
});

import test from 'node:test';import assert from 'node:assert/strict';import {garden} from '../src/feature-games8.js';
test('manual and AI garden drawing does not change the simulation or consume randomness',()=>{
 const original=Math.random;let calls=0;Math.random=()=>{calls++;return .4};try{for(const auto of [false,true]){const g=garden();for(let i=0;i<600;i++)g.update(1/60,auto);const before=g.snapshot(),randomBefore=calls,noop=()=>{},ctx=new Proxy({},{get:()=>noop,set:()=>true});g.draw(ctx);g.draw(ctx);assert.deepEqual(g.snapshot(),before);assert.equal(calls,randomBefore)}}finally{Math.random=original}
});

test('early chapter retains its pale celestial mark during a live blood moon',()=>{
 const g=garden();for(let i=0;i<5000;i++)g.update(1/60,true);assert.equal(g.snapshot().moon.phase,'live');const fills=[],noop=()=>{},ctx=new Proxy({fillRect(x,y,w,h){fills.push({x,y,w,h,color:this.fillStyle})}},{get:(o,k)=>k in o?o[k]:noop,set:(o,k,v)=>(o[k]=v,true)});g.draw(ctx);assert.ok(fills.some(v=>v.x===244&&v.y===114&&v.color==='#e6dfa0'));
});

test('manual and AI dawn result cards draw without mutating their completed run',()=>{
 for(const auto of [false,true]){const g=garden();for(let i=0;i<54000;i++)g.update(1/60,auto);assert.equal(g.snapshot().ended,true);const before=g.snapshot(),borders=[],noop=()=>{},ctx=new Proxy({strokeRect(x,y,w,h){borders.push({x,y,w,h,color:this.strokeStyle})}},{get:(o,k)=>k in o?o[k]:noop,set:(o,k,v)=>(o[k]=v,true)});g.draw(ctx);assert.deepEqual(g.snapshot(),before);assert.ok(borders.some(b=>b.x===19&&b.y===241&&b.w===282&&b.h===198&&b.color===(before.greenhouse>0?'#f4c95d':'#d95656')))}
});

test('late formation warnings identify the threatened lane and seed packets show affordability',()=>{
 const original=Math.random;let seed=14;Math.random=()=>{let t=seed+=0x6D2B79F5;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return((t^t>>>14)>>>0)/4294967296};
 try{const g=garden(),noop=()=>{};let labels=[],cards=[];const ctx=new Proxy({fillText(value){labels.push({value,color:this.fillStyle})},fillRect(x,y,w,h){if(y===602&&w===67&&h===51)cards.push({x,alpha:this.globalAlpha})}},{get:(o,k)=>k in o?o[k]:noop,set:(o,k,v)=>(o[k]=v,true)});
 for(let i=0;i<30000;i++)g.update(1/60,true);g.draw(ctx);assert.ok(labels.some(v=>v.value==='BREACH LIKELY · LANE 2'&&v.color==='#d95656'));assert.deepEqual(cards.map(v=>v.alpha),[.42,.42,.42,.42]);
 labels=[];cards=[];for(let i=30000;i<40000;i++)g.update(1/60,true);g.draw(ctx);assert.ok(labels.some(v=>v.value==='BREACH LIKELY · LANE 3'&&v.color==='#d95656'));
 labels=[];cards=[];for(let i=40000;i<53999;i++)g.update(1/60,true);g.draw(ctx);assert.ok(labels.some(v=>v.value==='BREACH LIKELY · LANE 2'));assert.deepEqual(cards.map(v=>v.alpha),[1,.42,.42,.42]);
 }finally{Math.random=original}
});

test('blood moon warning marks its threatened lane in manual and AI play',()=>{
 for(const auto of [false,true]){const g=garden();let s;for(let i=0;i<5000;i++){g.update(1/60,auto);s=g.snapshot();if(s.moon.phase==='warn')break}assert.equal(s.moon.phase,'warn');const fills=[],noop=()=>{},ctx=new Proxy({fillRect(x,y,w,h){fills.push({x,y,w,h,color:this.fillStyle,alpha:this.globalAlpha})}},{get:(o,k)=>k in o?o[k]:noop,set:(o,k,v)=>(o[k]=v,true)});const before=g.snapshot();g.draw(ctx);assert.deepEqual(g.snapshot(),before);const laneY=188+(s.bedPositions.y[s.moon.lane]-176)*(43/52);assert.ok(fills.some(v=>v.x===152&&v.y===Math.round(laneY-34)&&v.w===168&&v.h===68&&v.color==='#d95656'&&v.alpha>=.1&&v.alpha<=.26));}
});

test('late blood moon grows during warning and greenhouse lamps track remaining health',()=>{
 const original=Math.random;let seed=14;Math.random=()=>{let t=seed+=0x6D2B79F5;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return((t^t>>>14)>>>0)/4294967296};
 try{const g=garden(),noop=()=>{};let checked=0;for(let i=0;i<54000;i++){g.update(1/60,true);const s=g.snapshot();if(s.wave<41||s.moon.phase!=='warn'||!(checked===0?s.moon.timer>3.98:s.moon.timer<2.95&&s.moon.timer>2.93))continue;const arcs=[],fills=[],ctx=new Proxy({arc(x,y,r){arcs.push({x,y,r,color:this.fillStyle,alpha:this.globalAlpha})},fillRect(x,y,w,h){if(y===494&&w===4&&h===4&&x>=2&&x<=32)fills.push({x,color:this.fillStyle})}},{get:(o,k)=>k in o?o[k]:noop,set:(o,k,v)=>(o[k]=v,true)});g.draw(ctx);const radius=checked===0?10:12;assert.ok(arcs.some(v=>v.x===256&&v.y===122&&v.r===radius&&v.color==='#d95b63'));assert.equal(fills.filter(v=>v.color==='#92d88c').length,Math.ceil(s.greenhouse/(200/6)));if(++checked===2)break}assert.equal(checked,2,'observe a late warning and its growth');
 }finally{Math.random=original}
});

test('manual and AI combat draws brief enemy hits and plant bite reactions',()=>{
 for(const auto of [false,true]){const old=Math.random;let seed=1;Math.random=()=>{let v=seed+=0x6D2B79F5;v=Math.imul(v^v>>>15,v|1);v^=v+Math.imul(v^v>>>7,v|61);return((v^v>>>14)>>>0)/4294967296};try{const g=garden(),noop=()=>{};let hit=false,bite=false;for(let i=0;i<12000&&(!hit||!bite);i++){g.update(1/60,auto);const s=g.snapshot();if(!s.zombies.some(z=>z.hitT>0)&&!s.plants.some(p=>p.hitT>0))continue;const fills=[],ctx=new Proxy({fillRect(x,y,w,h){fills.push({color:this.fillStyle,alpha:this.globalAlpha})}},{get:(o,k)=>k in o?o[k]:noop,set:(o,k,v)=>(o[k]=v,true)});g.draw(ctx);assert.deepEqual(g.snapshot(),s);if(s.zombies.some(z=>z.hitT>0))hit||=fills.some(v=>v.color==='#f0c3b4');if(s.plants.some(p=>p.hitT>0)&&s.zombies.some(z=>z.biteT>0))bite||=fills.some(v=>v.color==='#f2d0b8'&&v.alpha===.45)}assert.ok(hit,`${auto?'AI':'manual'} projectile hit reaction`);assert.ok(bite,`${auto?'AI':'manual'} bite reaction`)}finally{Math.random=old}}
});

test('manual and AI damaged plants show their remaining health in green or red',()=>{
 for(const auto of [false,true]){const old=Math.random;let seed=1;Math.random=()=>{let v=seed+=0x6D2B79F5;v=Math.imul(v^v>>>15,v|1);v^=v+Math.imul(v^v>>>7,v|61);return((v^v>>>14)>>>0)/4294967296};try{const g=garden(),max={pea:9,wall:20,sun:8,moon:8},noop=()=>{};let green=false,red=false;for(let i=0;i<20000&&(!green||!red);i++){g.update(1/60,auto);if(i%3)continue;const s=g.snapshot(),p=s.plants.find(p=>p.hp<max[p.type]*.95&&(p.hp<=max[p.type]*.4?!red:!green));if(!p)continue;const fills=[],ctx=new Proxy({fillRect(x,y,w,h){fills.push({x,y,w,h,color:this.fillStyle})}},{get:(o,k)=>k in o?o[k]:noop,set:(o,k,v)=>(o[k]=v,true)});g.draw(ctx);assert.deepEqual(g.snapshot(),s);const x=32+(s.bedPositions.x[p.col]-48)*.725-12,y=188+(s.bedPositions.y[p.lane]-176)*(43/52)+23,color=p.hp>max[p.type]*.4?'#92d88c':'#d95656',width=24*p.hp/max[p.type];assert.ok(fills.some(v=>v.x===x&&v.y===y&&v.h===2&&v.color===color&&Math.abs(v.w-width)<1e-8));if(color==='#92d88c')green=true;else red=true}assert.ok(green&&red,`${auto?'AI':'manual'} observes both damage states`)}finally{Math.random=old}}
});

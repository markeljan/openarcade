import test from 'node:test';
import assert from 'node:assert/strict';
import {createFeatureGame12,idol} from '../src/feature-games12.js';
import {createFeatureGame21} from '../src/feature-games21.js';
function harness(make,id,interactive,seed=1,onResult){
 const oldRandom=Math.random;let scheduled,seq=0,frame=0,labels=[];const noop=()=>{};
 Math.random=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/0x100000000);
 globalThis.window={devicePixelRatio:1};globalThis.ResizeObserver=class{observe(){}disconnect(){}};globalThis.requestAnimationFrame=fn=>(scheduled=fn,++seq);globalThis.cancelAnimationFrame=()=>{scheduled=null};
 const ctx=new Proxy({fillText(s){labels.push(s)}},{get:(o,k)=>k in o?o[k]:noop,set:(o,k,v)=>(o[k]=v,true)}),canvas={getContext:()=>ctx,getBoundingClientRect:()=>({width:320,height:720}),setAttribute:noop,addEventListener:noop,removeEventListener:noop},game=make(canvas,id,{interactive,onResult});
 return {game,step(){labels=[];scheduled(++frame*1000/60);return labels},close(){game.destroy();Math.random=oldRandom}};
}
const number=(lines,re)=>{const line=lines.find(s=>re.test(s));return line?Number(line.match(re)[1]):null};
test('Idol Escape takeover starts fresh and a manual crush advances without resetting its run',()=>{
 const records=[],h=harness(createFeatureGame12,'idol-escape',false,1,r=>records.push(r));try{let distance=0;for(let i=0;i<9000&&distance<100;i++)distance=number(h.step(),/^(\d+) M$/)??distance;assert.ok(distance>=100,'preview did not complete a chamber');h.game.setInteractive(true);const first=h.step();assert.equal(number(first,/^(\d+) M$/),0,'AI head start carried into human run');assert.equal(number(first,/^CHAMBER (\d+)$/),1);let caught=false,advanced=false;for(let i=0;i<3000;i++){const lines=h.step(),d=number(lines,/^(\d+) M$/),n=number(lines,/^CHAMBER (\d+)$/);if(d!==null)assert.equal(d,0,'crush changed the fresh human distance');if(lines.includes('CAUGHT!'))caught=true;if(caught&&n>1){advanced=true;break}}assert.ok(caught,'manual player was never crushed');assert.ok(advanced,'crush did not advance to a new chamber');assert.equal(records.length,0,'a crush must not finish the run');}finally{h.close()}
});
test('Idol Escape preview resets only after its explicit 120-second terminal',()=>{
 const records=[],h=harness(createFeatureGame12,'idol-escape',false,1,r=>records.push(r));try{let distance=0,stage=1,resets=0,maxDistance=0,maxStage=1;for(let i=0;i<9000;i++){const lines=h.step(),d=number(lines,/^(\d+) M$/)??distance,n=number(lines,/^CHAMBER (\d+)$/)??stage;if(d<distance||n<stage){assert.ok(records.length>resets,'setback reset progress before terminal');assert.equal(records[resets].durationMs,120000);assert.equal(records[resets].actor,'ai');resets++}distance=d;stage=n;maxDistance=Math.max(maxDistance,d);maxStage=Math.max(maxStage,n)}assert.ok(maxDistance>=100&&maxStage>2,'preview did not complete rooms');assert.equal(records.length,1);assert.equal(resets,1,'completed preview did not get a fresh factory');}finally{h.close()}
});
test('Idol Escape unscored factory preserves earned distance through a later manual crush',()=>{
 const old=Math.random;let seed=1;Math.random=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/0x100000000);try{const g=idol();for(let i=0;i<10000&&g.snapshot().distance<100;i++)g.update(.05,true);const before=g.snapshot();assert.ok(before.distance>=100);let caught=false,advanced=false;for(let i=0;i<3000;i++){g.update(1/60,false);const state=g.snapshot();assert.equal(state.distance,before.distance);if(state.notice==='CAUGHT!')caught=true;if(caught&&state.stage>before.stage){advanced=true;break}}assert.ok(caught);assert.ok(advanced)}finally{Math.random=old}
});
test('Cloud Caravan preserves delivered routes through repeated manual lightning damage',()=>{
 const h=harness(createFeatureGame21,'cloud-caravan',false);try{let route=0;for(let i=0;i<9000&&route<2;i++){const s=h.step(),r=number(s,/^ROUTES (\d+)/);if(r!==null)route=r}assert.ok(route>=2,'preview did not deliver routes');h.game.setInteractive(true);let minimum=4,afterMin=0;for(let i=0;i<21000;i++){const s=h.step(),line=s.find(x=>/^ROUTES \d+.* HULL \d+/.test(x));if(!line)continue;const m=/^ROUTES (\d+).* HULL (\d+)/.exec(line),r=+m[1],hull=+m[2];assert.equal(r,route,'damage erased routes');assert.ok(hull>=1,'integrity fell below one');minimum=Math.min(minimum,hull);if(minimum===1)afterMin++}assert.equal(minimum,1,'did not exercise repeated lightning damage');assert.ok(afterMin>3000,'did not continue after reaching minimum integrity');}finally{h.close()}
});
test('Cloud Caravan preview continues delivering',()=>{const h=harness(createFeatureGame21,'cloud-caravan',false);try{let route=0;for(let i=0;i<9000;i++){const r=number(h.step(),/^ROUTES (\d+)/);if(r!==null){assert.ok(r>=route,'route count reset');route=r}}assert.ok(route>=3,`only ${route} routes delivered`)}finally{h.close()}});

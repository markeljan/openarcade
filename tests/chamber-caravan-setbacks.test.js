import test from 'node:test';
import assert from 'node:assert/strict';
import {createFeatureGame12} from '../src/feature-games12.js';
import {createFeatureGame21} from '../src/feature-games21.js';
function harness(make,id,interactive,seed=1){
 const oldRandom=Math.random;let scheduled,seq=0,frame=0,labels=[];const noop=()=>{};
 Math.random=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/0x100000000);
 globalThis.window={devicePixelRatio:1};globalThis.ResizeObserver=class{observe(){}disconnect(){}};globalThis.requestAnimationFrame=fn=>(scheduled=fn,++seq);globalThis.cancelAnimationFrame=()=>{scheduled=null};
 const ctx=new Proxy({fillText(s){labels.push(s)}},{get:(o,k)=>k in o?o[k]:noop,set:(o,k,v)=>(o[k]=v,true)}),canvas={getContext:()=>ctx,getBoundingClientRect:()=>({width:320,height:720}),setAttribute:noop,addEventListener:noop,removeEventListener:noop},game=make(canvas,id,{interactive});
 return {game,step(){labels=[];scheduled(++frame*1000/60);return labels},close(){game.destroy();Math.random=oldRandom}};
}
const number=(lines,re)=>{const line=lines.find(s=>re.test(s));return line?Number(line.match(re)[1]):null};
test('Idol Escape preserves completed distance and advances after a manual crush',()=>{
 const h=harness(createFeatureGame12,'idol-escape',false);try{let distance=0,stage=0;for(let i=0;i<9000&&distance<100;i++){const s=h.step();distance=number(s,/^(\d+) M$/)??distance;stage=number(s,/^CHAMBER (\d+)$/)??stage;}assert.ok(distance>=100,'preview did not complete a chamber');h.game.setInteractive(true);let caught=false,advanced=false;for(let i=0;i<3000;i++){const s=h.step(),d=number(s,/^(\d+) M$/),n=number(s,/^CHAMBER (\d+)$/);if(d!==null)assert.equal(d,distance,'crush erased completed distance');if(s.includes('CAUGHT!'))caught=true;if(caught&&n>stage){advanced=true;break;}}assert.ok(caught,'manual player was never crushed');assert.ok(advanced,'crush did not advance to a new chamber');}finally{h.close()}
});
test('Idol Escape preview continues completing rooms',()=>{
 const h=harness(createFeatureGame12,'idol-escape',false);try{let distance=0,stage=1;for(let i=0;i<9000;i++){const s=h.step();const d=number(s,/^(\d+) M$/),n=number(s,/^CHAMBER (\d+)$/);if(d!==null){assert.ok(d>=distance,'distance reset');distance=d}if(n!==null){assert.ok(n>=stage,'chamber reset');stage=n}}assert.ok(distance>=100&&stage>2,`preview did not progress: ${distance}m chamber ${stage}`);}finally{h.close()}
});
test('Cloud Caravan preserves delivered routes through repeated manual lightning damage',()=>{
 const h=harness(createFeatureGame21,'cloud-caravan',false);try{let route=0;for(let i=0;i<9000&&route<2;i++){const s=h.step(),r=number(s,/^ROUTES (\d+)/);if(r!==null)route=r}assert.ok(route>=2,'preview did not deliver routes');h.game.setInteractive(true);let minimum=4,afterMin=0;for(let i=0;i<21000;i++){const s=h.step(),line=s.find(x=>/^ROUTES \d+.* HULL \d+/.test(x));if(!line)continue;const m=/^ROUTES (\d+).* HULL (\d+)/.exec(line),r=+m[1],hull=+m[2];assert.equal(r,route,'damage erased routes');assert.ok(hull>=1,'integrity fell below one');minimum=Math.min(minimum,hull);if(minimum===1)afterMin++}assert.equal(minimum,1,'did not exercise repeated lightning damage');assert.ok(afterMin>3000,'did not continue after reaching minimum integrity');}finally{h.close()}
});
test('Cloud Caravan preview continues delivering',()=>{const h=harness(createFeatureGame21,'cloud-caravan',false);try{let route=0;for(let i=0;i<9000;i++){const r=number(h.step(),/^ROUTES (\d+)/);if(r!==null){assert.ok(r>=route,'route count reset');route=r}}assert.ok(route>=3,`only ${route} routes delivered`)}finally{h.close()}});

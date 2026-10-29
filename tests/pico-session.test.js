import test from 'node:test';import assert from 'node:assert/strict';import {pico} from '../src/feature-games10.js';
const advance=(g,s,auto=false)=>{for(let i=0;i<Math.ceil(s*60);i++)g.update(1/60,auto)};
const step=(g,k)=>{g.input(k,true);g.input(k,false);advance(g,.45)};
test('preview progress is excluded and takeover restarts the current glade',()=>{
 const g=pico();for(let i=0;i<3000&&!g.snapshot().score;i++)g.update(1/60,true);let s=g.snapshot();assert.ok(s.score>0);assert.equal(s.manualScore,0);const glade=s.glades,storm=s.storm;
 g.takeover();s=g.snapshot();assert.equal(s.glades,glade);assert.equal(s.manualScore,0);assert.equal(s.shards.filter(q=>q.taken).length,0);assert.equal(s.storm.phase,storm.phase);assert.deepEqual({x:s.hero.x,y:s.hero.y},{x:5,y:2});
 for(const k of ['ArrowDown','ArrowLeft','ArrowDown','ArrowLeft','ArrowRight','ArrowUp','ArrowRight',' ','ArrowLeft','ArrowDown','ArrowLeft','ArrowLeft','ArrowLeft'])step(g,k);
 assert.ok(g.snapshot().manualScore>=40);
});
test('defeated gnawers return at their assigned guard post after ten seconds',()=>{
 const g=pico();let defeated;for(let i=0;i<1000;i++){g.update(1/60,false);defeated=g.snapshot().gnawers.find(e=>e.dead>0);if(defeated)break}assert.ok(defeated);const home={x:defeated.homeX,y:defeated.homeY};let revived;
 for(let i=0;i<700;i++){g.update(1/60,false);const e=g.snapshot().gnawers.find(v=>v.homeX===home.x&&v.homeY===home.y);if(e.dead===0){revived=e;break}}
 assert.ok(revived);assert.deepEqual({x:revived.x,y:revived.y},home);
});
test('gallery restart and takeover start a fresh glade',async t=>{
 const names=['window','ResizeObserver','requestAnimationFrame','cancelAnimationFrame'],old=Object.fromEntries(names.map(k=>[k,globalThis[k]]));t.after(()=>Object.assign(globalThis,old));
 let next,now=0,labels=[];globalThis.window={devicePixelRatio:1};globalThis.ResizeObserver=class{observe(){}disconnect(){}};globalThis.requestAnimationFrame=f=>(next=f,1);globalThis.cancelAnimationFrame=()=>{};
 const noop=()=>{},ctx=new Proxy({fillText(s){labels.push(s)}},{get:(o,k)=>o[k]??noop,set:(o,k,v)=>(o[k]=v,true)}),canvas={getContext:()=>ctx,getBoundingClientRect:()=>({width:320,height:720}),setAttribute:noop,addEventListener:noop,removeEventListener:noop};
 const {createFeatureGame10}=await import('../src/feature-games10.js');const g=createFeatureGame10(canvas,'pico-cap');let found=false;
 for(let i=0;i<5000;i++){labels=[];next(now+=1000/30);if(labels.some(s=>/^GLADE 2\b/.test(s))){found=true;break}}assert.ok(found);
 g.restart();g.setInteractive(true);labels=[];next(now+=1000/30);assert.ok(labels.some(s=>/^GLADE 1\b.*RUN 0/.test(s)));g.destroy();
});

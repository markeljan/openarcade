import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

const cases=[
  [11,'tower-panic','(_sound,{finish})'],[12,'idol-escape','(_sound,{finish})'],
  [13,'castle-crasher','(_sound,{finish})'],[14,'kaiju-control','(_sound,finish)'],
  [15,'dungeon-relay','(_sound,finish)'],[16,'ricochet-foundry','(_sound,finish)'],
  [17,'ashen-rage','(_sound,finish)'],[18,'cursed-fist','({finish},_sound)'],
  [19,'coral-courier','(_sound,finish)'],[20,'railway-rush','(_sound,finish)'],
];
for(const [number,id,args] of cases)for(const action of ['pause','destroy','pause-resume','stale'])test(`${id} preserves one pending frame across ${action}`,async t=>{
  const names=['window','ResizeObserver','requestAnimationFrame','cancelAnimationFrame'];
  const saved=Object.fromEntries(names.map(name=>[name,globalThis[name]]));
  t.after(()=>Object.assign(globalThis,saved));
  let serial=0,count=0,draws=0;const tasks=new Map(),noop=()=>{};
  globalThis.window={devicePixelRatio:1};globalThis.ResizeObserver=class{observe(){}disconnect(){}};
  globalThis.requestAnimationFrame=fn=>{tasks.set(++serial,fn);return serial};
  globalThis.cancelAnimationFrame=key=>tasks.delete(key);
  let source=await readFile(new URL(`../src/feature-games${number}.js`,import.meta.url),'utf8');
  source=source.replace("'./audio.js'",JSON.stringify(new URL('../src/audio.js',import.meta.url).href))
    .replace("'./scores/run.js'",JSON.stringify(new URL('../src/scores/run.js',import.meta.url).href));
  // Replace only the factory in this wrapper fixture; the real run reporter and
  // scheduling/cleanup paths remain intact. Gameplay terminals have separate tests.
  source+=`\nfactories[${JSON.stringify(id)}]=${args}=>({input(){},draw(){},update(){finish({score:7,result:'COMPLETE'})}});`;
  const module=await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));
  const ctx=new Proxy({},{get:(_,key)=>key==='setTransform'?()=>draws++:noop,set:()=>true}),canvas={getContext:()=>ctx,getBoundingClientRect:()=>({width:320,height:720}),setAttribute:noop,addEventListener:noop,removeEventListener:noop};
  const player=module[`createFeatureGame${number}`](canvas,id,{interactive:true,onResult(){count++;if(action==='pause-resume'){player.pause();player.resume()}else player[action==='stale'?'pause':action]()}});
  try{
    const stale=[...tasks.values()][0];
    if(action==='stale'){
      player.pause();player.resume();assert.equal(tasks.size,1);stale(50);
      assert.equal(count,0,'cancelled callback must not update a resumed run');assert.equal(draws,0);
      assert.equal(tasks.size,1,'stale callback must not clobber the current pending slot');
    }
    const callbacks=[...tasks.values()];tasks.clear();for(const fn of callbacks)fn(100);
    assert.equal(count,1);assert.equal(draws,0,'old tick must stop before drawing after callback cleanup');
    assert.equal(tasks.size,action==='pause-resume'?1:0,'resume owns exactly one frame; pause/destroy own none');
    if(action==='destroy'){stale(150);assert.equal(count,1);assert.equal(draws,0);assert.equal(tasks.size,0)}
  }
  finally{player.destroy()}
});

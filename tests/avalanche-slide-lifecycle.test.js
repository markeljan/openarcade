import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
const path=new URL('../src/feature-games22.js',import.meta.url);
let source=await readFile(path,'utf8');
source=source.replace("'./audio.js'",JSON.stringify(new URL('../src/audio.js',import.meta.url).href));
const [prefix,rest]=source.split('export function createAvalanchePost',2);
const [body,suffix]=rest.split('const factories=',2);
const marker='return {input(k,d){';
assert.ok(body.includes(marker));
source=prefix+'export function createAvalanchePost'+body.replace(marker,"return {fixture(warned){skier.x=35;lodges=[{id:42,x:250,y:400,warned,delivered:false}];slides=[{x:250,y:400.2,state:'rolling',t:1,target:42,hit:false,escaped:false}];slideTimer=0},input(k,d){")+'const factories='+suffix;
const {createAvalanchePost}=await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));
for(const auto of [false,true])for(const warned of [false,true])test(`${auto?'AI':'manual'} independent slide spawning and ${warned?'warned shelter':'unwarned burial'}`,()=>{
 const cues=[],g=createAvalanchePost(e=>cues.push(e));g.fixture(warned);g.update(1/60,auto);let s=g.snapshot();
 assert.equal(s.slides.length,2);assert.equal(s.slides[1].state,'warning');assert.equal(!!s.lodges[0].buried,!warned);assert.equal(!!s.lodges[0].lit,warned);assert.equal(s.slides[0].escaped,true);assert.equal(cues.filter(e=>e==='warning').length,1);
 for(let i=0;i<60;i++)g.update(1/60,auto);s=g.snapshot();assert.equal(s.slides.length,1);assert.equal(s.slides[0].state,'rolling');
});

import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp, mkdir, readFile, rename, rm, writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
import {captureOutput, publishCapture, validateCapture} from '../scripts/s12-publish.mjs';

const hash = b => createHash('sha256').update(b).digest('hex');
function png() { const b=Buffer.alloc(24); Buffer.from([137,80,78,71,13,10,26,10]).copy(b); b.writeUInt32BE(1200,16); b.writeUInt32BE(630,20); return b; }
async function fixture(fn) {
 const root=await mkdtemp(join(tmpdir(),'s12-publish-test-')), dest=join(root,'social');
 try { await mkdir(join(dest,'games'),{recursive:true}); for (const [name,value] of [['games/snake.png','old image'],['manifest.json','old manifest'],['site-card-v1.png','fallback']]) await writeFile(join(dest,name),value); await fn(dest,root); }
 finally { await rm(root,{recursive:true,force:true}); }
}
async function old(dest) { for(const [name,value] of [['games/snake.png','old image'],['manifest.json','old manifest'],['site-card-v1.png','fallback']]) assert.equal(await readFile(join(dest,name),'utf8'),value); }
async function generate(stage) {
 const bytes=png(), version=hash(bytes);
 const manifest={games:{snake:{path:'/social/games/snake.png',width:1200,height:630,version}},homepage:{path:'/social/homepage.png',width:1200,height:630,version}};
 const provenance={games:{snake:{sha256:version}},homepage:{sha256:version}};
 await writeFile(join(stage,'games/snake.png'),bytes); await writeFile(join(stage,'homepage.png'),bytes);
 await writeFile(join(stage,'manifest.json'),JSON.stringify(manifest)); await writeFile(join(stage,'provenance.json'),JSON.stringify(provenance));
 await validateCapture(stage,['snake'],manifest,provenance);
}
test('partial output must be explicitly separate before capture',()=>{
 const dest=join(tmpdir(),'published-social');
 for(const args of [['snake'],['snake',`--out=${dest}`],['snake',`--out=${join(dest,'other')}`],['snake',`--out=${tmpdir()}`]]) assert.throws(()=>captureOutput(args,dest),/Partial captures/);
 assert.equal(captureOutput(['snake',`--out=${dest}-partial`],dest).out,`${dest}-partial`);
});
test('batch failure leaves published bytes untouched',()=>fixture(async dest=>{
 await assert.rejects(publishCapture(dest,async stage=>{await writeFile(join(stage,'games/snake.png'),'new image');throw Error('capture failed')}),/capture failed/); await old(dest);
}));
test('failed installation restores the original complete directory',()=>fixture(async dest=>{
 let moves=0; await assert.rejects(publishCapture(dest,generate,{rename:async (...args)=>{if(++moves===2)throw Error('simulated failure');return rename(...args)}}),/simulated failure/); await old(dest);
}));
test('successful install preserves unowned assets and validates coverage and hashes',()=>fixture(async dest=>{
 await publishCapture(dest,generate); assert.equal(await readFile(join(dest,'site-card-v1.png'),'utf8'),'fallback'); assert.deepEqual(await readFile(join(dest,'games/snake.png')),png());
 const manifest=JSON.parse(await readFile(join(dest,'manifest.json'))), provenance=JSON.parse(await readFile(join(dest,'provenance.json')));
 await assert.rejects(validateCapture(dest,['snake','missing'],manifest,provenance),/coverage/);
 await writeFile(join(dest,'games/snake.png'),'bad'); await assert.rejects(validateCapture(dest,['snake'],manifest,provenance),/Invalid capture image/);
}));

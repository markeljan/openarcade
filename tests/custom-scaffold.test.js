import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,cp,writeFile,readFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {spawnSync} from 'node:child_process';
import {pathToFileURL} from 'node:url';
import {build} from 'vite';

test('scaffold creates a discoverable, playable custom game and rejects duplicate IDs', async t=>{
 const root=await mkdtemp(join(tmpdir(),'arcade-scaffold-'));t.after(()=>rm(root,{recursive:true,force:true}));
 await cp(resolve('src'),join(root,'src'),{recursive:true});await cp(resolve('scripts'),join(root,'scripts'),{recursive:true});await writeFile(join(root,'package.json'),'{"type":"module"}');
 const run=(...args)=>spawnSync(process.execPath,[join(root,'scripts/new-game.mjs'),...args],{cwd:root,encoding:'utf8'});
 assert.notEqual(run('snake').status,0);assert.notEqual(run('bad--id').status,0);assert.equal(run('test-comet','Test Comet').status,0);assert.notEqual(run('test-comet').status,0);
 const filename=join(root,'src/custom/games/test-comet.js');await writeFile(filename,(await readFile(filename,'utf8'))+"\nmetadata.touchKeys=[' ', 'b', 'Enter'];\n");
 const generated=await import(pathToFileURL(filename).href),game=generated.create();let coords=[];const ctx=new Proxy({fillRect(x,y,w,h){if(w===16&&h===16)coords.push([x,y])}},{get:(o,k)=>o[k]??(()=>{}),set:(o,k,v)=>(o[k]=v,true)});
 game.draw(ctx);const start=coords.at(-1);game.input('ArrowRight',true);game.update(.1,false);game.draw(ctx);assert.ok(coords.at(-1)[0]>start[0],'manual input moves player');game.input('ArrowRight',false);const before=coords.at(-1);game.update(.1,true);game.draw(ctx);assert.notDeepEqual(coords.at(-1),before,'autoplay moves toward target');
 await writeFile(join(root,'entry.js'),"export {customGames,createCustomGame} from './src/custom/runtime.js';\n");
 const result=await build({root,configFile:false,logLevel:'silent',build:{write:false,lib:{entry:join(root,'entry.js'),formats:['es']},minify:false}});
 const output=(Array.isArray(result)?result[0]:result).output.find(item=>item.type==='chunk').code;
 const bundled=await import('data:text/javascript;base64,'+Buffer.from(output).toString('base64'));
 const entry=bundled.customGames.find(item=>item.id==='test-comet');assert.equal(entry.name,'Test Comet');assert.deepEqual(entry.touchKeys,[' ','b','Enter']);assert.equal(typeof bundled.createCustomGame,'function');
});

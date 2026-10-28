import test from 'node:test';
import assert from 'node:assert/strict';
import {readdir} from 'node:fs/promises';
import {featureRegistry} from '../src/feature-registry.js';

test('lazy feature catalog matches every module metadata and factory',async()=>{
 const files=(await readdir(new URL('../src/',import.meta.url))).filter(f=>/^feature-games\d*\.js$/.test(f)).sort((a,b)=>Number(a.match(/\d+/)?.[0]||1)-Number(b.match(/\d+/)?.[0]||1));
 assert.deepEqual(featureRegistry.map(e=>e.path),files.map(f=>'./'+f));
 const ids=new Set();for(const entry of featureRegistry){const module=await import('../src/'+entry.path.slice(2));const metadata=Object.entries(module).find(([k])=>/^featureGames\d*$/.test(k))?.[1],factory=Object.entries(module).find(([k])=>/^createFeatureGame\d*$/.test(k))?.[1];assert.deepEqual(entry.games,metadata,entry.path);assert.equal(typeof factory,'function',entry.path);for(const game of entry.games){assert.ok(!ids.has(game.id),game.id);ids.add(game.id)}}
});

import test from 'node:test';
import assert from 'node:assert/strict';
import {instantiateIfCurrent} from '../src/async-game.js';
function pending(){let resolve,reject;const promise=new Promise((a,b)=>{resolve=a;reject=b});return{promise,resolve,reject}}
test('a stale preview or closed direct-link dialog never creates an instance',async()=>{
 const p=pending();let current=true,created=0;
 const result=instantiateIfCurrent(p.promise,()=>current);current=false;p.resolve(()=>{created++;return {}});
 assert.equal(await result,null);assert.equal(created,0);
});
test('a replacement direct link owns the canvas after out-of-order module loads',async()=>{
 const old=pending(),fresh=pending();let generation=1,created=[];
 const first=instantiateIfCurrent(old.promise,()=>generation===1);generation=2;
 const second=instantiateIfCurrent(fresh.promise,()=>generation===2);
 fresh.resolve(()=>{created.push('new');return 'new'});old.resolve(()=>{created.push('old');return 'old'});
 assert.equal(await first,null);assert.equal(await second,'new');assert.deepEqual(created,['new']);
});
test('load failures remain visible to the caller for retry or error UI',async()=>{
 await assert.rejects(instantiateIfCurrent(Promise.reject(new Error('load failed')),()=>true),/load failed/);
});

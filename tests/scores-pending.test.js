import test from 'node:test';
import assert from 'node:assert/strict';
import {createPendingQueue} from '../src/scores/pending.js';
import {createScoreClient} from '../src/scores/client.js';

test('denied IndexedDB getter keeps queue and client startup usable', async () => {
  const original = Object.getOwnPropertyDescriptor(globalThis, 'indexedDB');
  let reads = 0;
  Object.defineProperty(globalThis, 'indexedDB', {configurable: true, get() { reads++; throw new Error('Storage denied'); }});
  try {
    for (const options of [undefined, {}, {indexedDB: undefined}]) {
      const queue = createPendingQueue(options);
      assert.equal((await queue.enqueue({runId: 'denied', gameId: 'fixture', score: 1})).durability, 'memory');
      assert.equal((await queue.get('denied')).score, 1);
    }
    assert.equal(reads, 3);
    const memory = createPendingQueue({indexedDB: null});
    await memory.enqueue({runId: 'explicit-null', gameId: 'fixture', score: 0});
    assert.equal(reads, 3);
    let opened = 0;
    const supplied = createPendingQueue({indexedDB: {open() {
      opened++; const request = {}; queueMicrotask(() => request.onblocked()); return request;
    }}});
    await supplied.enqueue({runId: 'supplied', gameId: 'fixture', score: 2});
    assert.equal(opened, 1); assert.equal(reads, 3);
    const client = createScoreClient({makeNonce: () => 'private'});
    const state = await client.enqueue({runId: 'client-denied', gameId: 'fixture', score: 3, actor: 'human', context: 'manual-player', submissionEligible: true});
    assert.equal(state.durability, 'memory'); assert.equal(state.redirectSafe, false);
    assert.equal((await client.listPending())[0].score, 3);
    assert.equal(reads, 4);
  } finally {
    if (original) Object.defineProperty(globalThis, 'indexedDB', original);
    else delete globalThis.indexedDB;
  }
});
test('memory fallback retains independent runs, fixed expiry and original nonce',async()=>{let time=10;const q=createPendingQueue({indexedDB:null,now:()=>time,ttlMs:100});assert.equal((await q.enqueue({runId:'a',gameId:'g',score:0,claimNonce:'first'})).durability,'memory');time=20;await q.enqueue({runId:'a',gameId:'g',score:0,claimNonce:'second'});await q.enqueue({runId:'b',gameId:'g',score:2});assert.equal((await q.get('a')).claimNonce,'first');assert.equal((await q.get('a')).expiresAt,110);await q.acknowledge('a');assert.equal((await q.list())[0].runId,'b');assert.equal(await q.update('a',{receipt:'x'}),null);time=120;assert.deepEqual(await q.list(),[])});
test('blocked database and invalid scores are handled',async()=>{const q=createPendingQueue({indexedDB:{open(){const r={};queueMicrotask(()=>r.onblocked());return r}}});assert.equal((await q.enqueue({runId:'a',gameId:'g',score:1})).durability,'memory');await assert.rejects(q.enqueue({runId:'b',gameId:'g',score:NaN}));await q.abandon('a');assert.equal(await q.get('a'),null)});
test('conflicting replay is rejected and updates cannot replace run facts',async()=>{const q=createPendingQueue({indexedDB:null});await q.enqueue({runId:'a',gameId:'g',score:1,claimNonce:'one',context:{b:2,a:1}});await q.enqueue({runId:'a',gameId:'g',score:1,claimNonce:'two',context:{a:1,b:2}});assert.equal((await q.get('a')).claimNonce,'one');await assert.rejects(q.enqueue({runId:'a',gameId:'g',score:2,context:{a:1,b:2}}),/Conflicting/);await q.update('a',{score:99,receipt:'ok'});assert.equal((await q.get('a')).score,1);assert.equal((await q.get('a')).receipt,'ok')});


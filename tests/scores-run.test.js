import test from 'node:test';
import assert from 'node:assert/strict';
import {createRunReporter} from '../src/scores/run.js';
function fixture(extra = {}) {
  let id = 0; const results = [];
  const reporter = createRunReporter({gameId: 'fixture', ruleVersion: 1, onResult: r => results.push(r), createId: () => 'run-' + (++id), ...extra});
  return {reporter, results};
}
test('fresh takeover, stale callbacks and once-only terminal reporting', () => {
  const {reporter: r, results} = fixture();
  const previewFinish = r.beginRun(); r.advance(30);
  const humanFinish = r.beginRun({actor: 'human', context: 'manual-player'}); r.advance(2);
  assert.equal(previewFinish({score: 100}), null);
  const record = humanFinish({score: 0, result: 'GAME OVER'});
  assert.equal(record.durationMs, 2000); assert.equal(record.actor, 'human'); assert.equal(Object.isFrozen(record), true);
  assert.equal(humanFinish({score: 99}), null); assert.equal(results.length, 1);
  const restart = r.beginRun(); assert.notEqual(r.getRun().runId, record.runId);
  r.abandon(); assert.equal(restart({score: 1}), null);
  const closed = r.beginRun(); r.destroy(); assert.equal(closed({score: 2}), null);
});
test('pause excludes duration and rejects callbacks while paused', () => {
  const {reporter: r} = fixture(); const finish = r.beginRun(); r.advance(1); r.setPaused(true); r.advance(50);
  assert.equal(finish({score: 5}), null); r.setPaused(false); r.advance(.5); assert.equal(finish({score: 5}).durationMs, 1500);
});
test('gallery reports without submission eligibility; intentional watch is eligible', () => {
  const {reporter: r} = fixture();
  assert.equal(r.beginRun()({score: 1}).submissionEligible, false);
  assert.equal(r.beginRun({context: 'watch-player'})({score: 1}).submissionEligible, true);
  assert.throws(() => r.beginRun({actor: 'human', context: 'watch-player'}));
});
test('invalid scores ignored; callback errors isolated; finite negatives allowed by run contract', () => {
  const errors = [], {reporter: r} = fixture({onResult: () => { throw Error('queue failed'); }, onError: e => errors.push(e.message)});
  const finish = r.beginRun();
  for (const score of [NaN, Infinity, '1', null]) assert.equal(finish({score}), null);
  assert.equal(finish({score: -1}).score, -1); assert.deepEqual(errors, ['queue failed']);
});

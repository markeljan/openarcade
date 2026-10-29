import test from 'node:test';
import assert from 'node:assert/strict';
import { createShareControls } from '../src/ui/share-controls.js';

const game = { id: 'snake', name: 'Snake' };
const url = 'https://example.test/embed/snake';
function setup(nav) {
  const statuses = [];
  const control = createShareControls({ navigator: nav, onStatus: value => statuses.push(value) });
  control.setSelection(game, url);
  return { control, statuses };
}
function deferred() {
  let resolve, reject;
  const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}

test('native share starts synchronously with the selected title and playable URL', async () => {
  const pending = deferred(), calls = [];
  const { control, statuses } = setup({ share(data) { calls.push(data); return pending.promise; } });
  const result = control.share();
  assert.deepEqual(calls, [{ title: 'Snake', url }]);
  pending.resolve();
  await result;
  assert.equal(statuses.at(-1).message, 'Share opened.');
});

test('unsupported native sharing copies the link; cancellation does not copy', async () => {
  const copied = [];
  const first = setup({ clipboard: { writeText: text => { copied.push(text); } } });
  await first.control.share();
  assert.deepEqual(copied, [url]);
  assert.equal(first.statuses.at(-1).message, 'Link copied.');
  assert.equal(first.statuses.at(-1).url, url);
  const second = setup({ share: () => Promise.reject({ name: 'AbortError' }), clipboard: { writeText: text => copied.push(text) } });
  await second.control.share();
  assert.deepEqual(copied, [url]);
  assert.equal(second.statuses.at(-1).message, 'Sharing cancelled.');
});

test('native failure falls back to clipboard, and unavailable or rejected clipboard exposes the URL', async () => {
  const copied = [];
  const first = setup({ share: () => Promise.reject(new Error('failed')), clipboard: { writeText: text => copied.push(text) } });
  await first.control.share();
  assert.deepEqual(copied, [url]);
  for (const nav of [{}, { clipboard: { writeText: () => Promise.reject(new Error('denied')) } }]) {
    const { control, statuses } = setup(nav);
    await control.share();
    assert.deepEqual(statuses.at(-1), { message: 'Copy this link manually:', url });
  }
});

test('old selection and disposed operations cannot report or start fallback copying', async () => {
  for (const change of ['selection', 'dispose']) {
    const pending = deferred(), copied = [];
    const { control, statuses } = setup({ share: () => pending.promise, clipboard: { writeText: text => copied.push(text) } });
    const result = control.share();
    if (change === 'selection') control.setSelection({ id: 'other', name: 'Other' }, 'https://example.test/other');
    else control.dispose();
    const count = statuses.length;
    pending.reject(new Error('failed'));
    await result;
    assert.equal(statuses.length, count);
    assert.deepEqual(copied, []);
  }
  const pending = deferred();
  const { control, statuses } = setup({ clipboard: { writeText: () => pending.promise } });
  const result = control.share();
  control.setSelection({ id: 'other', name: 'Other' }, 'https://example.test/other');
  const count = statuses.length;
  pending.resolve();
  await result;
  assert.equal(statuses.length, count);
});

import test from 'node:test';

import assert from 'node:assert/strict';

import { mountScorePanel } from '../src/ui/score-panel.js';



class Element {

  constructor(doc) { this.ownerDocument = doc; this.children = []; this.handlers = {}; this.attributes = {}; this.textContent = ''; }

  append(...nodes) { for (const n of nodes) { n.parent = this; this.children.push(n); } }

  replaceChildren() { this.children = []; }

  remove() { this.parent.children = this.parent.children.filter(n => n !== this); }

  setAttribute(k, v) { this.attributes[k] = v; }

  addEventListener(k, f) { this.handlers[k] = f; }

  removeEventListener(k) { delete this.handlers[k]; }

  click() { return this.handlers.click?.(); }

}

function deferred() { let resolve, reject; const promise = new Promise((a, b) => { resolve = a; reject = b; }); return { promise, resolve, reject }; }

function setup(client, callbacks = {}) {

  const doc = { createElement: () => new Element(doc) }, root = new Element(doc);

  const controller = mountScorePanel(root, { client, ...callbacks });

  const [result, , filters, board] = root.children[0].children;

  return { controller, root, result, players: filters.children[0], ai: filters.children[1], board };

}

const data = name => ({ units: 'points', entries: [{ displayName: name, score: 12 }], personalBest: { score: 9 } });



test('result states show explicit status, score, rule, actor and actions', async () => {

  const actions = [];

  const ui = setup({ leaderboard: async () => data('Player') }, { onSignIn: run => actions.push(['signIn', run]), onRetry: run => actions.push(['retry', run]) });

  await ui.controller.setGame({ id: 'a' });

  const run = { gameId: 'a', result: 'win', score: 25, ruleVersion: 'v2', actor: 'human' };

  ui.controller.renderResult(run, 'queued-auth', { units: 'points' });

  assert.deepEqual(ui.result.children.map(n => n.textContent), ['Player result', 'Result: win', '25 points', 'Rule version: v2', 'Sign in to save this score', 'Sign in to save this score']);

  ui.result.children[5].click();

  ui.controller.renderResult(run, 'retry'); ui.result.children[5].click();

  assert.deepEqual(actions, [['signIn', run], ['retry', run]]);

  for (const status of ['pending', 'saving', 'saved', 'nonqualifying', 'expired']) {

    ui.controller.renderResult({ ...run, actor: 'ai' }, status);

    assert.equal(ui.result.children[0].textContent, 'AI result');

    assert.ok(ui.result.children[4].textContent);

    assert.equal(ui.result.children.length, 5);

  }

  ui.controller.renderResult(run, 'unavailable');

  assert.equal(ui.result.children[5].textContent, 'Retry saving');

  ui.result.children[5].click();

  assert.deepEqual(actions.at(-1), ['retry', run]);

  ui.controller.renderResult(run, { status: 'queued-auth', redirectSafe: false });

  assert.equal(ui.result.children[5].textContent, 'Stored only in this tab. Reload or external sign-in may lose this run.');

  ui.controller.renderResult({ ...run, gameId: 'other' }, 'saved');

  assert.equal(ui.result.children[5].textContent, 'Stored only in this tab. Reload or external sign-in may lose this run.');

});



test('selection and filter changes discard stale responses and default to players', async () => {

  const calls = [];

  const ui = setup({ leaderboard(id, options) { const d = deferred(); calls.push({ id, ...options, ...d }); return d.promise; } });

  const first = ui.controller.setGame({ id: 'a' });

  ui.ai.click();

  const third = ui.controller.setGame({ id: 'b' });

  assert.deepEqual(calls.map(({ id, filter }) => [id, filter]), [['a', 'players'], ['a', 'ai'], ['b', 'players']]);

  calls[2].resolve(data('<unsafe>')); await third;

  calls[0].resolve(data('stale')); calls[1].resolve(data('stale AI')); await first;

  await Promise.resolve();

  assert.equal(ui.players.attributes['aria-pressed'], 'true');

  assert.equal(ui.board.children[2].children[0].textContent, '<unsafe>: 12 points');

  assert.equal(ui.board.children[3].textContent, 'Personal best: 9 points');

});



test('disposal prevents late board updates and errors are shown', async () => {

  const d = deferred(), ui = setup({ leaderboard: () => d.promise });

  const pending = ui.controller.setGame({ id: 'a' });

  ui.controller.dispose(); d.resolve(data('late')); await pending;

  assert.equal(ui.root.children.length, 0);

  assert.equal(ui.board.children[0].textContent, 'Loading leaderboard…');

  const failed = setup({ leaderboard: () => Promise.reject(new Error('offline')) });

  await failed.controller.setGame({ id: 'a' });

  assert.equal(failed.board.children[0].textContent, 'Leaderboard unavailable.');

  assert.equal(failed.board.children[1].textContent, 'Retry leaderboard');

  failed.board.children[1].click();

  await Promise.resolve();

});



test('board labels AI, guests, unverified attribution and rule context', async () => {

  const ui = setup({ leaderboard: async () => ({ ruleVersion: 'v3', metric: 'distance', units: 'm', order: 'desc', entries: [

    { actor: 'ai', guest: true, displayName: '<guest>', score: 42, attribution: 'Friend' }

  ] }) });

  await ui.controller.setGame({ id: 'a' });

  assert.equal(ui.board.children[1].textContent, 'Rule version: v3 · distance · m · desc');

  assert.equal(ui.board.children[2].children[0].textContent, 'AI · Guest · <guest>: 42 m · From Friend (unverified)');

});





test('rejects mismatched response identity and filter without rendering entries', async () => {

  let response = { gameId: 'other', filter: 'players', entries: [{ displayName: 'wrong', score: 1 }] };

  const ui = setup({ leaderboard: async () => response });

  await ui.controller.setGame({ id: 'a' });

  assert.equal(ui.board.children[0].textContent, 'Leaderboard unavailable.');

  response = { gameId: 'a', filter: 'ai', entries: [{ displayName: 'wrong filter', score: 1 }] };

  await ui.controller.refresh();

  assert.equal(ui.board.children[0].textContent, 'Leaderboard unavailable.');

  response = { gameId: 'a', filter: 'players', units: 'points', entries: Array.from({length: 12}, (_, i) => ({ actor: i === 0 ? 'ai' : 'human', guest: i === 0, displayName: `Name ${i}`, score: i, attribution: i === 0 ? 'x' : i === 1 ? 'Friend' : null })) };

  await ui.controller.refresh();

  const rows = ui.board.children[2].children;

  assert.equal(rows.length, 10);

  assert.equal(rows[0].textContent, 'AI \u00b7 Guest \u00b7 Name 0: 0 points \u00b7 From X (unverified)');

  assert.equal(rows[1].textContent, 'Name 1: 1 points \u00b7 From Friend (unverified)');

});



test('personal best status is distinct while public entries remain visible', async () => {
  let response = { entries: [{displayName: 'Public', score: 4}], units: 'points', personalBest: null, personalBestStatus: 'available' };
  const ui = setup({ leaderboard: async () => response });
  await ui.controller.setGame({id: 'a'});
  assert.equal(ui.board.children[3].textContent, 'Personal best: none yet');
  response = {...response, personalBestStatus: 'signed-out'};
  await ui.controller.refresh();
  assert.equal(ui.board.children[3].textContent, 'Sign in to see your personal best.');
  response = {...response, personalBestStatus: 'unavailable'};
  await ui.controller.refresh();
  assert.equal(ui.board.children[3].textContent, 'Personal best unavailable.');
  assert.equal(ui.board.children[2].children[0].textContent, 'Public: 4 points');
});


test('auth failures retry public leaderboard without personal data', async () => {
  for (const error of [{status:401}, {code:'sign-in-required'}, {code:'identity-unavailable'}]) {
    const calls = [];
    const ui = setup({ leaderboard: async (id, options) => {
      calls.push([id, options]);
      if (calls.length === 1) throw error;
      return {gameId:id, filter:options.filter, units:'points', entries:[{displayName:'Public',score:7}], personalBest:{score:99}, personalBestStatus:'available'};
    }});
    await ui.controller.setGame({id:'a'});
    assert.deepEqual(calls, [['a',{filter:'players'}], ['a',{filter:'players',includePersonalBest:false}]]);
    assert.equal(ui.board.children[2].children[0].textContent, 'Public: 7 points');
    assert.equal(ui.board.children[3].textContent, 'Personal best unavailable.');
  }
  let count=0;
  const offline=setup({leaderboard:async()=>{count++;throw new Error('offline')}});
  await offline.controller.setGame({id:'a'});
  assert.equal(count,1);
  assert.equal(offline.board.children[0].textContent,'Leaderboard unavailable.');
});

test('stale authentication rejection or public fallback cannot overwrite a new selection', async () => {
  const requests=[];
  const ui=setup({leaderboard(id,options){const d=deferred();requests.push({id,options,...d});return d.promise}});
  const first=ui.controller.setGame({id:'a'});
  const second=ui.controller.setGame({id:'b'});
  requests[0].reject({status:401});await first;
  assert.equal(requests.length,2,'stale rejection must not trigger fallback');
  requests[1].reject({code:'identity-unavailable'});await Promise.resolve();
  assert.equal(requests.length,3);
  const third=ui.controller.setGame({id:'c'});
  requests[3].resolve(data('Current'));await third;
  requests[2].resolve(data('Stale public'));await second;
  assert.equal(ui.board.children[2].children[0].textContent,'Current: 12 points');
});

import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile, readdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {games} from '../src/games.js';
import {moreGames} from '../src/more-games.js';
import {extraGames} from '../src/extra-games.js';
import {featureRegistry} from '../src/feature-registry.js';
import {allowedRequest, localOrigin} from '../scripts/s12-browser.mjs';

test('S12 browser restricts traffic to local assets without API routes', () => {
  const origin = localOrigin('http://127.0.0.1:4312/');
  for (const value of ['https://openarcade.example/', 'http://example.com/', 'file:///tmp/a', 'http://user:password@localhost/']) assert.throws(() => localOrigin(value));
  for (const value of ['/api', '/api/scores', '/API/feedback', '/%61pi/scores', '/x/../api/scores', '/api%2fscores']) assert.equal(allowedRequest(origin + value, origin), false, value);
  for (const value of ['https://example.com/api/scores', 'http://127.0.0.1:9999/api/scores', 'ws://127.0.0.1:4312/', 'https://example.com/pixel']) assert.equal(allowedRequest(value, origin), false, value);
  for (const value of ['/src/main.js', '/social/games/snake.png', '/scripts/s12-capture.html']) assert.equal(allowedRequest(origin + value, origin), true, value);
});

test('S12 social manifest has exactly one intact real capture for every launch game', async () => {
  const catalog = [...featureRegistry.flatMap(group => group.games), ...games, ...moreGames, ...extraGames];
  assert.equal(catalog.length, 112);
  const root = new URL('../public/social/', import.meta.url);
  const manifest = JSON.parse(await readFile(new URL('manifest.json', root), 'utf8'));
  const provenance = JSON.parse(await readFile(new URL('provenance.json', root), 'utf8'));
  assert.equal(manifest.version, 1);
  assert.deepEqual(Object.keys(manifest.games).sort(), catalog.map(game => game.id).sort());
  assert.deepEqual((await readdir(new URL('games/', root))).sort(), catalog.map(game => game.id + '.png').sort());
  const hashes = new Set();
  for (const game of catalog) {
    const card = manifest.games[game.id];
    assert.equal(card.path, `/social/games/${game.id}.png`);
    assert.match(card.alt, /gameplay.*OpenArcade/);
    assert.ok(card.alt.includes(game.name));
    assert.equal(card.width, 1200); assert.equal(card.height, 630);
    const png = await readFile(new URL(`games/${game.id}.png`, root));
    assert.equal(png.subarray(0, 8).toString('hex'), '89504e470d0a1a0a');
    assert.equal(png.readUInt32BE(16), card.width); assert.equal(png.readUInt32BE(20), card.height);
    const hash = createHash('sha256').update(png).digest('hex');
    assert.equal(hash, card.version, game.id);
    assert.equal(hash, provenance.games[game.id].sha256, game.id);
    assert.ok(provenance.games[game.id].sampledColors >= 4, game.id);
    hashes.add(hash);
  }
  assert.equal(hashes.size, catalog.length, 'No two game cards are byte-identical');
  if (manifest.homepage) {
    const png = await readFile(new URL(manifest.homepage.path.replace('/social/', ''), root));
    assert.equal(png.readUInt32BE(16), 1200); assert.equal(png.readUInt32BE(20), 630);
    assert.equal(createHash('sha256').update(png).digest('hex'), manifest.homepage.version);
  }
});

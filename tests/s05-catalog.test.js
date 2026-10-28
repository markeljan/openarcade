import test from 'node:test';
import assert from 'node:assert/strict';
import {gameCatalog,getGame} from '../src/catalog.js';
import {games} from '../src/games.js';
import {moreGames} from '../src/more-games.js';
import {extraGames} from '../src/extra-games.js';
import {featureRegistry} from '../src/feature-registry.js';
import {gameUrl,embedUrl,gameIdFromLocation,siteOrigin} from '../src/social/urls.js';

test('all 112 catalog entries retain metadata and resolve the existing lazy factories',async()=>{
  const source=[...featureRegistry.flatMap(entry=>entry.games),...games,...moreGames,...extraGames];
  assert.equal(gameCatalog.length,112);
  assert.equal(new Set(gameCatalog.map(game=>game.id)).size,112);
  for(const game of source) {
    const entry=getGame(game.id);
    for(const [key,value] of Object.entries(game))assert.deepEqual(entry[key],value,`${game.id}.${key}`);
    const module=await import('../src/'+entry.modulePath.slice(2));
    assert.equal(typeof module[entry.factoryExport],'function',game.id);
    assert.equal(entry.height,featureRegistry.some(e=>e.games.some(g=>g.id===game.id))?720:240);
  }
  assert.equal(getGame('no-such-game'),null);
});
test('canonical helpers preserve legacy links and safely encode IDs',()=>{
  assert.equal(gameUrl('snake','https://example.com').href,'https://example.com/games/snake');
  assert.equal(gameUrl(null,'https://example.com').pathname,'/');
  assert.equal(embedUrl('snake','https://example.com').pathname,'/embed/snake');
  assert.equal(gameUrl('x/y','https://example.com').pathname,'/games/x%2Fy');
  for(const path of ['/games/snake','/games/snake/','/?game=snake','/embed/snake'])assert.equal(gameIdFromLocation(new URL(path,'https://example.com')),'snake');
  assert.equal(gameIdFromLocation('https://example.com/games/snake?game=pong'),'snake');
  assert.equal(gameIdFromLocation('https://example.com/account?game=snake'),null);
  assert.equal(gameIdFromLocation('https://example.com/games/%E0%A4%A'),null);
  assert.equal(siteOrigin('https://example.com/'),'https://example.com');
  for(const value of ['http://example.com','https://user@example.com','https://example.com/path','https://example.com/?x=1'])assert.throws(()=>siteOrigin(value));
});

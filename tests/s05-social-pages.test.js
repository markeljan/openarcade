import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,mkdtempSync,mkdirSync,writeFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {gameCatalog} from '../src/catalog.js';
import {socialMetadata,socialPagesPlugin,readImageManifest,withMetadata,notFoundHtml} from '../scripts/social-pages.mjs';

test('every game gets specific metadata in raw initial HTML with a real fallback image',()=>{
  const template=readFileSync(new URL('../index.html',import.meta.url),'utf8');
  for(const game of gameCatalog) {
    const html=withMetadata(template,game,{origin:'https://example.com'});
    assert.match(html,new RegExp(`<title>${game.name} — OpenArcade</title>`));
    assert.ok(html.includes(`href="https://example.com/games/${game.id}"`));
    assert.ok(html.includes(`property="og:url" content="https://example.com/games/${game.id}"`));
    assert.match(html,/property="og:image" content="https:\/\/example.com\/social\/site-card-v1.png"/);
    assert.match(html,/property="og:image:type" content="image\/png"/);
    assert.match(html,/name="twitter:card" content="summary_large_image"/);
    assert.doesNotMatch(html,/og:video|twitter:player/);
  }
  assert.equal(readFileSync(new URL('../public/social/site-card-v1.png',import.meta.url)).subarray(1,4).toString(),'PNG');
  assert.match(notFoundHtml(),/noindex/);
  assert.doesNotMatch(notFoundHtml(),/src\/main|id="app"/);
});
test('versioned real capture manifest and opt-in Player Card keep one HTML representation',()=>{
  const game=gameCatalog[0],manifest={games:{[game.id]:{path:`/social/games/${game.id}.png`,version:'abc123',width:1200,height:630,alt:'Actual <game> & capture'}}};
  const html=socialMetadata(game,{origin:'https://example.com',manifest,playerEnabled:true});
  assert.ok(html.includes(`https://example.com/social/games/${game.id}.png?v=abc123`));
  assert.match(html,/Actual &lt;game&gt; &amp; capture/);
  assert.match(html,/name="twitter:card" content="player"/);
  assert.ok(html.includes(`name="twitter:player" content="https://example.com/embed/${game.id}"`));
  assert.match(html,/twitter:player:width" content="720"/);
  assert.match(html,/twitter:player:height" content="720"/);
});
test('homepage captures can omit alt and still get safe fallback text',()=>{
  const html=socialMetadata(null,{origin:'https://example.com',manifest:{games:{},homepage:{path:'/social/homepage.png',version:'abc',width:1200,height:630}}});
  assert.match(html,/https:\/\/example.com\/social\/homepage.png\?v=abc/);
  assert.match(html,/property="og:image:alt" content="OpenArcade — tiny games, big side quests"/);
  assert.match(html,/name="twitter:image:alt" content="OpenArcade — tiny games, big side quests"/);
});

test('direct embed shares advertise their playable URL and honor the image-card fallback',()=>{
  const game=gameCatalog[0];
  const options={origin:'https://example.com',embedPage:true,playerEnabled:true};
  const html=socialMetadata(game,options);
  const url=`https://example.com/embed/${game.id}`;
  assert.ok(html.includes(`rel="canonical" href="${url}"`));
  assert.ok(html.includes(`property="og:url" content="${url}"`));
  assert.ok(html.includes(`name="twitter:player" content="${url}"`));
  assert.equal((html.match(/name="twitter:card" content="player"/g)||[]).length,1);
  const fallback=socialMetadata(game,{...options,playerEnabled:false});
  assert.match(fallback,/name="twitter:card" content="summary_large_image"/);
  assert.doesNotMatch(fallback,/twitter:player/);
  assert.match(socialMetadata(null,options),/name="twitter:card" content="summary_large_image"/);
});

test('the build emits Player Cards on every game and direct embed share',()=>{
  const root=fileURLToPath(new URL('../',import.meta.url));
  const plugin=socialPagesPlugin({origin:'https://example.com',playerEnabled:true});
  plugin.configResolved({root});
  const emitted=new Map();
  plugin.generateBundle.call({emitFile(asset){emitted.set(asset.fileName,asset.source)}},{},{
    'index.html':{source:readFileSync(join(root,'index.html'),'utf8')},
    'embed.html':{source:readFileSync(join(root,'embed.html'),'utf8')},
  });
  for(const game of gameCatalog) for(const route of ['games','embed']) {
    const html=emitted.get(`${route}/${game.id}.html`);
    assert.match(html,/name="twitter:card" content="player"/,`${route}/${game.id}`);
    assert.ok(html.includes(`name="twitter:player" content="https://example.com/embed/${game.id}"`));
    assert.ok(html.includes(`rel="canonical" href="https://example.com/${route}/${game.id}"`));
  }
});
test('image manifest fails the build for missing, unknown or unsafe assets',()=>{
  const root=mkdtempSync(join(tmpdir(),'s05-manifest-'));
  try {
    assert.deepEqual(readImageManifest(root),{games:{}});
    mkdirSync(join(root,'public/social/games'),{recursive:true});
    const manifest={version:1,games:{snake:{path:'/social/games/snake.png',width:1200,height:630,version:'v1'}}};
    const save=()=>writeFileSync(join(root,'public/social/manifest.json'),JSON.stringify(manifest));save();
    assert.throws(()=>readImageManifest(root),/missing social image/);
    writeFileSync(join(root,'public/social/games/snake.png'),'fixture');
    assert.deepEqual(readImageManifest(root),manifest);
    manifest.games.snake.path='/social/games/../../../secret.png';save();
    assert.throws(()=>readImageManifest(root));
  }finally{rmSync(root,{recursive:true,force:true})}
});

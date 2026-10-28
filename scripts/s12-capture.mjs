import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { resolve, join } from 'node:path';
import { launchBrowser } from './s12-browser.mjs';

const args = process.argv.slice(2);
const ids = args.filter(arg => !arg.startsWith('--'));
const url = args.find(arg => arg.startsWith('--url='))?.slice(6) || 'http://127.0.0.1:4312/';
const out = resolve(args.find(arg => arg.startsWith('--out='))?.slice(6) || 'public/social');
const frameOption = args.find(arg => arg.startsWith('--frames='));
const frames = frameOption ? Number(frameOption.slice(9)) : 240;
if (!Number.isInteger(frames) || frames < 2 || frames > 3600) throw Error('Invalid --frames');
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
async function sourceFiles(dir) {
  const found = [];
  for (const entry of await readdir(dir, {withFileTypes:true})) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) found.push(...await sourceFiles(path));
    else if (entry.name.endsWith('.js')) found.push(path);
  }
  return found.sort();
}
const sourceHashes = {};
for (const file of await sourceFiles('src')) sourceHashes[file.replaceAll('\\','/')] = hash(await readFile(file));
for (const file of ['scripts/s12-capture-page.js','scripts/s12-capture.mjs']) sourceHashes[file] = hash(await readFile(file));
const browser = await launchBrowser({url: new URL('/scripts/s12-capture.html',url).href});
try {
  await browser.run("import('/scripts/s12-capture-page.js').then(module => { window.captureHarness = module; return true; })");
  const catalog = await browser.run('window.captureHarness.catalog()');
  const selected = ids.length ? catalog.filter(game => ids.includes(game.id)) : catalog;
  const unknown = ids.filter(id => !selected.some(game => game.id === id));
  if (unknown.length) throw Error(`Unknown IDs: ${unknown.join(', ')}`);
  await mkdir(join(out,'games'), {recursive:true});
  const manifest = {version:1,games:{}};
  const provenance = {version:1, method:'Seeded real game factory autoplay rendered in Chromium canvas', frames, sources:sourceHashes, games:{}};
  const failed = [];
  for (const game of selected) {
    try {
      const capture = await browser.run(`window.captureHarness.capture(${JSON.stringify(game.id)},${frames})`);
      const png = Buffer.from(capture.png.replace(/^data:image\/png;base64,/,''),'base64');
      if (png.readUInt32BE(16)!==1200 || png.readUInt32BE(20)!==630) throw Error('Invalid PNG dimensions');
      const digest = hash(png);
      await writeFile(join(out,'games',`${game.id}.png`),png);
      manifest.games[game.id] = {path:`/social/games/${game.id}.png`,width:1200,height:630,alt:`${game.name} gameplay in OpenArcade`,version:digest};
      provenance.games[game.id] = {source:game.source, sha256:digest, canvasWidth:capture.canvasWidth, canvasHeight:capture.canvasHeight, sampledColors:capture.colors, selectedFrame:capture.selectedFrame, samples:capture.samples};
      console.log(`Captured ${game.id}`);
    } catch (error) { failed.push({id:game.id,error:String(error)}); console.error(`FAILED ${game.id}: ${error}`); }
  }
  if (failed.length) throw Error(`${failed.length} capture(s) failed: ${failed.map(f=>f.id).join(', ')}`);
  // A partial run must never publish an incomplete catalog manifest.
  if (!ids.length) {
    const chosen = [0, 15, 32, 48, 70, 90].map(index => selected[index]).filter(Boolean);
    const sources = await Promise.all(chosen.map(async game => `data:image/png;base64,${(await readFile(join(out,'games',`${game.id}.png`))).toString('base64')}`));
    const mosaicUrl = await browser.run(`(async () => { const sources = ${JSON.stringify(sources)}; const names = ${JSON.stringify(chosen.map(game => game.name))}; const card = document.createElement('canvas'); card.width=1200; card.height=630; const c=card.getContext('2d'); c.fillStyle='#10191c'; c.fillRect(0,0,1200,630); c.fillStyle='#b5f36f'; c.font='700 32px system-ui'; c.fillText('OPENARCADE',38,48); c.fillStyle='#eff7e8'; c.font='22px system-ui'; c.fillText('Watch AI / Play free',38,78); for (let i=0;i<sources.length;i++) { const img=new Image(); img.src=sources[i]; await img.decode(); const x=30+(i%3)*390, y=100+Math.floor(i/3)*255; c.fillStyle='#1d2b2a'; c.fillRect(x,y,370,235); const scale=Math.min(362/590,200/550),w=590*scale,h=550*scale; c.drawImage(img,575,40,590,550,x+(370-w)/2,y+4,w,h); c.fillStyle='#eff7e8'; c.font='18px system-ui'; c.fillText(names[i],x+10,y+226,350); } return card.toDataURL('image/png'); })()`);
    const mosaic = Buffer.from(mosaicUrl.slice(mosaicUrl.indexOf(',')+1),'base64');
    await writeFile(join(out,'homepage.png'),mosaic);
    manifest.homepage = {path:'/social/homepage.png',width:1200,height:630,alt:'OpenArcade gameplay from a selection of games',version:hash(mosaic)};
    provenance.homepage = {games:chosen.map(game=>game.id),sha256:hash(mosaic)};
    await writeFile(join(out,'manifest.json'), JSON.stringify(manifest,null,2)+'\n');
    await writeFile(join(out,'provenance.json'), JSON.stringify(provenance,null,2)+'\n');
  }
  console.log(`Captured ${selected.length} games${ids.length ? ' (partial run; no manifest written)' : ''}`);
} finally { await browser.close(); }


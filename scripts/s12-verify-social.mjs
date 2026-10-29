// Read-only HTTP evidence: no JavaScript, browser, cookies, API calls or score writes.
import {readFile, writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {gameCatalog, getGame} from '../src/catalog.js';

const args = process.argv.slice(2);
const option = name => args.find(value => value.startsWith(`--${name}=`))?.slice(name.length + 3);
if (!option('url')) throw Error('Pass --url=<preview-or-public-origin>');
const base = new URL(option('url'));
if (!['https:', 'http:'].includes(base.protocol) || base.username || base.password || base.pathname !== '/' || base.search || base.hash) throw Error('Expected HTTP(S) origin without credentials, path, query or fragment');
const manifest = JSON.parse(await readFile(new URL('../public/social/manifest.json', import.meta.url), 'utf8'));
if (gameCatalog.length !== 112 || Object.keys(manifest.games).sort().join(',') !== gameCatalog.map(game => game.id).sort().join(',')) throw Error('Manifest/catalog coverage mismatch');
const report = {url: base.origin, revision: option('revision') || 'unspecified', date: new Date().toISOString(), checks: [], limitations: ['HTTP responses only; no JavaScript, account, DB, gameplay, iframe execution or X client verification']};
if (args.includes('--embeds') && !args.includes('--require-frame-policy')) report.limitations.push('Frame policy not required: Vite preview does not apply Vercel headers');
if (args.includes('--embeds')) report.limitations.push('Raw HTML cannot verify the dynamically generated full-site fallback or prove X client playback');
if (args.includes('--map-images')) report.limitations.push('Image HTTP requests mapped to tested origin; advertised canonical image host not verified');
const unescape = value => value.replaceAll('&amp;', '&').replaceAll('&quot;', '"').replaceAll('&#39;', "'").replaceAll('&lt;', '<').replaceAll('&gt;', '>');
const attributes = tag => Object.fromEntries([...tag.matchAll(/([\w:-]+)\s*=\s*(["'])(.*?)\2/gs)].map(match => [match[1].toLowerCase(), unescape(match[3])]));
async function get(path) {
  const response = await fetch(new URL(path, base.origin), {headers: {'User-Agent': 'OpenArcade-S12-ReadOnly-Verification'}, signal: AbortSignal.timeout(15000), redirect: 'manual'});
  if (response.status >= 300 && response.status < 400) throw Error(`Unexpected redirect ${response.status} to ${response.headers.get('location')}`);
  return response;
}
function requireFramePolicy(response, embed) {
  const csp = response.headers.get('content-security-policy') || '';
  const directives = csp.split(';').map(part => part.trim()).filter(Boolean);
  const matches = directives.filter(part => /^frame-ancestors(?:\s|$)/i.test(part));
  if (matches.length !== 1) throw Error('Expected exactly one frame-ancestors directive');
  const sources = matches[0].split(/\s+/).slice(1).sort();
  const expected = (embed ? ["'self'", 'https://x.com', 'https://twitter.com'] : ["'none'"]).sort();
  if (sources.join(' ') !== expected.join(' ')) throw Error(`Unexpected frame-ancestors: ${sources.join(' ')}`);
  const xfo = response.headers.get('x-frame-options');
  if (embed ? !!xfo : (xfo || '').toUpperCase() !== 'DENY') throw Error(`Unexpected X-Frame-Options: ${xfo}`);
}
async function check(name, work) {
  try { report.checks.push({name, status: 'pass', ...await work()}); }
  catch (error) { report.checks.push({name, status: 'fail', error: String(error.message || error)}); }
}
for (const [id, image] of [['homepage', manifest.homepage], ...Object.entries(manifest.games)]) {
  const route = id === 'homepage' ? '/' : `/games/${id}`;
  await check(route, async () => {
    const response = await get(route);
    if (response.status !== 200 || !/text\/html/i.test(response.headers.get('content-type') || '')) throw Error(`HTML ${response.status}`);
    const html = await response.text(), tags = {};
    for (const match of html.matchAll(/<meta\b[^>]*>/gi)) { const attr = attributes(match[0]); tags[attr.property || attr.name] = attr.content; }
    const canonical = [...html.matchAll(/<link\b[^>]*>/gi)].map(match => attributes(match[0])).find(attr => attr.rel === 'canonical')?.href;
    for (const key of ['og:title', 'og:type', 'og:url', 'og:image', 'og:image:alt', 'twitter:card', 'twitter:image']) if (!tags[key]) throw Error(`Missing initial ${key}`);
    if (id !== 'homepage' && tags['og:title'] !== `${getGame(id).name} — OpenArcade`) throw Error('Wrong game social title');
    if (tags['og:image:alt'] !== image.alt) throw Error('Wrong image alt description');
    if (!canonical || canonical !== tags['og:url']) throw Error('Canonical and og:url mismatch');
    const canonicalURL = new URL(canonical), imageURL = new URL(tags['og:image']);
    if (canonicalURL.protocol !== 'https:' || imageURL.protocol !== 'https:') throw Error('Canonical/image must be absolute HTTPS');
    if (canonicalURL.origin !== imageURL.origin) throw Error('Image origin differs from canonical origin');
    if (canonicalURL.search || canonicalURL.hash || imageURL.hash) throw Error('Unexpected canonical query/fragment or image fragment');
    if (tags['twitter:card'] !== 'summary_large_image' && !(id !== 'homepage' && tags['twitter:card'] === 'player')) throw Error('Unexpected Twitter card type');
    if (tags['twitter:card'] === 'player' && (tags['twitter:player'] !== `${canonicalURL.origin}/embed/${id}` || tags['twitter:player:width'] !== '720' || tags['twitter:player:height'] !== '720')) throw Error('Invalid player card metadata');
    if (args.includes('--require-frame-policy')) requireFramePolicy(response, false);
    if (canonicalURL.pathname !== route) throw Error(`Wrong canonical path ${canonicalURL.pathname}`);
    if (option('canonical') && canonicalURL.origin !== new URL(option('canonical')).origin) throw Error('Wrong canonical origin');
    if (!image || imageURL.pathname !== image.path || imageURL.searchParams.get('v') !== image.version) throw Error('Wrong game image/version');
    if (tags['twitter:image'] !== tags['og:image']) throw Error('Twitter/OG image mismatch');
    if (tags['og:image:width'] !== '1200' || tags['og:image:height'] !== '630') throw Error('Wrong image dimensions metadata');
    const fetchedImage = args.includes('--map-images') ? new URL(imageURL.pathname + imageURL.search, base.origin).href : imageURL.href;
    const pngResponse = await get(fetchedImage);
    if (pngResponse.status !== 200 || !/image\/png/i.test(pngResponse.headers.get('content-type') || '')) throw Error(`Image HTTP/type ${pngResponse.status}`);
    const png = Buffer.from(await pngResponse.arrayBuffer());
    if (png.length < 24 || png.subarray(0, 8).toString('hex') !== '89504e470d0a1a0a' || png.readUInt32BE(16) !== 1200 || png.readUInt32BE(20) !== 630) throw Error('Invalid image response bytes');
    if (createHash('sha256').update(png).digest('hex') !== image.version) throw Error('Image response hash differs from manifest');
    return {canonical, image: tags['og:image'], fetchedImage, bytes: png.length, card: tags['twitter:card']};
  });
  if (args.includes('--embeds') && id !== 'homepage') await check(`/embed/${id}`, async () => {
    const response = await get(`/embed/${id}`), html = await response.text();
    if (response.status !== 200 || !/text\/html/i.test(response.headers.get('content-type') || '')) throw Error(`Embed HTML ${response.status}`);
    const tags = {};
    for (const match of html.matchAll(/<meta\b[^>]*>/gi)) { const attr = attributes(match[0]); tags[attr.property || attr.name] = attr.content; }
    const canonical = [...html.matchAll(/<link\b[^>]*>/gi)].map(match => attributes(match[0])).find(attr => attr.rel === 'canonical')?.href;
    const expectedOrigin = option('canonical') ? new URL(option('canonical')).origin : new URL(tags['og:url']).origin;
    const expected = `${expectedOrigin}/games/${id}`;
    if (canonical !== expected || tags['og:url'] !== expected) throw Error('Embed canonical/OG URL mismatch');
    if (tags['og:title'] !== `${getGame(id).name} — OpenArcade`) throw Error('Wrong embed game title');
    const expectedImage = new URL(manifest.games[id].path, expectedOrigin);
    expectedImage.searchParams.set('v', manifest.games[id].version);
    if (tags['og:image'] !== expectedImage.href || tags['twitter:image'] !== expectedImage.href || tags['og:image:width'] !== '1200' || tags['og:image:height'] !== '630') throw Error('Wrong embed game image/version/dimensions');
    if (tags.robots !== 'noindex') throw Error('Embed missing noindex');
    if (!/<main\b[^>]*\bid=["']embed["']/i.test(html) || !/<script\b[^>]*\bsrc=["'][^"']*embed[^"']*\.js["']/i.test(html)) throw Error('Embed entry or script missing');
    const xfo = response.headers.get('x-frame-options');
    if (xfo) throw Error(`Unexpected embed X-Frame-Options: ${xfo}`);
    if (args.includes('--require-frame-policy')) requireFramePolicy(response, true);
    return {canonical, csp: response.headers.get('content-security-policy'), xFrameOptions: xfo};
  });
}
for (const route of ['/games/s12-nonexistent-game', ...(args.includes('--embeds') ? ['/embed/s12-nonexistent-game'] : [])]) await check(route, async () => {
  const response = await get(route);
  if (response.status !== 404) throw Error(`Expected 404, received ${response.status}`);
  return {statusCode: response.status};
});
report.status = report.checks.some(check => check.status === 'fail') ? 'fail' : 'pass';
const output = JSON.stringify(report, null, 2) + '\n';
if (option('out')) await writeFile(option('out'), output); else process.stdout.write(output);
console.log(`${report.status}: ${report.checks.filter(check => check.status === 'pass').length}/${report.checks.length} HTTP checks`);
if (report.status === 'fail') process.exitCode = 1;

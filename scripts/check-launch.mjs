import {pathToFileURL} from 'node:url';

class ProbeError extends Error {}

// Anonymous GETs only. No credentials, cookies, bypass headers or write actions.
export function siteOrigin(value) {
  const url = new URL(value);
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password ||
      url.search || url.hash || url.pathname !== '/') throw new ProbeError('Expected a bare HTTP(S) origin without credentials.');
  if (url.protocol !== 'https:' && !['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)) {
    throw new Error('Public checks require HTTPS.');
  }
  return url.origin;
}

function attributes(tag) {
  return Object.fromEntries([...tag.matchAll(/([\w:-]+)\s*=\s*(["'])(.*?)\2/gs)]
    .map(([, key, , value]) => [key.toLowerCase(), value.replaceAll('&amp;', '&')]));
}

export async function checkLaunch(originValue, {fetchImpl = fetch, canonicalOrigin = originValue} = {}) {
  const origin = siteOrigin(originValue);
  const canonical = siteOrigin(canonicalOrigin);
  const results = [];
  const record = (name, ok, detail) => results.push({name, ok, detail});
  async function get(path, headers = {}) {
    let url = new URL(path, origin);
    for (let i = 0; i < 4; i++) {
      const response = await fetchImpl(url, {method: 'GET', redirect: 'manual',
        signal: AbortSignal.timeout(15000), headers: {'User-Agent': 'OpenArcade-Launch-Check/1.0', ...headers}});
      if (![301, 302, 303, 307, 308].includes(response.status)) return response;
      const location = response.headers.get('location');
      if (!location) throw new ProbeError('Redirect without location.');
      const next = new URL(location, url);
      if (next.origin !== origin || next.username || next.password) throw new ProbeError('Redirect leaves the checked origin. Run against the canonical origin.');
      url = next;
    }
    throw new ProbeError('Too many redirects.');
  }
  async function html(path) {
    const response = await get(path, {Accept: 'text/html'});
    if (response.status !== 200) throw new ProbeError(`HTTP ${response.status}`);
    if (!response.headers.get('content-type')?.includes('text/html')) throw new ProbeError('Expected HTML.');
    const body = await response.text();
    if (/<title[^>]*>[^<]*(?:authentication required|login.*vercel)/i.test(body)) throw new ProbeError('Authentication page returned.');
    return body;
  }
  async function check(name, work) {
    try { await work(); record(name, true, 'ok'); }
    catch (error) { record(name, false, error instanceof ProbeError ? error.message : 'Request failed, timed out or returned invalid data.'); }
  }
  await check('homepage', () => html('/'));
  let imagePath;
  await check('game initial metadata', async () => {
    const body = await html('/games/snake');
    const links = [...body.matchAll(/<link\b[^>]*>/gi)].map(([tag]) => attributes(tag));
    const tags = [...body.matchAll(/<meta\b[^>]*>/gi)].map(([tag]) => attributes(tag));
    if (!links.some(tag => tag.rel === 'canonical' && tag.href?.replace(/\/$/, '') === `${canonical}/games/snake`)) {
      throw new ProbeError('Missing or incorrect canonical game link in initial HTML.');
    }
    const image = tags.find(tag => tag.property?.toLowerCase() === 'og:image')?.content;
    if (!image) throw new ProbeError('Missing og:image in initial HTML.');
    const url = new URL(image);
    const version = [...url.searchParams];
    const validQuery = !version.length || (version.length === 1 && version[0][0] === 'v' && /^[a-f0-9]{64}$/i.test(version[0][1]));
    if (url.origin !== canonical || url.username || url.password || !validQuery || url.hash) {
      throw new ProbeError('Expected a canonical image URL with only an optional content-hash version.');
    }
    imagePath = url.pathname + url.search;
  });
  await check('game social image', async () => {
    if (!imagePath) throw new ProbeError('Image check blocked by missing/invalid metadata.');
    // Check the same build's asset even when its metadata points at production.
    const response = await get(imagePath, {Accept: 'image/*'});
    if (response.status !== 200) throw new ProbeError(`HTTP ${response.status}`);
    if (!response.headers.get('content-type')?.startsWith('image/')) throw new ProbeError('Expected an image, not an HTML fallback.');
    if (!(await response.arrayBuffer()).byteLength) throw new ProbeError('Empty image.');
  });
  await check('embed HTML', () => html('/embed/snake'));
  await check('unknown route 404', async () => {
    if ((await get('/__openarcade_launch_missing__')).status !== 404) throw new ProbeError('Expected a real HTTP 404.');
  });
  await check('feedback read', async () => {
    const response = await get('/api/feedback?gameId=snake', {'x-arcade-visitor': '00000000-0000-4000-8000-000000000011', Accept: 'application/json'});
    if (response.status !== 200) throw new ProbeError(`HTTP ${response.status}`);
    if (!response.headers.get('content-type')?.includes('application/json')) throw new ProbeError('Expected JSON.');
    const data = await response.json();
    if (!Number.isFinite(data.plays) || data.plays < 0 || !Array.isArray(data.comments)) throw new ProbeError('Unexpected feedback read shape.');
  });
  return results;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    const [origin, canonical] = process.argv.slice(2);
    if (!origin || process.argv.length > 4) throw new Error('Usage: node scripts/check-launch.mjs ORIGIN [CANONICAL_ORIGIN]');
    const results = await checkLaunch(origin, {canonicalOrigin: canonical ?? origin});
    for (const result of results) console.log(`${result.ok ? 'PASS' : 'FAIL'} ${result.name}: ${result.detail}`);
    if (results.some(result => !result.ok)) process.exitCode = 1;
  } catch { console.error('Usage: node scripts/check-launch.mjs ORIGIN [CANONICAL_ORIGIN] (bare HTTPS origins; HTTP allowed for localhost).'); process.exitCode = 1; }
}

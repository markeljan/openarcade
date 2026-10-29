import {cp, mkdir, mkdtemp, readFile, rename, rm, stat} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {existsSync, realpathSync} from 'node:fs';
import {basename, dirname, isAbsolute, join, relative, resolve} from 'node:path';

const digest = bytes => createHash('sha256').update(bytes).digest('hex');
const signature = Buffer.from([137,80,78,71,13,10,26,10]);
const within = (parent, child) => { const rel = relative(parent, child); return rel === '' || (!rel.startsWith('..' + '/') && !rel.startsWith('..' + '\\') && rel !== '..' && !isAbsolute(rel)); };

// Resolve existing ancestors so symlinked paths cannot bypass the partial guard.
function canonical(path) {
  let current = resolve(path), suffix = [];
  while (!existsSync(current)) { const parent = dirname(current); if (parent === current) break; suffix.unshift(basename(current)); current = parent; }
  return resolve(realpathSync(current), ...suffix);
}

// A partial capture never shares the published directory or an ancestor of it.
export function captureOutput(args, published = resolve('public/social')) {
  const ids = args.filter(arg => !arg.startsWith('--'));
  const option = args.find(arg => arg.startsWith('--out='));
  if (option && !option.slice(6)) throw Error('--out requires a path');
  const out = resolve(option?.slice(6) || published);
  published = resolve(published);
  if (ids.length && (!option || within(canonical(published), canonical(out)) || within(canonical(out), canonical(published)))) throw Error('Partial captures require --out outside public/social');
  return {ids, out};
}

export async function validateCapture(stage, ids, manifest, provenance) {
  if (!ids.length || new Set(ids).size !== ids.length) throw Error('Invalid capture catalog');
  for (const records of [manifest.games, provenance.games]) {
    if (!records || Object.keys(records).length !== ids.length || ids.some(id => !Object.hasOwn(records, id))) throw Error('Incomplete capture coverage');
  }
  async function image(path, expected) {
    const bytes = await readFile(path);
    if (bytes.length < 24 || !bytes.subarray(0,8).equals(signature) || bytes.readUInt32BE(16) !== 1200 || bytes.readUInt32BE(20) !== 630 || digest(bytes) !== expected) throw Error(`Invalid capture image: ${path}`);
  }
  for (const id of ids) {
    if (!/^[a-z0-9-]+$/.test(id)) throw Error(`Invalid game id: ${id}`);
    const entry = manifest.games[id], source = provenance.games[id];
    if (entry.path !== `/social/games/${id}.png` || entry.width !== 1200 || entry.height !== 630 || entry.version !== source.sha256) throw Error(`Invalid manifest entry: ${id}`);
    await image(join(stage,'games',`${id}.png`), entry.version);
  }
  if (!manifest.homepage || !provenance.homepage || manifest.homepage.path !== '/social/homepage.png' || manifest.homepage.width !== 1200 || manifest.homepage.height !== 630 || manifest.homepage.version !== provenance.homepage.sha256) throw Error('Invalid homepage entry');
  await image(join(stage,'homepage.png'), manifest.homepage.version);
  for (const [name, expected] of [['manifest.json',manifest],['provenance.json',provenance]]) {
    if (JSON.stringify(JSON.parse(await readFile(join(stage,name),'utf8'))) !== JSON.stringify(expected)) throw Error(`Invalid ${name}`);
  }
}

// Stage alongside the destination so directory renames stay on one filesystem.
export async function publishCapture(destination, generate, options = {}) {
  destination = resolve(destination);
  const parent = dirname(destination);
  await mkdir(parent, {recursive:true});
  const workspace = await mkdtemp(join(parent, `.${basename(destination)}-s12-`));
  const stage = join(workspace,'stage'), backup = join(workspace,'backup');
  const move = options.rename || rename;
  let hadDestination = false, backedUp = false, installed = false, preserveWorkspace = false;
  try {
    try { await stat(destination); hadDestination = true; } catch (error) { if (error.code !== 'ENOENT') throw error; }
    if (hadDestination) await cp(destination, stage, {recursive:true, errorOnExist:true});
    else await mkdir(stage);
    await generate(stage);
    if (hadDestination) { await move(destination, backup); backedUp = true; }
    try { await move(stage, destination); installed = true; }
    catch (error) {
      if (backedUp) {
        try { await rename(backup, destination); backedUp = false; }
        catch (restoreError) { preserveWorkspace = true; throw new AggregateError([error, restoreError], `Publication failed; backup retained at ${backup}`); }
      }
      throw error;
    }
  } finally {
    if (!preserveWorkspace) await rm(workspace, {recursive:true, force:true});
  }
  return {installed};
}

// Read-only cross-check of merged worker manifests, catalog and social assets.
import {readFile, writeFile} from 'node:fs/promises';
import {gameCatalog} from '../src/catalog.js';
import {scoreRegistry} from '../src/scores/registry.js';

const args = process.argv.slice(2);
const option = name => args.find(value => value.startsWith(`--${name}=`))?.slice(name.length + 3);
const manifest = JSON.parse(await readFile(new URL('../public/social/manifest.json', import.meta.url), 'utf8'));
const ids = gameCatalog.map(game => game.id), known = new Set(ids);
const report = {
  revision: option('revision') || 'unspecified', date: new Date().toISOString(), catalogCount: ids.length,
  missingImages: ids.filter(id => !manifest.games[id]), extraImages: Object.keys(manifest.games).filter(id => !known.has(id)),
  unsupportedScoring: ids.filter(id => !scoreRegistry.getRule(id)),
  registryProblems: scoreRegistry.checkCatalog(ids),
  limitations: ['A complete rule/worker coverage pair enables scoring; this check does not execute terminal provenance tests or verify deployed persistence'],
};
report.completeScoring = ids.length - report.unsupportedScoring.length;
report.status = report.missingImages.length || report.extraImages.length || report.registryProblems.length || ids.length !== 112 ? 'fail' : report.unsupportedScoring.length ? 'pending-scoring' : 'pass';
const json = JSON.stringify(report, null, 2) + '\n';
if (option('out')) await writeFile(option('out'), json); else process.stdout.write(json);
console.log(`${report.status}: ${ids.length - report.missingImages.length}/${ids.length} cards, ${report.completeScoring}/${ids.length} complete score contracts`);
if (report.status === 'fail' || (report.status === 'pending-scoring' && !args.includes('--allow-pending'))) process.exitCode = 1;

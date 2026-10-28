import r06 from './rules/s06.js';
import r07 from './rules/s07.js';
import r08 from './rules/s08.js';
import r09 from './rules/s09.js';
import r10 from './rules/s10.js';
import c06 from './coverage/s06.js';
import c07 from './coverage/s07.js';
import c08 from './coverage/s08.js';
import c09 from './coverage/s09.js';
import c10 from './coverage/s10.js';
export const RULE_SCHEMA_VERSION = 1;
export const COVERAGE_SCHEMA_VERSION = 1;
const text = value => typeof value === 'string' && value.trim().length > 0;
const links = value => Array.isArray(value) && value.length > 0 && value.every(text);
export function validateRule(rule) {
  const b = rule?.bounds;
  return !!(rule?.schemaVersion === 1 && text(rule.gameId) && text(rule.source) && text(rule.metric) && text(rule.units) &&
    ['asc', 'desc'].includes(rule.order) && Number.isInteger(rule.version) && rule.version > 0 &&
    ['pending', 'complete'].includes(rule.status) && b &&
    Number.isFinite(b.minScore) && Number.isFinite(b.maxScore) && b.maxScore >= b.minScore && typeof b.integer === 'boolean' &&
    Number.isFinite(b.minDurationMs) && b.minDurationMs >= 0 && Number.isFinite(b.maxDurationMs) && b.maxDurationMs >= b.minDurationMs);
}
export function validateCoverage(entry) {
  if (entry?.schemaVersion !== 1 || !text(entry.gameId) || !text(entry.source) || !Number.isInteger(entry.ruleVersion) || entry.ruleVersion < 1 || !['pending', 'complete'].includes(entry.status)) return false;
  if (entry.status === 'pending') return true;
  return ['human', 'ai'].every(actor => text(entry[actor]?.terminal) && text(entry[actor]?.provenance) && links(entry[actor]?.tests));
}
/** Empty/pending shards are expected during rollout; enable only complete pairs. */
export function createScoreRegistry(rules = [], coverage = []) {
  const byId = new Map(), evidence = new Map();
  for (const rule of rules) {
    if (!validateRule(rule) || byId.has(rule.gameId)) throw new Error('Invalid or duplicate score rule: ' + rule?.gameId);
    byId.set(rule.gameId, Object.freeze({...rule, bounds: Object.freeze({...rule.bounds})}));
  }
  for (const entry of coverage) {
    if (!validateCoverage(entry) || evidence.has(entry.gameId)) throw new Error('Invalid or duplicate score coverage: ' + entry?.gameId);
    evidence.set(entry.gameId, entry);
  }
  function getRule(gameId) {
    const rule = byId.get(gameId), entry = evidence.get(gameId);
    return rule?.status === 'complete' && entry?.status === 'complete' && entry.ruleVersion === rule.version && entry.source === rule.source ? rule : null;
  }
  return {
    getRule,
    checkCatalog(ids, {complete = false} = {}) {
      const catalog = new Set(ids), problems = [];
      if (catalog.size !== ids.length) problems.push('Duplicate catalog IDs');
      for (const id of new Set([...byId.keys(), ...evidence.keys()])) if (!catalog.has(id)) problems.push('Extra score ID: ' + id);
      if (complete) for (const id of catalog) if (!getRule(id)) problems.push('Incomplete score ID: ' + id);
      return problems;
    },
  };
}
export const scoreRegistry = createScoreRegistry([r06, r07, r08, r09, r10].flat(), [c06, c07, c08, c09, c10].flat());

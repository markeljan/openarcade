import {createHash, createHmac} from 'node:crypto';
import {isIP} from 'node:net';
import {scoreRegistry} from '../src/scores/registry.js';

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const nonce = /^[A-Za-z0-9_-]{43}$/;
const maxBody = 8192;
const hash = value => createHash('sha256').update(value).digest('hex');
const keys = (object, allowed) => object && typeof object === 'object' && !Array.isArray(object) && Object.keys(object).every(key => allowed.includes(key));
function reply(res, status, body) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.end(JSON.stringify(body));
}
function readBody(req) {
  let body = req.body;
  const length = Number(req.headers?.['content-length']);
  if (Number.isFinite(length) && length > maxBody) throw Object.assign(Error('body-too-large'), {status: 413});
  try {
    const serialized = typeof body === 'string' ? body : JSON.stringify(body);
    if (!serialized || Buffer.byteLength(serialized) > maxBody) throw Object.assign(Error('body-too-large'), {status: 413});
    if (typeof body === 'string') body = JSON.parse(body);
  } catch (error) { if (error.status) throw error; throw Object.assign(Error('invalid-body'), {status: 400}); }
  if (!body || typeof body !== 'object' || Array.isArray(body)) throw Object.assign(Error('invalid-body'), {status: 400});
  return body;
}
export function validateScoreRun(run, rule) {
  if (!keys(run, ['schemaVersion', 'runId', 'gameId', 'ruleVersion', 'score', 'result', 'durationMs', 'actor', 'context', 'provenance', 'submissionEligible'])) return false;
  const b = rule?.bounds;
  return !!(b && run.schemaVersion === 1 && uuid.test(run.runId) && run.gameId === rule.gameId && run.ruleVersion === rule.version &&
    typeof run.score === 'number' && Number.isFinite(run.score) && run.score >= b.minScore && run.score <= b.maxScore && (!b.integer || Number.isSafeInteger(run.score)) &&
    Number.isSafeInteger(run.durationMs) && run.durationMs >= b.minDurationMs && run.durationMs <= b.maxDurationMs &&
    typeof run.result === 'string' && run.result.trim().length > 0 && run.result.length <= 80 && !/[\u0000-\u001f]/.test(run.result) &&
    run.provenance === 'client-reported' && run.submissionEligible === true &&
    ((run.actor === 'human' && ['manual-player', 'embed'].includes(run.context)) || (run.actor === 'ai' && ['watch-player', 'embed'].includes(run.context))));
}
/** Outside Vercel, use the socket address. Never trust client-forwarded IPs. */
export function requestAddress(req, onVercel = false) {
  const address = onVercel ? req.headers?.['x-vercel-forwarded-for'] : req.socket?.remoteAddress;
  return typeof address === 'string' && isIP(address) ? address : null;
}

export function createScoresHandler({store, catalogIds = [], registry = scoreRegistry, verifyIdentity = async () => ({status: 'unavailable'}), allowedOrigins = [], receiptSecret, writesEnabled = false, clientAddress = requestAddress, logger = () => {}} = {}) {
  const catalog = new Set(catalogIds);
  const permitted = new Set(allowedOrigins.filter(value => { try { return new URL(value).origin === value; } catch { return false; } }));
  return async function handler(req, res) {
    const fail = (status, code) => reply(res, status, {error: code});
    try {
      if (!['GET', 'POST'].includes(req.method)) { res.setHeader('Allow', 'GET, POST'); return fail(405, 'method-not-allowed'); }
      if (!store) return fail(503, 'scores-unavailable');
      if (req.method === 'GET') {
        const url = new URL(req.url, 'https://openarcade.invalid');
        const gameId = url.searchParams.get('gameId'), rule = registry.getRule(gameId);
        if (!catalog.has(gameId)) return fail(400, 'unknown-game');
        if (!rule) return fail(409, 'score-rule-pending');
        const filter = url.searchParams.get('filter') ?? 'players';
        if (!['players', 'ai', 'all'].includes(filter)) return fail(400, 'invalid-filter');
        let identity = {status: 'unauthenticated'};
        if (req.headers?.authorization) {
          identity = await verifyIdentity(req);
          if (identity.status !== 'authenticated') return fail(identity.status === 'unavailable' ? 503 : 401, 'identity-unavailable');
        }
        const board = await store.leaderboard({gameId, ruleVersion: rule.version, order: rule.order, filter, userId: identity.userId ?? null});
        return reply(res, 200, {...board, gameId, ruleVersion: rule.version, metric: rule.metric, units: rule.units, order: rule.order, filter, integrity: 'client-reported'});
      }
      // Server policy is essential for capture/test deployments; client flags are insufficient.
      if (!writesEnabled) return fail(503, 'score-writes-disabled');
      if (!receiptSecret || receiptSecret.length < 32 || permitted.size === 0) return fail(503, 'score-config-unavailable');
      const origin = req.headers?.origin;
      if (typeof origin !== 'string' || !permitted.has(origin)) return fail(403, 'origin-forbidden');
      if (!/^application\/json(?:\s*;|$)/i.test(req.headers?.['content-type'] ?? '')) return fail(415, 'json-required');
      const body = readBody(req);
      if (!['submit', 'pending', 'guest', 'ai', 'claim'].includes(body.action)) return fail(400, 'invalid-action');
      let identity = {status: 'unauthenticated'};
      if (req.headers?.authorization || ['submit', 'claim'].includes(body.action)) {
        identity = await verifyIdentity(req);
        if (identity.status !== 'authenticated') return fail(identity.status === 'unavailable' ? 503 : 401, identity.status === 'unavailable' ? 'identity-unavailable' : 'sign-in-required');
      }
      const address = clientAddress(req);
      if (!address) return fail(503, 'rate-limit-unavailable');
      // Fixed window in Postgres; independent from score transaction/rollback.
      const scopes = ['ip:' + address];
      if (identity.userId) scopes.push('account:' + identity.userId);
      for (const scope of scopes) {
        const limit = await store.rateLimit({scope: createHmac('sha256', receiptSecret).update(scope).digest('hex'), windowSeconds: 60, limit: scope.startsWith('ip:') ? 120 : 60});
        if (!limit.allowed) { res.setHeader('Retry-After', String(limit.retryAfter ?? 60)); return fail(429, 'rate-limited'); }
      }
      if (body.action === 'claim') {
        if (!keys(body, ['action', 'runId', 'claimToken']) || !uuid.test(body.runId) || !nonce.test(body.claimToken)) return fail(400, 'invalid-claim');
        const result = await store.claim({runId: body.runId, claimHash: hash(body.claimToken), userId: identity.userId, displayName: identity.displayName || 'Player'});
        if (result.status === 'expired') return fail(410, 'claim-expired');
        if (result.status === 'forbidden') return fail(403, 'claim-forbidden');
        if (result.status === 'conflict') return fail(409, 'run-conflict');
        return reply(res, 200, result);
      }
      if (!keys(body, ['action', 'run', 'guestName', 'attribution', 'claimNonce'])) return fail(400, 'invalid-fields');
      const run = body.run, rule = registry.getRule(run?.gameId);
      if (!catalog.has(run?.gameId)) return fail(400, 'unknown-game');
      if (!rule) return fail(409, 'score-rule-pending');
      if (!validateScoreRun(run, rule)) return fail(400, 'invalid-run');
      if ((body.action === 'ai') !== (run.actor === 'ai')) return fail(400, 'actor-mismatch');
      if (body.action === 'guest' && (run.context !== 'embed' || !/^[A-Z]{4}$/.test(body.guestName))) return fail(400, 'invalid-guest');
      if (body.action !== 'guest' && body.guestName !== undefined) return fail(400, 'invalid-guest');
      if (body.action === 'pending' ? !nonce.test(body.claimNonce) : body.claimNonce !== undefined) return fail(400, 'invalid-claim-nonce');
      if (body.attribution !== undefined && !['x', 'direct'].includes(body.attribution)) return fail(400, 'invalid-attribution');
      if (run.context !== 'embed' && body.attribution !== undefined) return fail(400, 'invalid-attribution');
      const userId = body.action === 'submit' ? identity.userId : null;
      const canonical = {action: body.action, run: {schemaVersion: 1, runId: run.runId.toLowerCase(), gameId: run.gameId, ruleVersion: run.ruleVersion, score: run.score, result: run.result, durationMs: run.durationMs, actor: run.actor, context: run.context, provenance: run.provenance, submissionEligible: true}, guestName: body.guestName ?? null, attribution: body.attribution ?? null, claimNonce: body.claimNonce ?? null, userId};
      const fingerprint = hash(JSON.stringify(canonical));
      const claimToken = body.action === 'pending' ? createHmac('sha256', receiptSecret).update(run.runId.toLowerCase() + ':' + fingerprint + ':' + body.claimNonce).digest('base64url') : null;
      const result = await store.submit({runId: run.runId.toLowerCase(), gameId: run.gameId, ruleVersion: rule.version, order: rule.order, score: run.score, actor: run.actor, userId, displayName: body.action === 'guest' ? body.guestName : userId ? identity.displayName || 'Player' : 'Guest', fingerprint, claimHash: claimToken ? hash(claimToken) : null, details: {durationMs: run.durationMs, result: run.result, context: run.context, attribution: body.attribution ?? null, provenance: 'client-reported'}});
      if (result.status === 'conflict') return fail(409, 'run-conflict');
      if (result.status === 'expired') return fail(410, 'run-expired');
      return reply(res, 200, {...result, ...(claimToken ? {claimToken} : {})});
    } catch (error) {
      if (error.status) return fail(error.status, error.message);
      // Deliberately omit SQL, tokens, identity, body and exception text.
      try { logger({code: 'scores-unavailable'}); } catch {}
      return fail(503, 'scores-unavailable');
    }
  };
}

import {neon} from '@neondatabase/serverless';
import {verifyRequestIdentity} from '../server/auth.js';

const idPattern = /^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/;
const visitorPattern = /^[a-f0-9]{8}-[a-f0-9]{4}-[1-8][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i;
const gameValid = id => typeof id === 'string' && id.length <= 64 && idPattern.test(id);
const count = n => Number(n) || 0;
const MAX_BODY_BYTES = 2048;

function reply(res, status, body) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify(body));
}

// The account row lock makes limits durable across concurrent function workers.
// Rate consumption and comment insertion share one SQL statement/transaction.
export const insertCommentSql = `WITH budget AS (
  INSERT INTO arcade_comment_limits (clerk_user_id,minute_start,minute_count,day_start,day_count)
  VALUES ($1,now(),1,now(),1)
  ON CONFLICT (clerk_user_id) DO UPDATE SET
    minute_start=CASE WHEN arcade_comment_limits.minute_start <= now()-interval '1 minute' THEN now() ELSE arcade_comment_limits.minute_start END,
    minute_count=CASE WHEN arcade_comment_limits.minute_start <= now()-interval '1 minute' THEN 1 ELSE arcade_comment_limits.minute_count+1 END,
    day_start=CASE WHEN arcade_comment_limits.day_start <= now()-interval '24 hours' THEN now() ELSE arcade_comment_limits.day_start END,
    day_count=CASE WHEN arcade_comment_limits.day_start <= now()-interval '24 hours' THEN 1 ELSE arcade_comment_limits.day_count+1 END
  WHERE (arcade_comment_limits.minute_start <= now()-interval '1 minute' OR arcade_comment_limits.minute_count < 5)
    AND (arcade_comment_limits.day_start <= now()-interval '24 hours' OR arcade_comment_limits.day_count < 50)
  RETURNING clerk_user_id
), profile AS (
  INSERT INTO arcade_comment_profiles (clerk_user_id,display_name)
  SELECT clerk_user_id,$2 FROM budget
  ON CONFLICT (clerk_user_id) DO UPDATE SET display_name=EXCLUDED.display_name,updated_at=now()
  RETURNING clerk_user_id
)
INSERT INTO arcade_comments (game_id,body,author_clerk_user_id,author_display_name)
SELECT $3,$4,clerk_user_id,$2 FROM profile RETURNING id`;

export function createFeedbackHandler(query, {verifyIdentity = verifyRequestIdentity, onError = () => {}} = {}) {
  async function one(gameId, visitor) {
    const [scores, votes, comments] = await Promise.all([
      query('SELECT plays FROM arcade_plays WHERE game_id=$1', [gameId]),
      query('SELECT COUNT(*) FILTER (WHERE value=1) AS upvotes, COUNT(*) FILTER (WHERE value=-1) AS downvotes, COALESCE(MAX(value) FILTER (WHERE visitor_id=$2::uuid),0) AS user_vote FROM arcade_votes WHERE game_id=$1', [gameId, visitor]),
      query('SELECT body,created_at,author_clerk_user_id FROM arcade_comments WHERE game_id=$1 AND removed_at IS NULL ORDER BY created_at DESC,id DESC LIMIT 100', [gameId]),
    ]);
    const v = votes[0] || {};
    return {
      plays: count(scores[0]?.plays), upvotes: count(v.upvotes), downvotes: count(v.downvotes), userVote: count(v.user_vote),
      comments: comments.map(c => ({text: c.body, createdAt: c.created_at,
        author: {kind: c.author_clerk_user_id ? 'account' : 'anonymous', displayName: c.author_clerk_user_id ? 'Player' : 'Anonymous'},
      })),
    };
  }
  return async function handler(req, res) {
    const visitor = req.headers?.['x-arcade-visitor'];
    if (typeof visitor !== 'string' || !visitorPattern.test(visitor)) return reply(res, 400, {code: 'invalid_visitor', error: 'A valid visitor ID is required.'});
    if (!query) return reply(res, 503, {code: 'feedback_unavailable', error: 'Feedback is not configured yet.'});
    try {
      if (req.method === 'GET') {
        const url = new URL(req.url, 'http://localhost');
        if (url.searchParams.get('all') === '1') {
          const rows = await query('SELECT COALESCE(p.game_id,v.game_id) AS game_id,COALESCE(p.plays,0) AS plays,COALESCE(v.upvotes,0) AS upvotes,COALESCE(v.downvotes,0) AS downvotes FROM arcade_plays p FULL OUTER JOIN (SELECT game_id,COUNT(*) FILTER (WHERE value=1) AS upvotes,COUNT(*) FILTER (WHERE value=-1) AS downvotes FROM arcade_votes GROUP BY game_id) v ON p.game_id=v.game_id', []);
          return reply(res, 200, Object.fromEntries(rows.map(r => [r.game_id, {plays: count(r.plays), upvotes: count(r.upvotes), downvotes: count(r.downvotes)}])));
        }
        const gameId = url.searchParams.get('gameId');
        if (!gameValid(gameId)) return reply(res, 400, {code: 'invalid_game', error: 'Invalid game ID.'});
        return reply(res, 200, await one(gameId, visitor));
      }
      if (req.method !== 'POST') {
        res.setHeader('Allow', 'GET, POST');
        return reply(res, 405, {code: 'invalid_method', error: 'Method not allowed.'});
      }
      let body = req.body;
      // Vercel supplies raw JSON or parsed objects; include unknown fields and
      // multibyte content in the same UTF-8 byte limit for both representations.
      let serialized;
      try { serialized = typeof body === 'string' ? body : JSON.stringify(body); } catch { return reply(res, 400, {code: 'invalid_body', error: 'Invalid request.'}); }
      if (Number(req.headers?.['content-length']) > MAX_BODY_BYTES || (serialized && Buffer.byteLength(serialized, 'utf8') > MAX_BODY_BYTES)) return reply(res, 413, {code: 'body_too_large', error: 'Request is too large.'});
      if (typeof body === 'string') {
        try { body = JSON.parse(body); } catch { return reply(res, 400, {code: 'invalid_body', error: 'Invalid request.'}); }
      }
      if (!body || typeof body !== 'object' || Array.isArray(body) || !gameValid(body.gameId)) return reply(res, 400, {code: 'invalid_game', error: 'Invalid game ID.'});
      const {gameId, action} = body;
      if (action === 'play') await query('INSERT INTO arcade_plays (game_id,plays) VALUES ($1,1) ON CONFLICT (game_id) DO UPDATE SET plays=arcade_plays.plays+1', [gameId]);
      else if (action === 'vote' && [-1, 0, 1].includes(body.value)) {
        if (body.value === 0) await query('DELETE FROM arcade_votes WHERE game_id=$1 AND visitor_id=$2::uuid', [gameId, visitor]);
        else await query('INSERT INTO arcade_votes (game_id,visitor_id,value) VALUES ($1,$2::uuid,$3) ON CONFLICT (game_id,visitor_id) DO UPDATE SET value=EXCLUDED.value', [gameId, visitor, body.value]);
      } else if (action === 'comment') {
        const text = typeof body.text === 'string' ? body.text.trim() : '';
        if (!text || Array.from(text).length > 280) return reply(res, 400, {code: 'invalid_comment', error: 'Comments must contain 1 to 280 characters.'});
        const identity = await verifyIdentity(req);
        if (identity?.status === 'unauthenticated') return reply(res, 401, {code: 'sign_in_required', error: 'Sign in again to post your comment. Your draft is saved.'});
        if (identity?.status !== 'authenticated' || typeof identity.userId !== 'string' || !identity.userId) return reply(res, 503, {code: 'auth_unavailable', error: 'Sign-in verification is unavailable. Please try again. Your draft is saved.'});
        const rows = await query(insertCommentSql, [identity.userId, 'Player', gameId, text]);
        if (!rows.length) {
          res.setHeader('Retry-After', '60');
          return reply(res, 429, {code: 'comment_rate_limited', error: 'Comment limit reached. Please try again later. Your draft is saved.'});
        }
      } else return reply(res, 400, {code: 'invalid_feedback', error: 'Invalid feedback.'});
      return reply(res, 200, await one(gameId, visitor));
    } catch {
      // Log a stable code only: never request text, credentials or query errors.
      try { onError('feedback_unavailable'); } catch {}
      return reply(res, 503, {code: 'feedback_unavailable', error: 'Feedback is unavailable. Please try again later.'});
    }
  };
}

export default async function handler(req, res) {
  const url = process.env.DATABASE_URL;
  let query;
  if (url) { try { const sql = neon(url); query = (text, params) => sql.query(text, params); } catch {} }
  return createFeedbackHandler(query, {onError: code => console.error(code)})(req, res);
}

import {neon} from '@neondatabase/serverless';
import {gameCatalog} from '../src/catalog.js';
import {verifyRequestIdentity} from '../server/auth.js';
import {createScoreStore} from '../server/score-store.js';
import {createScoresHandler, requestAddress} from '../server/scores-handler.js';

export default async function handler(req, res) {
  let store;
  if (process.env.DATABASE_URL) {
    try { const sql = neon(process.env.DATABASE_URL); store = createScoreStore((text, params) => sql.query(text, params)); } catch {}
  }
  return createScoresHandler({
    store, catalogIds: gameCatalog.map(game => game.id), verifyIdentity: verifyRequestIdentity,
    allowedOrigins: (process.env.SCORE_ALLOWED_ORIGINS ?? '').split(',').map(value => value.trim()).filter(Boolean),
    receiptSecret: process.env.SCORE_RECEIPT_SECRET,
    writesEnabled: process.env.SCORE_WRITES_ENABLED === 'true',
    clientAddress: request => requestAddress(request, process.env.VERCEL === '1'),
    logger: event => console.error(JSON.stringify(event)),
  })(req, res);
}

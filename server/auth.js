import { createPublicKey } from 'node:crypto';
import { verifyToken } from '@clerk/backend';

const invalidTokenReasons = new Set([
  'token-expired', 'token-invalid', 'token-invalid-algorithm',
  'token-invalid-authorized-parties', 'token-invalid-issuer',
  'token-invalid-signature', 'token-not-active-yet',
  'token-iat-in-the-future', 'token-verification-failed',
  'jwk-kid-mismatch',
]);
const unauthenticated = () => ({ status: 'unauthenticated' });
const unavailable = () => ({ status: 'unavailable' });

function hasJwtShape(token) {
  if (token.length > 8192 || !/^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(token)) return false;
  try {
    const [header, payload] = token.split('.').slice(0, 2).map(value => JSON.parse(Buffer.from(value, 'base64url').toString('utf8')));
    return header && !Array.isArray(header) && typeof header === 'object' && header.alg === 'RS256' &&
      payload && !Array.isArray(payload) && typeof payload === 'object';
  } catch { return false; }
}

function configuration(env) {
  const issuer = env.CLERK_ISSUER?.trim();
  const parties = env.CLERK_AUTHORIZED_PARTIES?.split(',').map(value => value.trim());
  const jwtKey = env.CLERK_JWT_KEY?.trim().replace(/\\n/g, '\n');
  const secretKey = env.CLERK_SECRET_KEY?.trim();
  try {
    if (!issuer || new URL(issuer).origin !== issuer || !parties?.length ||
        parties.some(value => !value || new URL(value).origin !== value) ||
        (!jwtKey && !secretKey)) return null;
    if (jwtKey) createPublicKey(jwtKey);
    return { issuer, parties, jwtKey, secretKey };
  } catch {
    return null;
  }
}

// The injectable verifier keeps error handling testable without network access.
export function createRequestIdentityVerifier(verify = verifyToken, env = process.env) {
  return async function verifyRequestIdentity(req) {
    const authorization = req?.headers?.authorization;
    if (typeof authorization !== 'string') return unauthenticated();
    const match = /^Bearer ([^\s]+)$/i.exec(authorization);
    if (!match || !hasJwtShape(match[1])) return unauthenticated();
    const config = configuration(env);
    if (!config) return unavailable();
    try {
      const claims = await verify(match[1], {
        issuer: config.issuer, authorizedParties: config.parties,
        ...(config.jwtKey ? { jwtKey: config.jwtKey } : { secretKey: config.secretKey }),
      });
      if (!claims || claims.iss !== config.issuer ||
          typeof claims.azp !== 'string' || !config.parties.includes(claims.azp) ||
          typeof claims.sid !== 'string' || !claims.sid.trim() ||
          typeof claims.sub !== 'string' || !claims.sub.trim() ||
          typeof claims.exp !== 'number' || !Number.isFinite(claims.exp) ||
          claims.exp <= Date.now() / 1000 || claims.sts === 'pending') return unauthenticated();
      return { status: 'authenticated', userId: claims.sub, displayName: 'Player' };
    } catch (error) {
      return invalidTokenReasons.has(error?.reason) ? unauthenticated() : unavailable();
    }
  };
}

export const verifyRequestIdentity = createRequestIdentityVerifier();

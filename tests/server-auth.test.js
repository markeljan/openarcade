import test from 'node:test';
import assert from 'node:assert/strict';
import { generateKeyPairSync, sign } from 'node:crypto';
import { createRequestIdentityVerifier } from '../server/auth.js';

const { privateKey, publicKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });
const otherKey = generateKeyPairSync('rsa', { modulusLength: 2048 }).privateKey;
const env = { CLERK_ISSUER: 'https://clerk.example.com', CLERK_AUTHORIZED_PARTIES: 'https://game.example.com, http://localhost:5173', CLERK_JWT_KEY: publicKey.export({ type: 'spki', format: 'pem' }) };
const defaultClaims = () => ({ iss: env.CLERK_ISSUER, azp: 'https://game.example.com', sid: 'sess_123', sub: 'user_123', exp: Math.floor(Date.now() / 1000) + 60, iat: Math.floor(Date.now() / 1000) - 1 });
function token(claims = {}, key = privateKey) {
  const encode = value => Buffer.from(JSON.stringify(value)).toString('base64url');
  const body = `${encode({ alg: 'RS256', typ: 'JWT' })}.${encode({ ...defaultClaims(), ...claims })}`;
  return `${body}.${sign('RSA-SHA256', Buffer.from(body), key).toString('base64url')}`;
}
const request = value => ({ headers: { authorization: `Bearer ${value}`, 'x-arcade-visitor': 'forged', 'x-user-id': 'forged' }, body: { userId: 'forged' } });
const verify = createRequestIdentityVerifier(undefined, env);
const no = { status: 'unauthenticated' };

test('verifies an RSA-signed session and returns only server-derived identity', async () => {
  assert.deepEqual(await verify(request(token({ email: 'private@example.com', name: 'Forged' }))), { status: 'authenticated', userId: 'user_123', displayName: 'Player' });
});

test('rejects forged signatures, malformed tokens and missing bearer credentials', async () => {
  for (const req of [request(token({}, otherKey)), request('nonsense'), { headers: { cookie: `__session=${token()}`, 'x-user-id': 'user_123' } }, { headers: { authorization: `Basic ${token()}` } }, { headers: { authorization: ['Bearer x'] } }]) {
    assert.deepEqual(await verify(req), no);
  }
});

test('requires valid issuer, authorized party, session, subject, expiry and session status', async () => {
  for (const claims of [{ iss: 'https://other.example.com' }, { azp: 'https://other.example.com' }, { azp: undefined }, { sid: '' }, { sid: undefined }, { sub: '' }, { sub: undefined }, { exp: undefined }, { exp: Math.floor(Date.now() / 1000) - 1 }, { sts: 'pending' }]) {
    assert.deepEqual(await verify(request(token(claims))), no, JSON.stringify(claims));
  }
});

test('fails closed for missing or invalid configuration and unexpected verifier errors', async () => {
  for (const overrides of [{ CLERK_ISSUER: '' }, { CLERK_AUTHORIZED_PARTIES: '' }, { CLERK_AUTHORIZED_PARTIES: 'https://game.example.com/path' }, { CLERK_JWT_KEY: 'invalid' }, { CLERK_JWT_KEY: '', CLERK_SECRET_KEY: '' }]) {
    assert.deepEqual(await createRequestIdentityVerifier(undefined, { ...env, ...overrides })(request(token())), { status: 'unavailable' });
  }
  const broken = createRequestIdentityVerifier(async () => { throw new Error('network failure'); }, env);
  assert.deepEqual(await broken(request(token())), { status: 'unavailable' });
  const invalid = createRequestIdentityVerifier(async () => { throw Object.assign(new Error('bad token'), { reason: 'token-invalid-signature' }); }, env);
  assert.deepEqual(await invalid(request(token())), no);
  const unknownKey = createRequestIdentityVerifier(async () => { throw Object.assign(new Error('unrecognized signing key'), { reason: 'jwk-kid-mismatch' }); }, env);
  assert.deepEqual(await unknownKey(request(token())), no);
});

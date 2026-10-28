# Server identity contract

`verifyRequestIdentity(req)` in `server/auth.js` verifies a Clerk session token from the `Authorization: Bearer <token>` header. It returns `{ status: 'authenticated', userId, displayName: 'Player' }`, `{ status: 'unauthenticated' }` for missing or invalid credentials, or `{ status: 'unavailable' }` for missing configuration or an unexpected verification failure. Callers should handle unavailable separately from a signed-out user. The helper does not read identity from the body, visitor ID, cookies, or custom headers, and does not return or log tokens, email addresses, or other claims.

Configure `CLERK_ISSUER` as the exact Clerk frontend API origin and `CLERK_AUTHORIZED_PARTIES` as a comma-separated list of exact application origins. Set a server-only `CLERK_JWT_KEY` to the Clerk PEM public key, or `CLERK_SECRET_KEY` to use Clerk's remote JWKS lookup. The public key takes precedence if both are present. Store these in the server environment; never expose the secret key to the browser or commit credentials. Clerk's [verifyToken reference](https://clerk.com/docs/reference/backend/verify-token) describes key provisioning and remote verification.

The SDK verifies the signature and standard claims. The helper additionally requires the exact issuer, a present allowed `azp`, nonempty `sid` and `sub`, an unexpired `exp` with no grace period, and rejects a pending `sts`. Clerk documents these in its [session token claims](https://clerk.com/docs/guides/sessions/session-tokens). Tokens with an omitted `azp` are rejected even though Clerk can omit it when the originating request has no Origin. A verified token is short-lived evidence, not a live session revocation check.

Run `node --test tests/server-auth.test.js` for local verification with generated RSA keys; a configured deployment still needs an end-to-end check using its own Clerk instance and origins.

A token whose signing key is absent from a successfully retrieved key set (`jwk-kid-mismatch`) is unauthenticated. A failing key fetch is unavailable. Incorrect deployment keys can therefore appear as rejected credentials and must be checked during preview verification.

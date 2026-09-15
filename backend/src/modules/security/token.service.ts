// Signs, decodes, and verifies access tokens, including the server-side revocation check.
import jwt from 'jsonwebtoken';
import { randomUUID } from 'node:crypto';
import { isTokenRevoked, revokeToken } from './revoked-token.repository.js';
import { recordIssuedToken, listActiveTokensForUser } from './active-token.repository.js';
import { env } from '../../config/env.js';
import type { RevokeReason } from './revoked-token.types.js';
import type { Role, UserDocument } from '../users/user.types.js';
import type { Types } from 'mongoose';
import type { AccessTokenPayload, AuthSession, DecodedToken, SignedToken } from './token.types.js';

/**
 * The claims signed into an access token: who the user is and what role they
 * hold. The server trusts this role for authorization on every request (see
 * `docs/api_design.md` §2.1) — nothing here should ever be sourced from
 * client-controlled input at verification time.
 */

/**
 * The result of signing a new token — everything the caller needs both to
 * send the token to the client and, later, to revoke this exact session.
 */

/**
 * An access token's claims after its signature and expiry have already been
 * verified. `jti` and `expiresAt` are what logout uses to write the
 * `REVOKED_TOKEN` row.
 */

/**
 * A live login session: the signed token plus everything logout needs to
 * revoke it later, and the full user document for building a response DTO.
 */

/**
 * Signs a new JWT access token for a user, with a fresh, unique `jti`.
 *
 * @param payload - The user ID and role to embed in the token.
 * @returns The signed token, its `jti` (for later revocation), and its expiry
 *   as a `Date` — converted from the JWT's numeric `exp` claim, which is
 *   seconds since the epoch.
 */
function signAccessToken(payload: AccessTokenPayload): SignedToken {
  const jti = randomUUID();
  const token = jwt.sign({ userId: payload.userId, role: payload.role }, env.jwtSecret, {
    expiresIn: env.jwtExpiresIn as any,
    jwtid: jti,
  });

  // `exp` is seconds since the epoch; REVOKED_TOKEN.expiresAt is a Date.
  const { exp } = jwt.decode(token) as { exp: number };

  return { token, jti, expiresAt: new Date(exp * 1000) };
}

/**
 * Verifies a token's signature and expiry, and returns its claims. Does not
 * check the revocation list — see `verifyAccessToken` below for the function
 * that layers that check on top of this one.
 *
 * @param token - The raw JWT presented by the client.
 * @returns The decoded claims, including `jti` and `expiresAt`.
 * @throws {Error} with `statusCode = 401` if the signature is invalid, the
 *   token is malformed, or it has expired — deliberately the same message and
 *   status for all three, so a caller can't use the distinction to probe the system.
 */
function decodeAccessToken(token: string): DecodedToken {
  try {
    const payload = jwt.verify(token, env.jwtSecret, { algorithms: ['HS256'] }) as {
      userId: string;
      role: Role;
      jti: string;
      exp: number;
    };

    return {
      userId: payload.userId,
      role: payload.role,
      jti: payload.jti,
      expiresAt: new Date(payload.exp * 1000),
    };
  } catch {
    // Bad signature, malformed token, and expiry are all the same to a caller.
    const error: Error = new Error('Your session is invalid or has expired.');
    error.statusCode = 401;
    throw error;
  }
}

/**
 * Verifies an access token is well-formed, unexpired, and not revoked. This
 * is the check every protected route runs through — `requireAuth` in
 * `middleware/auth.middleware.ts` calls this via `securityInterface`.
 *
 * @param token - The raw JWT from the request's `Authorization` header.
 * @returns The token's decoded claims.
 * @throws {Error} with `statusCode = 401` — from `decodeAccessToken` if the
 *   token itself is invalid or expired, or from here if it's well-formed but
 *   has been revoked (e.g. the user already logged out with it).
 */
async function verifyAccessToken(token: string): Promise<DecodedToken> {
  // Signature and expiry first: a garbage token should never reach the database.
  const decoded = decodeAccessToken(token);

  if (await isTokenRevoked(decoded.jti)) {
    const error: Error = new Error('Your session is no longer valid. Please log in again.');
    error.statusCode = 401;
    throw error;
  }

  return decoded;
}

/**
 * Issues a new session for a user who has just registered or logged in
 * successfully. Signs a token, records its `jti` as live (so a future
 * revoke-all-sessions action has something to enumerate), and bundles it with
 * the user document.
 *
 * @param user - The user to issue a session for.
 * @returns The new session, including the raw access token to return to the client.
 */
async function issueSession(user: UserDocument): Promise<AuthSession> {
  const signed = signAccessToken({ userId: String(user._id), role: user.role });

  await recordIssuedToken({
    jti: signed.jti,
    userId: String(user._id),
    expiresAt: signed.expiresAt,
  });

  return {
    accessToken: signed.token,
    jti: signed.jti,
    expiresAt: signed.expiresAt,
    user,
  };
}

/**
 * Revokes every token currently live for a user — the primitive a
 * revoke-all-sessions action (e.g. Admin deactivation) composes from. Looks
 * up the user's live `jti`s and revokes each one with the given reason;
 * revoking a token that has already expired or been revoked is a no-op
 * (`revokeToken` is idempotent), so this is safe to retry.
 *
 * @param userId - The user whose sessions to revoke.
 * @param reason - Why these tokens are being revoked, written onto each
 *   resulting `REVOKED_TOKEN` row.
 * @throws Any error from revoking an individual token, e.g. a database
 *   failure — the caller decides whether to retry.
 */
async function revokeAllTokensForUser(
  userId: string | Types.ObjectId,
  reason: RevokeReason
): Promise<void> {
  const liveTokens = await listActiveTokensForUser(userId);

  await Promise.all(
    liveTokens.map((token) =>
      revokeToken({ jti: token.jti, userId, expiresAt: token.expiresAt, reason })
    )
  );
}

export { signAccessToken, decodeAccessToken, verifyAccessToken, issueSession, revokeAllTokensForUser };
export type { AccessTokenPayload, SignedToken, DecodedToken, AuthSession } from './token.types.js';

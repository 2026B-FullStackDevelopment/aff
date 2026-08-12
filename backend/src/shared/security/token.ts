// Signs and decodes access tokens so only this file knows the JWT payload shape.
import jwt from 'jsonwebtoken';
import { randomUUID } from 'node:crypto';
import { env } from '../../config/env.js';
import type { Role } from '../../modules/users/user.model.js';

/**
 * The claims signed into an access token: who the user is and what role they
 * hold. The server trusts this role for authorization on every request (see
 * `docs/api_design.md` §2.1) — nothing here should ever be sourced from
 * client-controlled input at verification time.
 */
interface AccessTokenPayload {
  userId: string;
  role: Role;
}

/**
 * The result of signing a new token — everything the caller needs both to
 * send the token to the client and, later, to revoke this exact session.
 */
interface SignedToken {
  token: string;
  jti: string;
  expiresAt: Date;
}

/**
 * An access token's claims after its signature and expiry have already been
 * verified. `jti` and `expiresAt` are what logout uses to write the
 * `REVOKED_TOKEN` row.
 */
interface DecodedToken extends AccessTokenPayload {
  jti: string;
  expiresAt: Date;
}

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
 * check the revocation list — see `auth.token.service.ts#verifyAccessToken`
 * for the function that layers that check on top of this one.
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

export { signAccessToken, decodeAccessToken };
export type { AccessTokenPayload, SignedToken, DecodedToken };

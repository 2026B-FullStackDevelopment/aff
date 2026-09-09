// Issues and verifies auth sessions, including the server-side revocation check.
import { signAccessToken, decodeAccessToken } from '../../shared/security/token.js';
import { isTokenRevoked } from './revoked-token.repository.js';
import type { DecodedToken } from '../../shared/security/token.js';
import type { UserDocument } from '../users/user.model.js';

/**
 * A live login session: the signed token plus everything logout needs to
 * revoke it later, and the full user document for building a response DTO.
 */
interface AuthSession {
  accessToken: string;
  jti: string;
  expiresAt: Date;
  user: UserDocument;
}

/**
 * Issues a new session for a user who has just registered or logged in
 * successfully. The active-session row lets an Admin later revoke all live
 * sessions for a deactivated account.
 *
 * @param user - The user to issue a session for.
 * @returns The new session, including the raw access token to return to the client.
 */
function issueSession(user: UserDocument): AuthSession {
  const signed = signAccessToken({ userId: String(user._id), role: user.role });

  return {
    accessToken: signed.token,
    jti: signed.jti,
    expiresAt: signed.expiresAt,
    user,
  };
}

/**
 * Verifies an access token is well-formed, unexpired, and not revoked. This
 * is the check every protected route runs through — `requireAuth` in
 * `middleware/auth.middleware.ts` calls this via `authInterface`.
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

export { issueSession, verifyAccessToken };
export type { AuthSession };

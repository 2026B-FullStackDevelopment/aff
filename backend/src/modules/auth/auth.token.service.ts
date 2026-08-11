// Issues and verifies auth sessions, including the server-side revocation check.
import { signAccessToken, decodeAccessToken } from '../../shared/security/token.js';
import { isTokenRevoked } from './revoked-token.repository.js';
import type { DecodedToken } from '../../shared/security/token.js';
import type { UserDocument } from '../users/user.model.js';

interface AuthSession {
  accessToken: string;
  jti: string;
  expiresAt: Date;
  user: UserDocument;
}

function issueSession(user: UserDocument): AuthSession {
  const signed = signAccessToken({ userId: String(user._id), role: user.role });

  return {
    accessToken: signed.token,
    jti: signed.jti,
    expiresAt: signed.expiresAt,
    user,
  };
}

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

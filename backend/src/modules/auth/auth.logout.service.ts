// Contains the logout business rules, revoking the presented token server-side.
import { securityInterface } from '../security/security.interface.js';

/** Everything needed to revoke the token that was presented on this request. */
interface LogoutInput {
  userId: string;
  jti: string;
  expiresAt: Date;
}

/**
 * Logs a user out by revoking their current token server-side. Story #50 —
 * the point is that this is a server-side write, not just a client-side
 * delete, so a leaked token stops working immediately even if the browser it
 * leaked from is never touched again.
 *
 * @param input - The token to revoke, from `req.auth` (set by `requireAuth`).
 * @throws Any database error other than a duplicate revoke, which propagates
 *   so the client is never told the token is dead when the write actually failed.
 */
async function logout(input: LogoutInput): Promise<void> {
  // Revocation is a server-side write, not a client-side delete (issue #50).
  // Any failure propagates so the client is never told the token is dead when
  // it is not. The repository already treats a duplicate jti as success.
  await securityInterface.revokeToken({
    jti: input.jti,
    userId: input.userId,
    expiresAt: input.expiresAt,
    reason: 'LOGOUT',
  });
}

export { logout };
export type { LogoutInput };

// Contains the logout business rules, revoking the presented token server-side.
import { revokeToken } from './revoked-token.repository.js';
import {
  deleteActiveSessionsByUserId,
  findActiveSessionsByUserId,
} from './active-session.repository.js';
import type { RevokeReason } from './revoked-token.model.js';

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
  await revokeToken({
    jti: input.jti,
    userId: input.userId,
    expiresAt: input.expiresAt,
    reason: 'LOGOUT',
  });
}

/**
 * Revokes the presented token because its owner just changed their password
 * (`PATCH /users/me/password`) — same mechanism as `logout`, different reason,
 * so a stolen-but-live session dies the moment the credential it relies on changes.
 *
 * @param input - The token to revoke, from the password-change request's `req.auth`.
 */
async function revokeForPasswordChange(input: LogoutInput): Promise<void> {
  await revokeToken({
    jti: input.jti,
    userId: input.userId,
    expiresAt: input.expiresAt,
    reason: 'PASSWORD_CHANGE',
  });
}

/** Revokes every currently tracked token owned by one user. */
async function revokeAllUserSessions(
  userId: string,
  reason: RevokeReason = 'ADMIN_DEACTIVATE',
): Promise<void> {
  const sessions = await findActiveSessionsByUserId(userId);

  await Promise.all(
    sessions.map((session) =>
      revokeToken({
        jti: session.jti,
        userId,
        expiresAt: session.expiresAt,
        reason,
      }),
    ),
  );

  await deleteActiveSessionsByUserId(userId);
}

export { logout, revokeForPasswordChange, revokeAllUserSessions };
export type { LogoutInput };

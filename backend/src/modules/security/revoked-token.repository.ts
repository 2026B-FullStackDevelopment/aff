// Contains revoked-token database queries so services do not call Mongoose directly.
import RevokedToken, { type RevokeReason } from './revoked-token.model.js';
import { removeActiveToken } from './active-token.repository.js';
import type { Types } from 'mongoose';

/** Input for revoking one token. `reason` defaults to `'LOGOUT'` if omitted. */
interface RevokeTokenInput {
  jti: string;
  userId: string | Types.ObjectId;
  expiresAt: Date;
  reason?: RevokeReason;
}

/**
 * Revokes a token by inserting its `jti` into the denylist and dropping it
 * from the live-session table. Idempotent: calling this twice for the same
 * `jti` (e.g. a double-submitted logout) succeeds silently the second time
 * instead of throwing, because the caller's goal — "this token must not work
 * anymore" — is already satisfied.
 *
 * @param data - The token to revoke, who it belonged to, and its own expiry
 *   (copied onto the row so the TTL index can purge it later).
 * @throws Any database error other than a duplicate-key conflict on `jti`.
 */
async function revokeToken(data: RevokeTokenInput): Promise<void> {
  try {
    await RevokedToken.create({
      jti: data.jti,
      userId: data.userId,
      reason: data.reason || 'LOGOUT',
      revokedAt: new Date(),
      expiresAt: data.expiresAt,
    });
  } catch (error) {
    // 11000 is Mongo's duplicate-key code. The jti is already revoked, which is
    // the outcome the caller wanted, so logging out twice is not an error.
    if (error?.code !== 11000) {
      throw error;
    }
  }

  // Runs on the duplicate-key path too: the row may not have been cleared by
  // whichever revoke reached RevokedToken.create first, and deleting an
  // already-gone row is a no-op.
  await removeActiveToken(data.jti);
}

/**
 * Checks whether a token has been revoked.
 *
 * @param jti - The token's unique ID, from its decoded claims.
 * @returns `true` if the token is on the denylist.
 */
async function isTokenRevoked(jti: string): Promise<boolean> {
  const found = await RevokedToken.exists({ jti });

  return Boolean(found);
}

export { revokeToken, isTokenRevoked };
export type { RevokeTokenInput };

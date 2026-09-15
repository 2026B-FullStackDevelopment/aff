// Contains active-token database queries so services do not call Mongoose directly.
import ActiveToken from './active-token.model.js';
import type { ActiveTokenAttrs } from './active-token.types.js';
import type { Types } from 'mongoose';
import type { RecordIssuedTokenInput } from './active-token.types.js';

/**
 * Records a freshly issued token as live. Idempotent: a duplicate `jti`
 * (practically impossible given `randomUUID`, but mirrored here for
 * consistency with `revoked-token.repository.ts#revokeToken`) succeeds
 * silently rather than throwing.
 *
 * @param data - The token to record, who it belongs to, and its own expiry
 *   (copied onto the row so the TTL index can purge it once it would have
 *   expired anyway).
 * @throws Any database error other than a duplicate-key conflict on `jti`.
 */
async function recordIssuedToken(data: RecordIssuedTokenInput): Promise<void> {
  try {
    await ActiveToken.create({
      jti: data.jti,
      userId: data.userId,
      issuedAt: new Date(),
      expiresAt: data.expiresAt,
    });
  } catch (error) {
    // 11000 is Mongo's duplicate-key code; the token is already recorded.
    if (error?.code !== 11000) {
      throw error;
    }
  }
}

/**
 * Removes a token's live-session row, e.g. because it was just revoked.
 * Deleting a `jti` that has no row (already removed, or never recorded) is a
 * no-op, so callers don't need to check existence first.
 *
 * @param jti - The token's unique ID.
 */
async function removeActiveToken(jti: string): Promise<void> {
  await ActiveToken.deleteOne({ jti });
}

/**
 * Lists every token currently live for a user.
 *
 * @param userId - The user whose live sessions to look up.
 * @returns The user's live tokens (`jti` and `expiresAt` per row).
 */
function listActiveTokensForUser(userId: string | Types.ObjectId): Promise<ActiveTokenAttrs[]> {
  return ActiveToken.find({ userId }).lean<ActiveTokenAttrs[]>();
}

export { recordIssuedToken, removeActiveToken, listActiveTokensForUser };
export type { RecordIssuedTokenInput } from './active-token.types.js';

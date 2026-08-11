// Contains revoked-token database queries so services do not call Mongoose directly.
import RevokedToken, { type RevokeReason } from './revoked-token.model.js';
import type { Types } from 'mongoose';

interface RevokeTokenInput {
  jti: string;
  userId: string | Types.ObjectId;
  expiresAt: Date;
  reason?: RevokeReason;
}

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
}

async function isTokenRevoked(jti: string): Promise<boolean> {
  const found = await RevokedToken.exists({ jti });

  return Boolean(found);
}

export { revokeToken, isTokenRevoked };
export type { RevokeTokenInput };

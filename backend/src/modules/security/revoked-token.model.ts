// Defines the MongoDB shape for revoked JWTs (docs/database_design.md § REVOKED_TOKEN).
import mongoose, { Schema } from 'mongoose';

/** Why a token was revoked before its natural expiry. */
type RevokeReason = 'LOGOUT' | 'ADMIN_DEACTIVATE' | 'PASSWORD_CHANGE';

/**
 * A single revoked JWT, keyed by its `jti`. `expiresAt` mirrors the token's
 * own expiry and drives the collection's TTL index (`expires: 0` below) — Mongo
 * deletes the row automatically once the token would have expired anyway, so
 * this collection never needs manual cleanup.
 */
interface RevokedTokenAttrs {
  jti: string;
  userId: mongoose.Types.ObjectId;
  reason: RevokeReason;
  revokedAt: Date;
  expiresAt: Date;
}

interface RevokedTokenDocument extends RevokedTokenAttrs, mongoose.Document {}

const revokedTokenSchema = new Schema<RevokedTokenDocument>({
  jti: { type: String, required: true, unique: true },
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  reason: { type: String, enum: ['LOGOUT', 'ADMIN_DEACTIVATE', 'PASSWORD_CHANGE'], required: true },
  revokedAt: { type: Date, default: Date.now },
  expiresAt: { type: Date, required: true, expires: 0 },
});

export default mongoose.model<RevokedTokenDocument>('RevokedToken', revokedTokenSchema);
export type { RevokeReason, RevokedTokenDocument };

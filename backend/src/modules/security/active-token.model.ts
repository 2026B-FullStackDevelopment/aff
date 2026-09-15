// Defines the MongoDB shape for currently-live JWTs (docs/database_design.md § ACTIVE_TOKEN).
import mongoose, { Schema } from 'mongoose';

/**
 * A single live JWT, keyed by its `jti`. `expiresAt` mirrors the token's own
 * expiry and drives the collection's TTL index (`expires: 0` below), and the
 * row is deleted early whenever the token is revoked (see
 * `revoked-token.repository.ts#revokeToken`) — so a row's presence always
 * means "this token is still usable."
 */
interface ActiveTokenAttrs {
  jti: string;
  userId: mongoose.Types.ObjectId;
  issuedAt: Date;
  expiresAt: Date;
}

interface ActiveTokenDocument extends ActiveTokenAttrs, mongoose.Document {}

const activeTokenSchema = new Schema<ActiveTokenDocument>({
  jti: { type: String, required: true, unique: true },
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  issuedAt: { type: Date, default: Date.now },
  expiresAt: { type: Date, required: true, expires: 0 },
});

// Supports listing a user's live sessions (e.g. to revoke them all on deactivation).
activeTokenSchema.index({ userId: 1 });

export default mongoose.model<ActiveTokenDocument>('ActiveToken', activeTokenSchema);
export type { ActiveTokenAttrs, ActiveTokenDocument };

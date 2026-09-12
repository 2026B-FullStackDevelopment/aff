// Tracks live JWTs so an Admin can revoke every session owned by one account.
import mongoose, { Schema } from 'mongoose';

interface ActiveSessionAttrs {
  jti: string;
  userId: mongoose.Types.ObjectId;
  expiresAt: Date;
  createdAt: Date;
}

interface ActiveSessionDocument extends ActiveSessionAttrs, mongoose.Document {}

const activeSessionSchema = new Schema<ActiveSessionDocument>({
  jti: { type: String, required: true, unique: true },
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  expiresAt: { type: Date, required: true, expires: 0 },
  createdAt: { type: Date, default: Date.now },
});

export default mongoose.model<ActiveSessionDocument>('ActiveSession', activeSessionSchema);
export type { ActiveSessionDocument };

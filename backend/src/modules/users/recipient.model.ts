// Defines the MongoDB shape for Recipient profiles (docs/database_design.md § RECIPIENT).
import mongoose, { Schema } from 'mongoose';

type Tier = 'STANDARD' | 'PREMIUM';

interface RecipientAttrs {
  userId: mongoose.Types.ObjectId;
  tier: Tier;
  stripeCustomerId: string | null;
}

interface RecipientDocument extends RecipientAttrs, mongoose.Document {}

const recipientSchema = new Schema<RecipientDocument>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  tier: { type: String, enum: ['STANDARD', 'PREMIUM'], default: 'STANDARD' },
  stripeCustomerId: { type: String, default: null },
});

export default mongoose.model<RecipientDocument>('Recipient', recipientSchema);
export type { Tier, RecipientDocument };

// Defines the MongoDB shape for a Recipient's premium subscription billing cycle (docs/database_design.md § SUBSCRIPTION).
import mongoose, { Schema } from 'mongoose';

type SubscriptionStatus = 'ACTIVE' | 'PAST_DUE' | 'CANCELLED';

interface SubscriptionAttrs {
  recipientId: mongoose.Types.ObjectId;
  stripeSubscriptionId: string;
  status: SubscriptionStatus;
  currentPeriodEnd: Date;
  createdAt: Date;
}

interface SubscriptionDocument extends SubscriptionAttrs, mongoose.Document {}

const subscriptionSchema = new Schema<SubscriptionDocument>(
  {
    recipientId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    stripeSubscriptionId: { type: String, required: true },
    status: { type: String, enum: ['ACTIVE', 'PAST_DUE', 'CANCELLED'], default: 'ACTIVE' },
    currentPeriodEnd: { type: Date, required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

export default mongoose.model<SubscriptionDocument>('Subscription', subscriptionSchema);
export type { SubscriptionStatus, SubscriptionDocument };

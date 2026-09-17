// Defines the MongoDB shape for a Recipient's premium subscription billing cycle (docs/database_design.md § SUBSCRIPTION).
// Append-only ledger: one row per billing cycle, except `status`/`cancelAtPeriodEnd` which mutate in place on the latest row.
import mongoose, { Schema } from 'mongoose';
import type { SubscriptionDocument } from './subscription.types.js';

const subscriptionSchema = new Schema<SubscriptionDocument>(
  {
    recipientId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    stripeSubscriptionId: { type: String, required: true },
    status: { type: String, enum: ['ACTIVE', 'PAST_DUE', 'CANCELLED'], default: 'ACTIVE' },
    currentPeriodEnd: { type: Date, required: true },
    cancelAtPeriodEnd: { type: Boolean, default: false },
    stripeInvoiceId: { type: String, index: { unique: true, sparse: true } },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

export default mongoose.model<SubscriptionDocument>('Subscription', subscriptionSchema);
export type { SubscriptionStatus, SubscriptionDocument } from './subscription.types.js';

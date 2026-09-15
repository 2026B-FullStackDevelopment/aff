// Defines the MongoDB shape for a Recipient's premium subscription billing cycle (docs/database_design.md § SUBSCRIPTION).
// The ledger is append-only: one row per billing cycle, never mutated once written — except
// `status` and `cancelAtPeriodEnd`, which the Stripe webhook and the cancel/resume handler update
// in place on the latest row (F1/F5, backend/SUBSCRIPTION.md).
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

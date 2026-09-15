import mongoose, { Schema } from 'mongoose';
import type { PaymentDocument } from './payment.types.js';

const paymentSchema = new Schema<PaymentDocument>(
  {
    payableType: { type: String, enum: ['ORDER', 'SUBSCRIPTIONS'], required: true },
    payableId: { type: Schema.Types.ObjectId, required: true },
    stripeSessionId: { type: String, required: true },
    stripeInvoiceId: { type: String },
    stripePaymentIntentId: { type: String },
    stripeRefundId: { type: String },
    amount: { type: Number, required: true },
    currency: { type: String, required: true },
    status: {
      type: String,
      enum: ['PENDING', 'PAID', 'FAILED', 'EXPIRED', 'CANCELLED', 'REFUND_PENDING', 'REFUNDED'],
      default: 'PENDING',
    },
    paidAt: { type: Date },
    refundedAt: { type: Date },
    lastProcessedEventId: { type: String },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

export default mongoose.model<PaymentDocument>('Payment', paymentSchema);
export type { PayableType, TransactionStatus, PaymentDocument } from './payment.types.js';

import mongoose, { Schema } from 'mongoose';

type PayableType = 'ORDER' | 'SUBSCRIPTIONS';
type TransactionStatus = 'PENDING' | 'PAID' | 'FAILED' | 'EXPIRED' | 'CANCELLED' | 'REFUND_PENDING' | 'REFUNDED';

interface PaymentAttrs {
  payableType: PayableType;
  payableId: mongoose.Types.ObjectId;
  stripeSessionId: string;
  stripeInvoiceId?: string;
  stripePaymentIntentId?: string;
  stripeRefundId?: string;
  amount: number;
  currency: string;
  status: TransactionStatus;
  paidAt?: Date;
  refundedAt?: Date;
  lastProcessedEventId?: string;
  createdAt: Date;
}

interface PaymentDocument extends PaymentAttrs, mongoose.Document {}

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
export type { PayableType, TransactionStatus, PaymentDocument };

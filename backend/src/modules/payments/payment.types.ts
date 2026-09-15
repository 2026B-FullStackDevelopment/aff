// Defines internal persistence and repository types for payments.
import type mongoose from 'mongoose';
import type { Types } from 'mongoose';

type PayableType = 'ORDER' | 'SUBSCRIPTIONS';
type TransactionStatus = 'PENDING' | 'PAID' | 'FAILED' | 'EXPIRED' | 'CANCELLED' | 'REFUND_PENDING' | 'REFUNDED';
interface PaymentAttrs {
  payableType: PayableType; payableId: mongoose.Types.ObjectId; stripeSessionId: string;
  stripeInvoiceId?: string; stripePaymentIntentId?: string; stripeRefundId?: string;
  amount: number; currency: string; status: TransactionStatus; paidAt?: Date;
  refundedAt?: Date; lastProcessedEventId?: string; createdAt: Date;
}
interface PaymentDocument extends PaymentAttrs, mongoose.Document {}
interface CreatePaymentInput {
  payableType: PayableType; payableId: string | Types.ObjectId; stripeSessionId: string;
  amount: number; currency: string; status?: TransactionStatus;
}
interface UpdatePaymentEventInput {
  lastProcessedEventId: string; status?: TransactionStatus; paidAt?: Date; refundedAt?: Date;
  stripePaymentIntentId?: string;
}

export type { PayableType, TransactionStatus, PaymentAttrs, PaymentDocument, CreatePaymentInput, UpdatePaymentEventInput };

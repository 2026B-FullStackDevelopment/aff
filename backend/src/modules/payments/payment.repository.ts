// Contains payment database queries so services do not call Mongoose directly.
import Payment, { type PaymentDocument, type PayableType, type TransactionStatus } from './payment.model.js';
import type { Types } from 'mongoose';

interface CreatePaymentInput {
  payableType: PayableType;
  payableId: string | Types.ObjectId;
  stripeSessionId: string;
  amount: number;
  currency: string;
  status?: TransactionStatus;
}

interface UpdatePaymentEventInput {
  lastProcessedEventId: string;
  status?: TransactionStatus;
  paidAt?: Date;
  refundedAt?: Date;
  stripePaymentIntentId?: string;
}

function createPayment(data: CreatePaymentInput) {
  return Payment.create(data);
}

function findPaymentBySessionId(stripeSessionId: string) {
  return Payment.findOne({ stripeSessionId }).lean<PaymentDocument>();
}

function findPaymentByPayable(payableType: PayableType, payableId: string | Types.ObjectId) {
  return Payment.findOne({ payableType, payableId }).lean<PaymentDocument>();
}

function updatePaymentEvent(paymentId: string | Types.ObjectId, data: UpdatePaymentEventInput) {
  return Payment.findByIdAndUpdate(paymentId, data, { new: true }).lean<PaymentDocument>();
}

// Sets REFUND_PENDING synchronously, right after the Stripe refund API call returns — separate
// from updatePaymentEvent since this isn't a webhook event being reconciled, so there's no
// lastProcessedEventId to require here.
function markPaymentRefundPending(paymentId: string | Types.ObjectId, stripeRefundId: string) {
  return Payment.findByIdAndUpdate(
    paymentId,
    { status: 'REFUND_PENDING', stripeRefundId },
    { new: true }
  ).lean<PaymentDocument>();
}

function findPaymentByRefundId(stripeRefundId: string) {
  return Payment.findOne({ stripeRefundId }).lean<PaymentDocument>();
}

export {
  createPayment,
  findPaymentBySessionId,
  findPaymentByPayable,
  findPaymentByRefundId,
  updatePaymentEvent,
  markPaymentRefundPending,
};
export type { CreatePaymentInput, UpdatePaymentEventInput };

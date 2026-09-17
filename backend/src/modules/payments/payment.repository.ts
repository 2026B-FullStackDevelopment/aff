// Contains payment database queries so services do not call Mongoose directly.
import Payment from './payment.model.js';
import type { PayableType, PaymentDocument } from './payment.types.js';
import mongoose, { type ClientSession, type Types} from 'mongoose';
import type { CreatePaymentInput, UpdatePaymentEventInput } from './payment.types.js';

function createPayment(data: CreatePaymentInput) {
  return Payment.create(data);
}

function findPaymentBySessionId(stripeSessionId: string, session?: ClientSession,) {
  const query = Payment.findOne({ stripeSessionId });
  return (session ? query.session(session) : query)
    .lean<PaymentDocument>();
}

function findPaymentByPayable(payableType: PayableType, payableId: string | Types.ObjectId) {
  return Payment.findOne({ payableType, payableId }).lean<PaymentDocument>();
}

function updatePaymentEvent(paymentId: string | Types.ObjectId, data: UpdatePaymentEventInput) {
  return Payment.findByIdAndUpdate(paymentId, data, { new: true }).lean<PaymentDocument>();
}

// Sets REFUND_PENDING synchronously right after the Stripe refund API call returns.
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

/**
 * Cancels a still-PENDING Payment for a payable so a late `checkout.session.completed` webhook
 * safely no-ops. Returns `null` if no PENDING Payment row exists for this payable.
 */
function cancelPendingPaymentByPayable(
  payableType: PayableType,
  payableId: string | Types.ObjectId,
  session?: ClientSession,
) {
  return Payment.findOneAndUpdate(
    { payableType, payableId, status: 'PENDING' },
    { $set: { status: 'CANCELLED' } },
    { new: true, session },
  ).lean<PaymentDocument>();
}

/**
 * Claims a pending Checkout Payment exactly once and stores the Stripe ids
 * needed for webhook deduplication and any later refund.
 */
function markPaymentPaidIfPending(
  stripeSessionId: string,
  eventId: string,
  paidAt: Date,
  session?: ClientSession,
  stripePaymentIntentId?: string,
) {
  return Payment.findOneAndUpdate(
    {
      stripeSessionId,
      status: 'PENDING',
    },
    {
      $set: {
        status: 'PAID',
        paidAt,
        lastProcessedEventId: eventId,
        ...(stripePaymentIntentId && { stripePaymentIntentId }),
      },
    },
    { new: true, session },
  ).lean<PaymentDocument>();
}

// Runs related Payment-domain writes in one MongoDB transaction.
async function withTransaction<T>(
  operation: (session: ClientSession) => Promise<T>,
): Promise<T> {
  const session = await mongoose.startSession();
  try {
    let result!: T;
    await session.withTransaction(async () => {
      result = await operation(session);
    });
    return result;
  } finally {
    await session.endSession();
  }
}

export {
  createPayment,
  findPaymentBySessionId,
  findPaymentByPayable,
  findPaymentByRefundId,
  updatePaymentEvent,
  markPaymentPaidIfPending,
  markPaymentRefundPending,
  cancelPendingPaymentByPayable,
  withTransaction,
};
export type { CreatePaymentInput, UpdatePaymentEventInput } from './payment.types.js';

// Contains payment database queries so services do not call Mongoose directly.
import Payment, { type PaymentDocument, type PayableType, type TransactionStatus } from './payment.model.js';
import mongoose, { type ClientSession, type Types} from 'mongoose';

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

function markPaymentPaidIfPending(
  stripeSessionId: string,
  eventId: string,
  paidAt: Date,
  session?: ClientSession,
) {
  return Payment.findOneAndUpdate(
    {
      stripeSessionId, // find using stripeSessionId
      status: 'PENDING',
    }, 
    {
      $set: {
      status: 'PAID',
      paidAt,
      lastProcessEventId: eventId,
      },
    },
    // Optional findOneAndUpdate object
    // new: true tells Mongoose to return the Payment after it's updated, then service can use it to confirmt payment succeeded
    { new: true, session, }, 
  ).lean<PaymentDocument>();
}

// a transaction group many database changes
// update payment to PAID, order to PAID, create delivery
// <T> typescript syntax, T being returns different types depending on operations
// database session is advanced, above week 9
async function withTransaction<T>(
  // operation is a function, must take a database session, 
  // perform database CRUD, return output type
  // : Promise<T>, promise to return after operation finishes
  operation: (session: ClientSession) => Promise<T>,
): Promise<T> {
  const session = await mongoose.startSession();
  try {
    let result!: T;
    await session.withTransaction(async() => {
      result = await operation(session)
    });
    return result;
  } finally {
    await session.endSession(); // end session
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
  withTransaction,
};
export type { CreatePaymentInput, UpdatePaymentEventInput };

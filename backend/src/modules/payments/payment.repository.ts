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

export { createPayment, findPaymentBySessionId, findPaymentByPayable, updatePaymentEvent };
export type { CreatePaymentInput, UpdatePaymentEventInput };

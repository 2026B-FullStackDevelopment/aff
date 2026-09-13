// Contains subscription database queries so services do not call Mongoose directly.
import Subscription, { type SubscriptionDocument, type SubscriptionStatus } from './subscription.model.js';
import type { Types } from 'mongoose';

interface CreateSubscriptionInput {
  recipientId: string | Types.ObjectId;
  stripeSubscriptionId: string;
  status: SubscriptionStatus;
  currentPeriodEnd: Date;
  cancelAtPeriodEnd?: boolean;
  stripeInvoiceId?: string;
}

interface SetLatestSubscriptionFieldsPatch {
  status?: SubscriptionStatus;
  cancelAtPeriodEnd?: boolean;
}

function createSubscription(data: CreateSubscriptionInput) {
  return Subscription.create(data);
}

function findLatestSubscriptionByRecipientId(recipientId: string | Types.ObjectId) {
  return Subscription.findOne({ recipientId }).sort({ createdAt: -1 }).lean<SubscriptionDocument>();
}

function findSubscriptionByStripeInvoiceId(invoiceId: string) {
  return Subscription.findOne({ stripeInvoiceId: invoiceId }).lean<SubscriptionDocument>();
}

function setLatestSubscriptionFields(recipientId: string | Types.ObjectId, patch: SetLatestSubscriptionFieldsPatch) {
  return Subscription.findOneAndUpdate({ recipientId }, patch, { new: true, sort: { createdAt: -1 } }).lean<SubscriptionDocument>();
}

export {
  createSubscription,
  findLatestSubscriptionByRecipientId,
  findSubscriptionByStripeInvoiceId,
  setLatestSubscriptionFields,
};

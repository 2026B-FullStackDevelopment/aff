// Contains subscription database queries so services do not call Mongoose directly.
import Subscription from './subscription.model.js';
import type { SubscriptionDocument } from './subscription.types.js';
import type { Types } from 'mongoose';
import type { CreateSubscriptionInput, SetLatestSubscriptionFieldsPatch } from './subscription.types.js';

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

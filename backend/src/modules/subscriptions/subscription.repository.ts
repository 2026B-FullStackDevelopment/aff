// Contains subscription database queries so services do not call Mongoose directly.
import Subscription, { type SubscriptionDocument, type SubscriptionStatus } from './subscription.model.js';
import type { Types } from 'mongoose';

interface CreateSubscriptionInput {
  recipientId: string | Types.ObjectId;
  stripeSubscriptionId: string;
  status: SubscriptionStatus;
  currentPeriodEnd: Date;
}

function createSubscription(data: CreateSubscriptionInput) {
  return Subscription.create(data);
}

function findLatestSubscriptionByRecipientId(recipientId: string | Types.ObjectId) {
  return Subscription.findOne({ recipientId }).sort({ createdAt: -1 }).lean<SubscriptionDocument>();
}

export { createSubscription, findLatestSubscriptionByRecipientId };

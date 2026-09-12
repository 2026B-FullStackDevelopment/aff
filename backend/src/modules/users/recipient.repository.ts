// Contains recipient profile database queries so services do not call Mongoose directly.
import Recipient, { type RecipientDocument } from './recipient.model.js';
import type { Types } from 'mongoose';

interface CreateRecipientInput {
  userId: string | Types.ObjectId;
}

function createRecipient(data: CreateRecipientInput) {
  return Recipient.create({ userId: data.userId, tier: 'STANDARD' });
}

function findRecipientByUserId(userId: string | Types.ObjectId) {
  return Recipient.findOne({ userId }).lean<RecipientDocument>();
}

function setStripeCustomerId(userId: string | Types.ObjectId, stripeCustomerId: string) {
  return Recipient.findOneAndUpdate({ userId }, { stripeCustomerId }, { new: true }).lean<RecipientDocument>();
}

function findRecipientByStripeCustomerId(stripeCustomerId: string) {
  return Recipient.findOne({ stripeCustomerId }).lean<RecipientDocument>();
}

export { createRecipient, findRecipientByUserId, setStripeCustomerId, findRecipientByStripeCustomerId };
export type { CreateRecipientInput };

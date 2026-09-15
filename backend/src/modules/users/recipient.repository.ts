// Contains recipient profile database queries so services do not call Mongoose directly.
import Recipient from './recipient.model.js';
import type { RecipientDocument, Tier } from './recipient.types.js';
import type { Types } from 'mongoose';
import type { CreateRecipientInput } from './recipient.types.js';

function createRecipient(data: CreateRecipientInput) {
  return Recipient.create({ userId: data.userId });
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

/**
 * Writes the cached `tier` only when it differs from `tier`. The `$ne` filter means an
 * already-correct row matches nothing, so callers on read paths cost one indexed no-op update
 * rather than a write per request.
 */
function setRecipientTierIfChanged(userId: string | Types.ObjectId, tier: Tier) {
  return Recipient.updateOne({ userId, tier: { $ne: tier } }, { $set: { tier } });
}

export {
  createRecipient,
  findRecipientByUserId,
  setStripeCustomerId,
  findRecipientByStripeCustomerId,
  setRecipientTierIfChanged,
};
export type { CreateRecipientInput } from './recipient.types.js';

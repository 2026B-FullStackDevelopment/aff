// Contains Recipient profile business rules and calls the recipient repository for database work.
import * as recipientRepository from './recipient.repository.js';
import * as userDirectoryRepository from './user.directory.repository.js';
import type { Types } from 'mongoose';
import type { Tier } from './recipient.types.js';

async function createRecipientProfile(userId: string | Types.ObjectId) {
  return recipientRepository.createRecipient({ userId });
}

async function findRecipientByUserId(userId: string | Types.ObjectId) {
  return recipientRepository.findRecipientByUserId(userId);
}

async function searchRecipientsByEmail(email: string) {
  const normalizedEmail = email.trim().toLowerCase();

  // Avoid exposing a broad Recipient directory from a very short query.
  if (normalizedEmail.length < 3) {
    return [];
  }

  return userDirectoryRepository.searchActiveRecipientsByEmail(normalizedEmail, 10);
}

async function setRecipientStripeCustomerId(userId: string | Types.ObjectId, stripeCustomerId: string) {
  return recipientRepository.setStripeCustomerId(userId, stripeCustomerId);
}

async function findRecipientByStripeCustomerId(stripeCustomerId: string) {
  return recipientRepository.findRecipientByStripeCustomerId(stripeCustomerId);
}

/**
 * Updates the Recipient's cached `tier` column. This is a denormalized copy for database
 * inspection only — the authoritative tier is derived per request from the SUBSCRIPTION ledger in
 * `subscription.service.ts`, and no read path should consult this column (F1,
 * `backend/SUBSCRIPTION.md` risk #7 and its DEBUG section).
 */
async function setRecipientTier(userId: string | Types.ObjectId, tier: Tier) {
  return recipientRepository.setRecipientTierIfChanged(userId, tier);
}

export {
  createRecipientProfile,
  findRecipientByUserId,
  searchRecipientsByEmail,
  setRecipientStripeCustomerId,
  findRecipientByStripeCustomerId,
  setRecipientTier,
};

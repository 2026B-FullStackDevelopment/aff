// Contains Stripe customer lookup/creation. Calls other modules only through their .interface.ts,
// and Stripe only through payment.provider.ts.
import * as paymentProvider from '../../integrations/payment/payment.provider.js';
import { userInterface } from '../users/user.interface.js';
import type { Types } from 'mongoose';
import { recipientNotFoundError, stripeApiError } from './payment.service.errors.js';

/**
 * Creates a fresh Stripe Customer for a Recipient and saves it as their stripeCustomerId,
 * overwriting whatever was there before (used both for first-time creation and for replacing a
 * stale id Stripe has rejected).
 * @throws {Error} with statusCode = 502 if Stripe customer creation fails
 */
async function createAndSaveStripeCustomer(userId: string | Types.ObjectId) {
  const user = await userInterface.getUserById(String(userId));

  let customer;
  try {
    customer = await paymentProvider.createStripeCustomer({
      email: user.email,
      metadata: { userId: String(userId) },
    });
  } catch (error) {
    throw stripeApiError(error instanceof Error ? error.message : 'Failed to create Stripe customer.');
  }

  await userInterface.setRecipientStripeCustomerId(userId, customer.customerId);

  return customer.customerId;
}

/**
 * Returns the Recipient's Stripe Customer id, creating one on their first card checkout.
 * @param userId - the Recipient's USER._id
 * @throws {Error} with statusCode = 404 if no Recipient profile exists for userId
 * @throws {Error} with statusCode = 502 if Stripe customer creation fails
 */
async function getOrCreateStripeCustomer(userId: string | Types.ObjectId) {
  const recipient = await userInterface.findRecipientByUserId(userId);

  if (!recipient) {
    throw recipientNotFoundError();
  }

  if (recipient.stripeCustomerId) {
    return recipient.stripeCustomerId;
  }

  return createAndSaveStripeCustomer(userId);
}

export { getOrCreateStripeCustomer, createAndSaveStripeCustomer };

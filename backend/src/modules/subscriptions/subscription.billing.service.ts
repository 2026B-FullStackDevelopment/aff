// Contains the webhook-driven billing-cycle effects. Cross-module calls go through interfaces only.
import { userInterface } from '../users/user.interface.js';
import * as subscriptionRepository from './subscription.repository.js';
import type { AppendBillingCycleInput } from './subscription.types.js';
import { createHttpError } from './subscription.service.errors.js';

/**
 * Appends one billing-cycle row to the SUBSCRIPTION ledger (F1), called from the `invoice.paid`
 * webhook for both the first payment and every renewal; idempotent on `stripeInvoiceId`.
 * @param stripeCustomerId - resolves the Recipient via `userInterface.findRecipientByStripeCustomerId`
 * @returns `{ created: false }` if the invoice was already recorded; otherwise
 *   `{ created: true, recipientEmail, currentPeriodEnd }` so the caller can send the confirmation email
 * @throws {Error} with statusCode = 404 if no Recipient matches `stripeCustomerId`
 */
async function appendBillingCycle({
  stripeCustomerId,
  stripeSubscriptionId,
  stripeInvoiceId,
  currentPeriodEnd,
  cancelAtPeriodEnd,
}: AppendBillingCycleInput) {
  const existing = await subscriptionRepository.findSubscriptionByStripeInvoiceId(stripeInvoiceId);
  if (existing) {
    return { created: false as const };
  }

  const recipient = await userInterface.findRecipientByStripeCustomerId(stripeCustomerId);
  if (!recipient) {
    throw createHttpError(404, 'Recipient not found for Stripe customer.');
  }

  await subscriptionRepository.createSubscription({
    recipientId: recipient.userId,
    stripeSubscriptionId,
    status: 'ACTIVE',
    currentPeriodEnd,
    stripeInvoiceId,
    cancelAtPeriodEnd,
  });

  await userInterface.setRecipientTier(recipient.userId, 'PREMIUM');

  const user = await userInterface.getUserById(String(recipient.userId));

  return { created: true as const, recipientEmail: user.email, currentPeriodEnd };
}

/**
 * Marks the latest SUBSCRIPTION row PAST_DUE, called from the `invoice.payment_failed` webhook.
 * Silently no-ops if no Recipient matches `stripeCustomerId` — a webhook handler has no caller to
 * report a 404 to.
 * @param stripeCustomerId - resolves the Recipient via `userInterface.findRecipientByStripeCustomerId`
 */
async function markLatestPastDue(stripeCustomerId: string): Promise<void> {
  const recipient = await userInterface.findRecipientByStripeCustomerId(stripeCustomerId);
  if (!recipient) return;

  await subscriptionRepository.setLatestSubscriptionFields(recipient.userId, { status: 'PAST_DUE' });
  await userInterface.setRecipientTier(recipient.userId, 'STANDARD');
}

/**
 * Marks the latest SUBSCRIPTION row CANCELLED, called from the `customer.subscription.deleted`
 * webhook — the terminal event a `cancelAtPeriodEnd` cancellation reaches once `currentPeriodEnd`
 * arrives. Silently no-ops if no Recipient matches `stripeCustomerId`.
 * @param stripeCustomerId - resolves the Recipient via `userInterface.findRecipientByStripeCustomerId`
 */
async function markLatestCancelled(stripeCustomerId: string): Promise<void> {
  const recipient = await userInterface.findRecipientByStripeCustomerId(stripeCustomerId);
  if (!recipient) return;

  await subscriptionRepository.setLatestSubscriptionFields(recipient.userId, { status: 'CANCELLED' });
  await userInterface.setRecipientTier(recipient.userId, 'STANDARD');
}

export { appendBillingCycle, markLatestPastDue, markLatestCancelled };

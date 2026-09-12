// Contains premium subscription rules: derives a Recipient's tier from their latest SUBSCRIPTION
// row, starts Stripe subscription checkout, applies cancel/resume, and appends webhook-driven
// billing-cycle effects. Cross-module calls go through interfaces only (see backend/SUBSCRIPTION.md
// risk #4 — import the *.interface.ts, never the *.service.ts, and only call inside functions).
import { env } from '../../config/env.js';
import { paymentInterface } from '../payments/payment.interface.js';
import { userInterface } from '../users/user.interface.js';
import * as subscriptionRepository from './subscription.repository.js';
import { toSubscriptionResponseDto } from './subscription.dto.js';
import type { SubscriptionStatusResponseDto, SubscriptionResponseDto } from './subscription.dto.js';
import type { SubscriptionDocument } from './subscription.model.js';

function createHttpError(statusCode: number, message: string): Error {
  const error: Error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

function isActivePremiumRow(subscription: SubscriptionDocument | null): boolean {
  if (!subscription) return false;
  return subscription.status === 'ACTIVE' && subscription.currentPeriodEnd > new Date();
}

/**
 * True iff `recipientId`'s latest SUBSCRIPTION row is ACTIVE and unexpired. Cheap boolean form of
 * {@link getMySubscriptionStatus}, used by other modules' Premium gates (e.g. notification
 * preferences) that only need a yes/no, not the full DTO.
 * @param recipientId - a Recipient's USER._id
 */
async function isPremiumRecipient(recipientId: string): Promise<boolean> {
  const subscription = await subscriptionRepository.findLatestSubscriptionByRecipientId(recipientId);
  return isActivePremiumRow(subscription);
}

/**
 * Derives `tier` from the latest SUBSCRIPTION row for `GET /subscriptions/me` (and, via
 * `subscriptionInterface`, `GET /users/me`) — `tier` is never a stored column, only ever computed
 * here from `status` + `currentPeriodEnd`.
 * @param recipientId - a Recipient's USER._id
 */
async function getMySubscriptionStatus(recipientId: string): Promise<SubscriptionStatusResponseDto> {
  const subscription = await subscriptionRepository.findLatestSubscriptionByRecipientId(recipientId);

  return {
    tier: isActivePremiumRow(subscription) ? 'PREMIUM' : 'STANDARD',
    subscription: toSubscriptionResponseDto(subscription),
  };
}

/**
 * Starts a Stripe Checkout Session for the $5/month Premium subscription (F1).
 * Creates no SUBSCRIPTION row and sends no email — those happen later, in the webhook, once
 * Stripe confirms `invoice.paid`.
 * @param recipientId - a Recipient's USER._id
 */
async function startCheckout(recipientId: string) {
  const customerId = await paymentInterface.getOrCreateStripeCustomer(recipientId);

  return paymentInterface.startSubscriptionCheckout({
    customerId,
    successUrl: `${env.clientUrl}/subscription?status=success`,
    cancelUrl: `${env.clientUrl}/subscription?status=cancelled`,
    metadata: { userId: String(recipientId) },
  });
}

/**
 * Schedules the caller's own latest subscription to cancel at the end of the current billing
 * period (F5). Never calls Stripe's `subscriptions.cancel()`/`.del()`, so access is not revoked
 * immediately — the tier stays PREMIUM until `currentPeriodEnd`. Idempotent: a no-op `200` if
 * `cancelAtPeriodEnd` is already `true`, with no second Stripe call.
 * @param recipientId - a Recipient's USER._id; always the caller's own, never another user's
 * @throws {Error} with statusCode = 409 if there is no ACTIVE, unexpired subscription to cancel
 */
async function cancelMySubscription(recipientId: string): Promise<SubscriptionResponseDto | null> {
  const subscription = await subscriptionRepository.findLatestSubscriptionByRecipientId(recipientId);

  if (!isActivePremiumRow(subscription)) {
    throw createHttpError(409, 'No active subscription to cancel.');
  }

  if (subscription!.cancelAtPeriodEnd) {
    return toSubscriptionResponseDto(subscription);
  }

  await paymentInterface.setSubscriptionCancelAtPeriodEnd(subscription!.stripeSubscriptionId, true);
  const updated = await subscriptionRepository.setLatestSubscriptionFields(recipientId, { cancelAtPeriodEnd: true });

  return toSubscriptionResponseDto(updated);
}

/**
 * Undoes a pending cancellation on the caller's own latest subscription (F5) — the inverse of
 * {@link cancelMySubscription}. Valid only while `currentPeriodEnd` is still in the future.
 * Idempotent: a no-op `200` if `cancelAtPeriodEnd` is already `false`, with no second Stripe call.
 * @param recipientId - a Recipient's USER._id; always the caller's own, never another user's
 * @throws {Error} with statusCode = 409 if there is no ACTIVE, unexpired subscription to resume
 */
async function resumeMySubscription(recipientId: string): Promise<SubscriptionResponseDto | null> {
  const subscription = await subscriptionRepository.findLatestSubscriptionByRecipientId(recipientId);

  if (!isActivePremiumRow(subscription)) {
    throw createHttpError(409, 'No active subscription to resume.');
  }

  if (!subscription!.cancelAtPeriodEnd) {
    return toSubscriptionResponseDto(subscription);
  }

  await paymentInterface.setSubscriptionCancelAtPeriodEnd(subscription!.stripeSubscriptionId, false);
  const updated = await subscriptionRepository.setLatestSubscriptionFields(recipientId, { cancelAtPeriodEnd: false });

  return toSubscriptionResponseDto(updated);
}

interface AppendBillingCycleInput {
  stripeCustomerId: string;
  stripeSubscriptionId: string;
  stripeInvoiceId: string;
  currentPeriodEnd: Date;
  cancelAtPeriodEnd: boolean;
}

/**
 * Appends one billing-cycle row to the SUBSCRIPTION ledger (F1), called from the `invoice.paid`
 * webhook — which fires identically for both the first payment and every renewal. Idempotent on
 * `stripeInvoiceId` (unique, sparse): a re-delivered event for an invoice already recorded is a
 * no-op, so Stripe's at-least-once delivery never produces a duplicate row or a duplicate email.
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
}

export {
  isPremiumRecipient,
  getMySubscriptionStatus,
  startCheckout,
  cancelMySubscription,
  resumeMySubscription,
  appendBillingCycle,
  markLatestPastDue,
  markLatestCancelled,
};

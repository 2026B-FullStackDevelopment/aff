// Contains the caller-initiated cancel/resume lifecycle paths. Cross-module calls go through
// interfaces only.
import { paymentInterface } from '../payments/payment.interface.js';
import * as subscriptionRepository from './subscription.repository.js';
import { toSubscriptionResponseDto } from './subscription.dto.js';
import type { SubscriptionResponseDto } from './subscription.dto.js';
import { isActivePremiumRow } from './subscription.query.service.js';
import { createHttpError } from './subscription.service.errors.js';

/**
 * Schedules the caller's own latest subscription to cancel at the end of the current billing
 * period (F5); access stays PREMIUM until `currentPeriodEnd`. Idempotent — a no-op if already scheduled.
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
 * Undoes a pending cancellation on the caller's own latest subscription (F5), the inverse of
 * {@link cancelMySubscription}. Idempotent — a no-op if not currently scheduled to cancel.
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

export { cancelMySubscription, resumeMySubscription };

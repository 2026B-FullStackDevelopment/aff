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

async function isPremiumRecipient(recipientId: string): Promise<boolean> {
  const subscription = await subscriptionRepository.findLatestSubscriptionByRecipientId(recipientId);
  return isActivePremiumRow(subscription);
}

async function getMySubscriptionStatus(recipientId: string): Promise<SubscriptionStatusResponseDto> {
  const subscription = await subscriptionRepository.findLatestSubscriptionByRecipientId(recipientId);

  return {
    tier: isActivePremiumRow(subscription) ? 'PREMIUM' : 'STANDARD',
    subscription: toSubscriptionResponseDto(subscription),
  };
}

async function startCheckout(recipientId: string) {
  const customerId = await paymentInterface.getOrCreateStripeCustomer(recipientId);

  return paymentInterface.startSubscriptionCheckout({
    customerId,
    successUrl: `${env.clientUrl}/subscription?status=success`,
    cancelUrl: `${env.clientUrl}/subscription?status=cancelled`,
    metadata: { userId: String(recipientId) },
  });
}

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

async function markLatestPastDue(stripeCustomerId: string): Promise<void> {
  const recipient = await userInterface.findRecipientByStripeCustomerId(stripeCustomerId);
  if (!recipient) return;

  await subscriptionRepository.setLatestSubscriptionFields(recipient.userId, { status: 'PAST_DUE' });
}

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

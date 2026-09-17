// Contains Stripe checkout-session orchestration. Calls other modules only through their
// .interface.ts, and Stripe only through payment.provider.ts.
import * as paymentProvider from '../../integrations/payment/payment.provider.js';
import * as paymentRepository from './payment.repository.js';
import { createAndSaveStripeCustomer } from './payment.customer.service.js';
import type { PayableType } from './payment.types.js';
import type { Types } from 'mongoose';
import { stripeApiError } from './payment.service.errors.js';

/**
 * True when a thrown Stripe SDK error means "the customer id we sent no longer exists on
 * Stripe" (`code: 'resource_missing'`, `param: 'customer'`).
 */
function isStripeMissingCustomerError(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    (error as { code?: unknown }).code === 'resource_missing' &&
    (error as { param?: unknown }).param === 'customer'
  );
}

/**
 * Starts a one-off Stripe Checkout for a single payable, recording a PENDING Payment row so the
 * webhook can later find it by session id.
 * @param payableType - what this payment is for ("ORDER" today; kept generic for future payables)
 * @param payableId - the id of that payable document
 * @param amount - total charge in the currency's smallest unit (e.g. cents)
 * @param currency - ISO currency code (e.g. "usd")
 * @param customerId - the paying Recipient's Stripe Customer id (from getOrCreateStripeCustomer)
 * @param successUrl - where Stripe redirects the browser after a successful payment
 * @param cancelUrl - where Stripe redirects the browser if the customer backs out
 * @param userId - the paying Recipient's USER._id, used to mint a fresh Stripe customer and
 *   retry once if `customerId` turns out stale; omit only when there's no Recipient to self-heal against
 * @throws {Error} with statusCode = 502 if Stripe checkout-session creation fails (including a
 *   failed self-heal retry)
 */
async function startOneTimeCheckout({
  payableType,
  payableId,
  amount,
  currency,
  customerId,
  successUrl,
  cancelUrl,
  userId,
}: {
  payableType: PayableType;
  payableId: string | Types.ObjectId;
  amount: number;
  currency: string;
  customerId: string;
  successUrl: string;
  cancelUrl: string;
  userId?: string | Types.ObjectId;
}) {
  const createSession = (forCustomerId: string) =>
    paymentProvider.createCheckoutSession({
      customerId: forCustomerId,
      amount,
      currency,
      successUrl,
      cancelUrl,
      metadata: { payableType, payableId: String(payableId) },
    });

  let session;
  try {
    session = await createSession(customerId);
  } catch (error) {
    if (!userId || !isStripeMissingCustomerError(error)) {
      throw stripeApiError(error instanceof Error ? error.message : 'Failed to create Stripe checkout session.');
    }

    const freshCustomerId = await createAndSaveStripeCustomer(userId);

    try {
      session = await createSession(freshCustomerId);
    } catch (retryError) {
      throw stripeApiError(
        retryError instanceof Error ? retryError.message : 'Failed to create Stripe checkout session.',
      );
    }
  }

  if (!session.checkoutUrl) {
    throw stripeApiError('Stripe did not return a checkout URL.');
  }

  await paymentRepository.createPayment({
    payableType,
    payableId,
    stripeSessionId: session.sessionId,
    amount,
    currency,
    status: 'PENDING',
  });

  return { checkoutUrl: session.checkoutUrl };
}

/**
 * Starts a Stripe Checkout for the $5/month Premium subscription. No Payment row is created
 * here — the SUBSCRIPTION row is created later, by the `invoice.paid` webhook (F1).
 * @param customerId - the subscribing Recipient's Stripe Customer id (from getOrCreateStripeCustomer)
 * @param successUrl - where Stripe redirects the browser after a successful subscribe
 * @param cancelUrl - where Stripe redirects the browser if the customer backs out
 * @param metadata - optional key/value tags (e.g. userId) so the webhook can look up who subscribed
 * @throws {Error} with statusCode = 502 if Stripe checkout-session creation fails
 */
async function startSubscriptionCheckout({
  customerId,
  successUrl,
  cancelUrl,
  metadata,
}: {
  customerId: string;
  successUrl: string;
  cancelUrl: string;
  metadata?: Record<string, string>;
}) {
  let session;
  try {
    session = await paymentProvider.createSubscriptionCheckoutSession({
      customerId,
      successUrl,
      cancelUrl,
      metadata,
    });
  } catch (error) {
    throw stripeApiError(error instanceof Error ? error.message : 'Failed to create Stripe subscription checkout session.');
  }

  if (!session.checkoutUrl) {
    throw stripeApiError('Stripe did not return a checkout URL.');
  }

  return { checkoutUrl: session.checkoutUrl };
}

/**
 * Toggles a Stripe Subscription's cancel-at-period-end flag (F5 — cancel/resume Premium).
 * Never calls Stripe's `subscriptions.cancel()`/`.del()`, so access is never revoked mid-period.
 * @param subscriptionId - the Stripe Subscription id to update
 * @param cancelAtPeriodEnd - `true` to schedule cancellation at period end, `false` to resume
 * @throws {Error} with statusCode = 502 if the Stripe API call fails
 */
async function setSubscriptionCancelAtPeriodEnd(subscriptionId: string, cancelAtPeriodEnd: boolean) {
  try {
    return await paymentProvider.updateSubscriptionCancelAtPeriodEnd(subscriptionId, cancelAtPeriodEnd);
  } catch (error) {
    throw stripeApiError(error instanceof Error ? error.message : 'Failed to update Stripe subscription.');
  }
}

export { startOneTimeCheckout, startSubscriptionCheckout, setSubscriptionCancelAtPeriodEnd };

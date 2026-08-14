// Contains payment business logic: Stripe customer/checkout orchestration and webhook event routing.
// Calls other modules only through their .interface.ts, and Stripe only through payment.provider.ts.
import * as paymentProvider from '../../integrations/payment/payment.provider.js';
import * as paymentRepository from './payment.repository.js';
import { userInterface } from '../users/user.interface.js';
import type { PayableType } from './payment.model.js';
import type { Types } from 'mongoose';
import type Stripe from 'stripe';

function recipientNotFoundError(): Error {
  const error: Error = new Error('Recipient profile not found.');
  error.statusCode = 404;
  return error;
}

function stripeApiError(message: string): Error {
  const error: Error = new Error(message);
  error.statusCode = 502;
  return error;
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
 * Starts a one-off Stripe Checkout for a single payable (an order or a donor-initiated donation),
 * recording a PENDING Payment row so the webhook can later find it by session id.
 * @param payableType - what this payment is for ("ORDER" today; kept generic for future payables)
 * @param payableId - the id of that payable document
 * @param amount - total charge in the currency's smallest unit (e.g. cents)
 * @param currency - ISO currency code (e.g. "usd")
 * @param customerId - the paying Recipient's Stripe Customer id (from getOrCreateStripeCustomer)
 * @param successUrl - where Stripe redirects the browser after a successful payment
 * @param cancelUrl - where Stripe redirects the browser if the customer backs out
 * @throws {Error} with statusCode = 502 if Stripe checkout-session creation fails
 */
async function startOneTimeCheckout({
  payableType,
  payableId,
  amount,
  currency,
  customerId,
  successUrl,
  cancelUrl,
}: {
  payableType: PayableType;
  payableId: string | Types.ObjectId;
  amount: number;
  currency: string;
  customerId: string;
  successUrl: string;
  cancelUrl: string;
}) {
  let session;
  try {
    session = await paymentProvider.createCheckoutSession({
      customerId,
      amount,
      currency,
      successUrl,
      cancelUrl,
      metadata: { payableType, payableId: String(payableId) },
    });
  } catch (error) {
    throw stripeApiError(error instanceof Error ? error.message : 'Failed to create Stripe checkout session.');
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
 * Starts a Stripe Checkout for the $5/month Premium subscription.
 * No Payment row is created here — there's nothing to reference as payableId until the
 * webhook's "checkout.session.completed" (subscription mode) handler creates the SUBSCRIPTION
 * row (F1's job; see the TODO in processWebhookEvent below).
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
 * Reconciles a verified "checkout.session.completed" (payment mode) event against its Payment row:
 * skips if already processed (Stripe redelivers events at-least-once), otherwise marks it PAID.
 * Only touches the PAYMENT row itself — marking the ORDER paid and starting delivery is D2's job.
 */
async function handlePaymentCheckoutCompleted(session: Stripe.Checkout.Session, eventId: string) {
  const payment = await paymentRepository.findPaymentBySessionId(session.id);

  // No matching Payment row (e.g. a session created outside this flow) — nothing to reconcile.
  if (!payment) {
    return;
  }

  if (payment.lastProcessedEventId === eventId) {
    return;
  }

  await paymentRepository.updatePaymentEvent(payment._id, {
    lastProcessedEventId: eventId,
    status: 'PAID',
    paidAt: new Date(),
  });

  // TODO(D2 - Reserve & Pay / C3 - Donor-Initiated Donation): flip ORDER.paymentStatus=PAID and
  // orderStatus=PREPARING, call DeliveryService.createForOrder, and emit payment:success
  // (docs/api_design.md 8/9/12). 
}

/**
 * Routes a verified Stripe webhook event to its handler. Called after
 * payment.provider.ts#verifyWebhookSignature has confirmed the event is genuinely from Stripe.
 * @param event - the parsed Stripe event
 */
async function processWebhookEvent(event: Stripe.Event) {
  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session;

      if (session.mode === 'payment') {
        await handlePaymentCheckoutCompleted(session, event.id);
      } else if (session.mode === 'subscription') {
        // TODO(F1 - Stripe Recurring Subscription): create the initial SUBSCRIPTION row
        // (status=ACTIVE) for this Recipient. No Payment row exists to check
        // lastProcessedEventId against yet, since startSubscriptionCheckout doesn't create one.
      }
      break;
    }
    case 'invoice.paid': {
      // TODO(F1): append a new SUBSCRIPTION row for the new billing cycle (append-only ledger
      // per docs/database_design.md) and send the confirmation email (Nodemailer).
      break;
    }
    case 'invoice.payment_failed': {
      // TODO(F1): set the latest SUBSCRIPTION.status=PAST_DUE for this Recipient.
      break;
    }
    case 'customer.subscription.deleted': {
      // TODO(F1): set the latest SUBSCRIPTION.status=CANCELLED for this Recipient.
      break;
    }
    default:
      // Any other event type Stripe sends us is not part of the documented flow (docs/api_design.md
      // §8) — safe to ignore. The controller still responds 200 so Stripe doesn't retry it.
      break;
  }
}

export { getOrCreateStripeCustomer, startOneTimeCheckout, startSubscriptionCheckout, processWebhookEvent,
};

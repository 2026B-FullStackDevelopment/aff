// Contains payment business logic: Stripe customer/checkout orchestration and webhook event routing.
// Calls other modules only through their .interface.ts, and Stripe only through payment.provider.ts.
import * as paymentProvider from '../../integrations/payment/payment.provider.js';
import * as paymentRepository from './payment.repository.js';
import { userInterface } from '../users/user.interface.js';
import { orderInterface } from '../orders/order.interface.js';
import { deliveryInterface } from '../delivery/delivery.interface.js';
import { emitToUser } from '../../realtime/socket.js';
import { notificationInterface } from '../notifications/notification.interface.js';
import type { PayableType } from './payment.model.js';
import type { ClientSession, Types } from 'mongoose';
import type Stripe from 'stripe';

function recipientNotFoundError(): Error {
  const error: Error = new Error('Recipient profile not found.');
  error.statusCode = 404;
  return error;
}

function paymentNotFoundError(): Error {
  const error: Error = new Error('Payment record not found for this order.');
  error.statusCode = 404;
  return error;
}

function stripeApiError(message: string): Error {
  const error: Error = new Error(message);
  error.statusCode = 502;
  return error;
}

/**
 * True when a thrown Stripe SDK error means "the customer id we sent no longer exists on
 * Stripe" (StripeInvalidRequestError, code=resource_missing, param=customer) — the shape Stripe
 * returns when a saved stripeCustomerId was deleted/invalidated since it was last used.
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
 * @param userId - the paying Recipient's USER._id. When Stripe rejects `customerId` because that
 *   customer no longer exists (e.g. deleted from the Stripe dashboard, or stale from a prior
 *   STRIPE_SECRET_KEY), this is used to mint a fresh customer, save it, and retry once. Omit only
 *   for callers with no Recipient to self-heal against.
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
 * Completes an Order payment after Stripe verifies checkout success.
 * All database changes commit together; the Recipient event is emitted only
 * after the transaction succeeds.
 */
async function handlePaymentCheckoutCompleted(
  stripeSession: Stripe.Checkout.Session,
  eventId: string,
) {
  const stripePaymentIntentId =
    typeof stripeSession.payment_intent === 'string'
      ? stripeSession.payment_intent
      : stripeSession.payment_intent?.id;

  const result = await paymentRepository.withTransaction(
    async (databaseSession) => {
      const payment = await paymentRepository.findPaymentBySessionId(
        stripeSession.id,
        databaseSession,
      );

      if (
        !payment ||
        payment.payableType !== 'ORDER' ||
        payment.status !== 'PENDING'
      ) {
        return null;
      }

      const paidPayment =
        await paymentRepository.markPaymentPaidIfPending(
          stripeSession.id,
          eventId,
          new Date(),
          databaseSession,
          stripePaymentIntentId,
        );

      // Another webhook request may have processed this Payment first.
      if (!paidPayment) {
        return null;
      }

      const order = await orderInterface.markOrderPaid(
        String(paidPayment.payableId),
        databaseSession,
      );

      if (!order) {
        throw new Error(
          'The Order linked to this Payment could not be updated.',
        );
      }

      await deliveryInterface.createForOrder(
        String(order._id),
        databaseSession,
      );

      return {
        orderId: String(order._id),
        recipientId: String(order.recipientId),
      };
    },
  );

  if (result) {
    void notificationInterface.sendNotification({
      userId: result.recipientId,
      type: 'PAYMENT_SUCCESS',
      orderId: result.orderId,
      payload: { orderId: result.orderId },
    });
  }
}

/**
 * Synchronously refunds a Stripe-paid order's payment as part of cancellation (D4). Only touches
 * the PAYMENT row — sets REFUND_PENDING, not REFUNDED; final confirmation is the caller's job to
 * surface once the charge.refunded webhook (see handleChargeRefunded below) settles it. Marking
 * ORDER.paymentStatus is the caller's responsibility, same division as handlePaymentCheckoutCompleted.
 * Idempotent: a payment already REFUND_PENDING or REFUNDED is not refunded again.
 * @param orderId - the cancelled ORDER._id. The caller is expected to have already confirmed the
 *   order is paymentMethod=STRIPE and paymentStatus=PAID before calling this.
 * @throws {Error} with statusCode = 404 if no Payment row exists for this order
 * @throws {Error} with statusCode = 502 if the payment has no stripePaymentIntentId to refund
 *   against, or Stripe's refund API call fails
 */
async function refundOrderPayment(orderId: string | Types.ObjectId) {
  const payment = await paymentRepository.findPaymentByPayable('ORDER', orderId);

  if (!payment) {
    throw paymentNotFoundError();
  }

  if (payment.status === 'REFUND_PENDING' || payment.status === 'REFUNDED') {
    return { status: payment.status, refundId: payment.stripeRefundId };
  }

  if (!payment.stripePaymentIntentId) {
    throw stripeApiError('Payment is missing a Stripe payment intent id; cannot refund.');
  }

  let refund;
  try {
    refund = await paymentProvider.createRefund({ paymentIntentId: payment.stripePaymentIntentId });
  } catch (error) {
    throw stripeApiError(error instanceof Error ? error.message : 'Failed to refund Stripe payment.');
  }

  await paymentRepository.markPaymentRefundPending(payment._id, refund.refundId);

  return { status: 'REFUND_PENDING' as const, refundId: refund.refundId };
}

/**
 * Cancels a still-PENDING Payment tied to a cancelled Order's abandoned Stripe Checkout Session
 * (D4 — cancelling a Stripe order before checkout completed). DB-only: unlike `refundOrderPayment`,
 * there is nothing to call Stripe for — a Checkout Session simply expires on its own — this just
 * stops a late `checkout.session.completed` webhook from resurrecting the cancelled Order (see
 * `handlePaymentCheckoutCompleted`'s `payment.status !== 'PENDING'` guard above). No-op if no
 * PENDING Payment row exists (free/cash orders, or a Stripe order whose checkout was never
 * started).
 */
async function cancelPendingOrderPayment(
  orderId: string | Types.ObjectId,
  session?: ClientSession,
) {
  return paymentRepository.cancelPendingPaymentByPayable('ORDER', orderId, session);
}

/**
 * Reconciles a verified "charge.refunded" event against its Payment row (matched by stripeRefundId,
 * set synchronously by refundOrderPayment above): skips if already processed, otherwise marks it
 * REFUNDED. Only touches the PAYMENT row — marking ORDER.paymentStatus=REFUNDED and emitting
 * payment:refunded (docs/api_design.md §8/§12) is D4's job, mirroring handlePaymentCheckoutCompleted.
 */
async function handleChargeRefunded(charge: Stripe.Charge, eventId: string) {
  const refundId = charge.refunds?.data[0]?.id;

  // No refund on this charge (shouldn't happen for this event type) — nothing to reconcile.
  if (!refundId) {
    return;
  }

  const payment = await paymentRepository.findPaymentByRefundId(refundId);

  // No matching Payment row (e.g. stripeRefundId not yet persisted, or an unrelated charge) —
  // nothing to reconcile.
  if (!payment) {
    return;
  }

  if (payment.lastProcessedEventId === eventId) {
    return;
  }

  await paymentRepository.updatePaymentEvent(payment._id, {
    lastProcessedEventId: eventId,
    status: 'REFUNDED',
    refundedAt: new Date(),
  });

  if (payment.payableType !== 'ORDER') {
    return;
  }

  const updatedOrder = await orderInterface.markOrderRefunded(
    String(payment.payableId),
  );

  if (updatedOrder) {
    emitToUser(String(updatedOrder.recipientId), 'payment:refunded', {
      orderId: String(updatedOrder._id),
    });
  }
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
    case 'charge.refunded': {
      const charge = event.data.object as Stripe.Charge;
      await handleChargeRefunded(charge, event.id);
      break;
    }
    default:
      // Any other event type Stripe sends us is not part of the documented flow (docs/api_design.md
      // §8) — safe to ignore. The controller still responds 200 so Stripe doesn't retry it.
      break;
  }
}

export { getOrCreateStripeCustomer, startOneTimeCheckout, startSubscriptionCheckout,
  refundOrderPayment, cancelPendingOrderPayment, processWebhookEvent,
};

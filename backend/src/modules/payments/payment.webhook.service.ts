// Contains webhook event routing and the checkout-completed effect. Calls other modules only
// through their .interface.ts, and Stripe only through payment.provider.ts.
import * as paymentRepository from './payment.repository.js';
import { orderInterface } from '../orders/order.interface.js';
import { deliveryInterface } from '../delivery/delivery.interface.js';
import { notificationInterface } from '../notifications/notification.interface.js';
import { subscriptionInterface } from '../subscriptions/subscription.interface.js';
import { emailInterface } from '../../integrations/email/email.interface.js';
import { handleRefundUpdated } from './payment.refund.service.js';
import type Stripe from 'stripe';

/**
 * Resolves a Stripe id field to its plain string id, whether Stripe sent it un-expanded (a
 * string) or expanded (an object with an `id`).
 */
function resolveStripeId(value: string | { id: string } | null | undefined): string {
  return typeof value === 'string' ? value : (value?.id ?? '');
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
        // Creates nothing — the SUBSCRIPTION row is appended by invoice.paid instead, which
        // fires for both the first payment and every renewal (F1, backend/SUBSCRIPTION.md).
        console.info(`Stripe subscription checkout completed for session ${session.id}; awaiting invoice.paid.`);
      }
      break;
    }
    case 'invoice.paid': {
      const invoice = event.data.object as Stripe.Invoice;
      const stripeCustomerId = resolveStripeId(invoice.customer);
      const stripeSubscriptionId = resolveStripeId(invoice.parent?.subscription_details?.subscription ?? null);
      const currentPeriodEndSeconds = invoice.lines.data[0]?.period?.end ?? invoice.period_end;

      const result = await subscriptionInterface.appendBillingCycle({
        stripeCustomerId,
        stripeSubscriptionId,
        stripeInvoiceId: invoice.id,
        currentPeriodEnd: new Date(currentPeriodEndSeconds * 1000),
        cancelAtPeriodEnd: false,
      });

      if (result.created) {
        // The ledger row is already committed, so an email failure must not become a non-2xx
        // response — that would make Stripe retry and silently skip the email forever.
        try {
          await emailInterface.sendSubscriptionConfirmation({
            to: result.recipientEmail,
            currentPeriodEnd: result.currentPeriodEnd,
          });
        } catch (error) {
          console.error('Failed to send the Premium subscription confirmation email:', error);
        }
      }
      break;
    }
    case 'invoice.payment_failed': {
      const invoice = event.data.object as Stripe.Invoice;
      await subscriptionInterface.markLatestPastDue(resolveStripeId(invoice.customer));
      break;
    }
    case 'customer.subscription.deleted': {
      const subscription = event.data.object as Stripe.Subscription;
      await subscriptionInterface.markLatestCancelled(resolveStripeId(subscription.customer));
      break;
    }
    case 'refund.updated': {
      const refund = event.data.object as Stripe.Refund;
      await handleRefundUpdated(refund, event.id);
      break;
    }
    default:
      // Any other event type Stripe sends us is not part of the documented flow (docs/api_design.md
      // §8) — safe to ignore. The controller still responds 200 so Stripe doesn't retry it.
      break;
  }
}

export { processWebhookEvent, handlePaymentCheckoutCompleted };

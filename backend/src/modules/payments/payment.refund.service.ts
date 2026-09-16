// Contains Stripe refund orchestration and the refund.updated reconciliation. Calls other modules
// only through their .interface.ts, and Stripe only through payment.provider.ts.
import * as paymentProvider from '../../integrations/payment/payment.provider.js';
import * as paymentRepository from './payment.repository.js';
import { orderInterface } from '../orders/order.interface.js';
import { notificationInterface } from '../notifications/notification.interface.js';
import type { ClientSession, Types } from 'mongoose';
import type Stripe from 'stripe';
import { paymentNotFoundError, stripeApiError } from './payment.service.errors.js';

/**
 * Synchronously refunds a Stripe-paid order's payment as part of cancellation (D4). Only touches
 * the PAYMENT row — sets REFUND_PENDING, not REFUNDED; final confirmation is the caller's job to
 * surface once the refund.updated webhook (see handleRefundUpdated below) settles it. Marking
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
 * `handlePaymentCheckoutCompleted`'s `payment.status !== 'PENDING'` guard). No-op if no
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
 * Reconciles a verified "refund.updated" event against its Payment row (matched by
 * stripeRefundId, set synchronously by refundOrderPayment above): ignores the refund
 * until it reaches a terminal `succeeded` status, skips if already processed, otherwise
 * marks it REFUNDED. Only touches the PAYMENT row — marking ORDER.paymentStatus=REFUNDED
 * and sending the PAYMENT_REFUNDED notification (docs/api_design.md §12/§14) mirrors
 * handlePaymentCheckoutCompleted.
 *
 * Listens to the Refund object directly rather than the older `charge.refunded` event:
 * as of Stripe's 2024-10-28 API change, `charge.refunded` no longer reliably carries the
 * refund's id/status in its payload, whereas `refund.updated` (now sent for every refund
 * type, not just chargeless ones) gives both directly with no extra API call.
 */
async function handleRefundUpdated(refund: Stripe.Refund, eventId: string) {
  // Only a terminal success confirms the refund; ignore pending/failed/canceled updates.
  if (refund.status !== 'succeeded') {
    return;
  }

  const payment = await paymentRepository.findPaymentByRefundId(refund.id);

  // No matching Payment row (e.g. stripeRefundId not yet persisted, or an unrelated refund) —
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
    void notificationInterface.sendNotification({
      userId: String(updatedOrder.recipientId),
      type: 'PAYMENT_REFUNDED',
      orderId: String(updatedOrder._id),
      payload: { orderId: String(updatedOrder._id) },
    });
  }
}

export { refundOrderPayment, cancelPendingOrderPayment, handleRefundUpdated };

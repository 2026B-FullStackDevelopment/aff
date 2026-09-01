// Check mongoDB object
import { isValidObjectId } from 'mongoose';
import type { ClientSession } from 'mongoose';
import type { CreateOrderInput } from './order.repository.js';
// Contains order rules and uses other modules through interfaces only.
import * as orderRepository from './order.repository.js';
import { deliveryInterface } from '../delivery/delivery.interface.js';
import { listingInterface } from '../listings/listing.interface.js';
import { paymentInterface } from '../payments/payment.interface.js';
import { env } from '../../config/env.js';
import type { PaymentMethod } from './order.model.js';

function createHttpError(statusCode: number, message: string): Error {
  const error: Error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

async function listOrdersForRecipient(recipientId: string) {
  return orderRepository.findOrdersByRecipient(recipientId);
}

async function findOrderById(
  orderId: string,
  session?: ClientSession,
) {
  return orderRepository.findOrderById(orderId, session);
}

/**
 * Fetches a single Order for its owning Recipient, alongside its Delivery
 * stage (if any) so the client can gate the "Cancel Order" button (D4)
 * without a second request. Never distinguishes a nonexistent order from
 * one owned by someone else — both are `404` — so this endpoint can't be
 * used to probe for another Recipient's order ids.
 */
async function getOrderForRecipient(
  orderId: string,
  recipientId: string,
) {
  if (!isValidObjectId(orderId)) {
    throw createHttpError(404, 'Order not found.');
  }

  const order = await orderRepository.findOrderByIdAndRecipient(
    orderId,
    recipientId,
  );

  if (!order) {
    throw createHttpError(404, 'Order not found.');
  }

  const delivery = await deliveryInterface.findByOrderId(orderId);

  return { order, deliveryStage: delivery ? delivery.stage : null };
}

/**
 * Cancels a Recipient's own Order while its Delivery is still
 * `AWAITING_COURIER` (or doesn't exist yet), restoring the Listing's stock
 * and — for a Stripe-paid Order — synchronously starting a refund (D4).
 * Ownership and ordering: a mismatched recipient simply isn't found (404,
 * same non-distinguishing behavior as `getOrderForRecipient`); a Delivery
 * already past `AWAITING_COURIER` — whether seen on the pre-check or only
 * discovered by the atomic update losing a claim race — is a `409`, and the
 * Order is left untouched. The Stripe refund call happens only after the
 * cancellation transaction commits (it's a network call) and never rolls
 * the cancellation back if it fails. A Stripe Order still `PAYMENT_PENDING`
 * (checkout started, never completed) has its dangling `PENDING` Payment row
 * cancelled inside the same transaction, so a late `checkout.session.completed`
 * against that abandoned Checkout Session can't resurrect a cancelled Order.
 * @throws {Error} with statusCode = 404 if the Order doesn't exist or isn't this Recipient's
 * @throws {Error} with statusCode = 409 if the Delivery has moved past `AWAITING_COURIER`,
 *   including a claim that wins the race between the pre-check and the atomic update
 */
async function cancelOrder(orderId: string, recipientId: string) {
  if (!isValidObjectId(orderId)) {
    throw createHttpError(404, 'Order not found.');
  }

  const order = await orderRepository.findOrderByIdAndRecipient(
    orderId,
    recipientId,
  );

  if (!order) {
    throw createHttpError(404, 'Order not found.');
  }

  const existingDelivery = await deliveryInterface.findByOrderId(orderId);

  if (existingDelivery && existingDelivery.stage !== 'AWAITING_COURIER') {
    throw createHttpError(409, 'This order can no longer be cancelled.');
  }

  const cancelledAt = new Date();

  const { updatedOrder, deliveryStage } = await orderRepository.withTransaction(
    async (session) => {
      const cancelledDelivery = existingDelivery
        ? await deliveryInterface.cancelAwaitingDeliveryForOrder(
            orderId,
            cancelledAt,
            session,
          )
        : null;

      if (existingDelivery && !cancelledDelivery) {
        throw createHttpError(409, 'This order can no longer be cancelled.');
      }

      const cancelled = await orderRepository.cancelOrderById(
        orderId,
        recipientId,
        cancelledAt,
        session,
      );

      if (!cancelled) {
        throw createHttpError(409, 'This order can no longer be cancelled.');
      }

      await listingInterface.restoreStock(
        String(cancelled.listingId),
        cancelled.quantity,
        session,
      );

      if (
        cancelled.paymentMethod === 'STRIPE' &&
        cancelled.paymentStatus === 'PAYMENT_PENDING'
      ) {
        await paymentInterface.cancelPendingOrderPayment(orderId, session);
      }

      return {
        updatedOrder: cancelled,
        deliveryStage: cancelledDelivery ? cancelledDelivery.stage : null,
      };
    },
  );

  let refundStatus: 'NOT_APPLICABLE' | 'REFUND_PENDING' | 'FAILED' =
    'NOT_APPLICABLE';

  if (
    updatedOrder.paymentMethod === 'STRIPE' &&
    updatedOrder.paymentStatus === 'PAID'
  ) {
    try {
      await paymentInterface.refundOrderPayment(orderId);
      refundStatus = 'REFUND_PENDING';
    } catch {
      refundStatus = 'FAILED';
    }
  }

  return { order: updatedOrder, deliveryStage, refundStatus };
}

/**
 * Flips a cancelled Order's `paymentStatus` to `REFUNDED` once the
 * `charge.refunded` webhook confirms the refund (D4).
 */
async function markOrderRefunded(
  orderId: string,
  session?: ClientSession,
) {
  return orderRepository.markOrderRefunded(orderId, session);
}

// Check whether the order belongs to the recipient
async function verifyOrderOwnership(
  orderId: string,
  recipientId: string
): Promise<boolean> {
  
  if (!isValidObjectId(orderId)) return false;

  const order = await orderRepository.findOrderByIdAndRecipient(orderId, recipientId);
  return Boolean(order);
};

async function findNonCancelledOrderIdsByListing(
  listingId: string,
  session?: ClientSession,
): Promise<string[]> {
  return orderRepository.findNonCancelledOrderIdsByListing(listingId, session);
}

async function hasNonCancelledOrderForListing(
  listingId: string,
  recipientId: string,
  session?: ClientSession,
): Promise<boolean> {
  return orderRepository.hasNonCancelledOrderForListing(
    listingId,
    recipientId,
    session,
  );
}

async function createOrder(
  data: CreateOrderInput,
  session?: ClientSession,
) {
  return orderRepository.createOrder(data, session);
}

async function markOrderPaid(
  orderId: string,
  session?: ClientSession,
) {
  return orderRepository.markOrderPaid(orderId, session);
}

async function markOrderDelivered(
  orderId: string,
  courierId: string,
  deliveredAt: Date,
  isCashPayment: boolean,
  session?: ClientSession,
) {
  return orderRepository.markOrderDelivered(
    orderId,
    courierId,
    deliveredAt,
    isCashPayment,
    session,
  );
}

/**
 * Records a Recipient's payment choice for a pending Order.
 * Cash orders enter the Courier queue immediately; Stripe orders do not.
 */
async function choosePaymentMethod(
  orderId: string,
  recipientId: string,
  paymentMethod: PaymentMethod,
) {
  if (!isValidObjectId(orderId)) {
    throw createHttpError(404, 'Order not found.');
  }

  const existing = await orderRepository.findOrderByIdAndRecipient(
    orderId,
    recipientId,
  );

  if (!existing) {
    throw createHttpError(404, 'Order not found.');
  }

  if (existing.paymentStatus !== 'PAYMENT_PENDING') {
    throw createHttpError(
      409,
      'This Order is not awaiting a payment choice.',
    );
  }

  if (existing.paymentMethod && existing.paymentMethod !== paymentMethod) {
    throw createHttpError(
      409,
      'A different payment method was already selected.',
    );
  }

  const order = existing.paymentMethod === paymentMethod
    ? existing
    : await orderRepository.setPaymentMethodIfUnset(
        orderId,
        recipientId,
        paymentMethod,
      );

  if (!order) {
    throw createHttpError(
      409,
      'The payment choice changed before this request completed.',
    );
  }

  // Cash orders enter the Courier queue immediately. Stripe orders wait
  // until checkout.session.completed is processed by the webhook.
  if (paymentMethod === 'CASH') {
    await deliveryInterface.createForOrder(String(order._id));
  }

  return order;
}

/**
 * Starts Stripe Checkout for a Recipient-owned pending Stripe Order.
 */
async function createCheckoutSession(
  orderId: string,
  recipientId: string,
) {
  const order = await orderRepository.findOrderByIdAndRecipient(
    orderId,
    recipientId,
  );

  if (!order) {
    throw createHttpError(404, 'Order not found.');
  }

  if (
    order.paymentMethod !== 'STRIPE' ||
    order.paymentStatus !== 'PAYMENT_PENDING'
  ) {
    throw createHttpError(
      409,
      'This Order is not ready for Stripe checkout.',
    );
  }

  const customerId = await paymentInterface.getOrCreateStripeCustomer(
    recipientId,
  );

  return paymentInterface.startOneTimeCheckout({
    payableType: 'ORDER',
    payableId: order._id,
    amount: order.amount,
    currency: 'vnd',
    customerId,
    userId: recipientId,
    successUrl: `${env.clientUrl}/orders/${orderId}?payment=success`,
    cancelUrl: `${env.clientUrl}/orders/${orderId}?payment=cancelled`,
  });
}

async function cancelOrdersByIds(
  orderIds: string[],
  cancelledByUserId: string,
  cancelledAt: Date,
  session?: ClientSession,
): Promise<number> {
  return orderRepository.cancelOrdersByIds(
    orderIds,
    cancelledByUserId,
    cancelledAt,
    session,
  );
}

async function listOrdersForListing(
  listingId: string,
  page: number,
  limit: number,
) {
  return orderRepository.findOrdersForListing(listingId, page, limit);
}

export {
  listOrdersForRecipient,
  findOrderById,
  getOrderForRecipient,
  cancelOrder,
  markOrderRefunded,
  verifyOrderOwnership,
  findNonCancelledOrderIdsByListing,
  hasNonCancelledOrderForListing,
  createOrder,
  markOrderPaid,
  markOrderDelivered,
  choosePaymentMethod,
  createCheckoutSession,
  cancelOrdersByIds,
  listOrdersForListing,
};

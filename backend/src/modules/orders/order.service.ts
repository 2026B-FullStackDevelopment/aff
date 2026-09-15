// Check mongoDB object
import { isValidObjectId } from 'mongoose';
import type { ClientSession } from 'mongoose';
import type { CreateOrderInput, PaymentMethod } from './order.types.js';
// Contains order rules and uses other modules through interfaces only.
import * as orderRepository from './order.repository.js';
import { deliveryInterface } from '../delivery/delivery.interface.js';
import { listingInterface } from '../listings/listing.interface.js';
import { paymentInterface } from '../payments/payment.interface.js';
import { env } from '../../config/env.js';

function createHttpError(statusCode: number, message: string): Error {
  const error: Error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

async function listOrdersForRecipient(
  recipientId: string,
  page: number,
  limit: number,
) {
  return orderRepository.findOrdersForRecipient(recipientId, page, limit);
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

  return {
    order,
    deliveryStage: delivery ? delivery.stage : null,
    deliveryId: delivery ? String(delivery._id) : null,
  };
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
      await orderRepository.markOrderRefundPending(orderId);
      refundStatus = 'REFUND_PENDING';
    } catch {
      refundStatus = 'FAILED';
    }
  }

  return { order: updatedOrder, deliveryStage, refundStatus };
}

/**
 * Flips a cancelled Order's `paymentStatus` to `REFUNDED` once the
 * `refund.updated` webhook confirms the refund (D4).
 */
async function markOrderRefunded(
  orderId: string,
  session?: ClientSession,
) {
  return orderRepository.markOrderRefunded(orderId, session);
}

/**
 * Records a Recipient's one-shot feedback on their own delivered Order (D7). Ownership uses the
 * same non-distinguishing 404 as `cancelOrder`/`getOrderForRecipient`. The pre-checks below exist
 * only for a better error message on the common path — `orderRepository.setFeedback`'s atomic
 * guard is the real correctness guarantee against a race between this read and that write.
 * @throws {Error} with statusCode = 404 if the Order doesn't exist or isn't this Recipient's
 * @throws {Error} with statusCode = 409 if the Order isn't `DELIVERED` yet
 * @throws {Error} with statusCode = 409, carrying `.feedback`, if feedback was already submitted
 */
async function submitFeedback(
  orderId: string,
  recipientId: string,
  comment: string,
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

  if (order.orderStatus !== 'DELIVERED') {
    throw createHttpError(409, "This order hasn't been delivered yet.");
  }

  if (order.feedback) {
    const alreadySubmitted = createHttpError(
      409,
      'Feedback has already been submitted for this order.',
    );
    alreadySubmitted.feedback = order.feedback;
    throw alreadySubmitted;
  }

  const createdAt = new Date();
  const updated = await orderRepository.setFeedback(
    orderId,
    comment,
    createdAt,
  );

  if (!updated) {
    // Lost a race between the reads above and the atomic write: the Order's status changed, or
    // another request's feedback landed first. Re-fetch so the 409 carries the real feedback.
    const current = await orderRepository.findOrderByIdAndRecipient(
      orderId,
      recipientId,
    );

    const alreadySubmitted = createHttpError(
      409,
      'Feedback has already been submitted for this order.',
    );
    if (current?.feedback) {
      alreadySubmitted.feedback = current.feedback;
    }
    throw alreadySubmitted;
  }

  return updated.feedback!;
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

/**
 * Loads a set of Orders by id for a caller joining against Orders — currently
 * the Admin Delivery table (E11). Exposed through `order.interface` so other
 * modules never read the `ORDER` collection directly.
 */
async function findOrdersByIds(orderIds: string[], session?: ClientSession) {
  if (orderIds.length === 0) return [];

  return orderRepository.findOrdersByIds(orderIds, session);
}

/** Loads non-terminal Orders for a page of Admin Listing rows. */
async function findNonCancelledOrdersByListingIds(
  listingIds: string[],
  session?: ClientSession,
) {
  return orderRepository.findNonCancelledOrdersByListingIds(listingIds, session);
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

/**
 * Cancels a batch of Orders as part of a Listing being cancelled out from
 * under them (Donor `PATCH /listings/:id/status`, and Admin's equivalent
 * cascade once G3 ships) — the DB-only half of the same rules `cancelOrder`
 * applies to a single self-cancelled Order (D4). Runs inside the caller's
 * transaction: restores each cancelled Order's Listing stock and cancels a
 * dangling `PAYMENT_PENDING` row, exactly like `cancelOrder` does, but keeps
 * the bulk atomic `updateMany` instead of looping `cancelOrder` — a cascade
 * has no per-order ownership or delivery-state check to re-run; those were
 * already applied when the caller computed `orderIds` and bulk-cancelled the
 * awaiting Deliveries a moment earlier in the same transaction.
 *
 * A refund is a network call and must never run inside a DB transaction, so
 * it is deliberately not attempted here — this only returns which of the
 * cancelled Orders are refundable (`STRIPE` + `PAID`); the caller is
 * responsible for refunding them via `refundCancelledOrders` after the
 * transaction commits.
 */
async function cancelOrdersForListingCancellation(
  orderIds: string[],
  cancelledByUserId: string,
  cancelledAt: Date,
  session?: ClientSession,
): Promise<{ cancelledCount: number; refundableOrderIds: string[] }> {
  if (orderIds.length === 0) {
    return { cancelledCount: 0, refundableOrderIds: [] };
  }

  const orders = await orderRepository.findOrdersByIds(orderIds, session);

  const cancelledCount = await orderRepository.cancelOrdersByIds(
    orderIds,
    cancelledByUserId,
    cancelledAt,
    session,
  );

  const refundableOrderIds: string[] = [];

  for (const order of orders) {
    await listingInterface.restoreStock(
      String(order.listingId),
      order.quantity,
      session,
    );

    if (order.paymentMethod === 'STRIPE' && order.paymentStatus === 'PAYMENT_PENDING') {
      await paymentInterface.cancelPendingOrderPayment(String(order._id), session);
    }

    if (order.paymentMethod === 'STRIPE' && order.paymentStatus === 'PAID') {
      refundableOrderIds.push(String(order._id));
    }
  }

  return { cancelledCount, refundableOrderIds };
}

/**
 * Refunds a batch of Orders left `STRIPE` + `PAID` by a Listing-cancellation
 * cascade, after that cascade's transaction has committed (D4's `cancelOrder`
 * uses the same post-commit shape for its single-order refund). One Order's
 * Stripe failure never stops the rest — each outcome is reported back so the
 * caller can surface which Orders still need manual reconciliation.
 */
async function refundCancelledOrders(
  orderIds: string[],
): Promise<Array<{ orderId: string; refundStatus: 'REFUND_PENDING' | 'FAILED' }>> {
  const outcomes: Array<{ orderId: string; refundStatus: 'REFUND_PENDING' | 'FAILED' }> = [];

  for (const orderId of orderIds) {
    try {
      await paymentInterface.refundOrderPayment(orderId);
      await orderRepository.markOrderRefundPending(orderId);
      outcomes.push({ orderId, refundStatus: 'REFUND_PENDING' });
    } catch {
      outcomes.push({ orderId, refundStatus: 'FAILED' });
    }
  }

  return outcomes;
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
  submitFeedback,
  verifyOrderOwnership,
  findNonCancelledOrderIdsByListing,
  hasNonCancelledOrderForListing,
  createOrder,
  markOrderPaid,
  markOrderDelivered,
  findOrdersByIds,
  findNonCancelledOrdersByListingIds,
  choosePaymentMethod,
  createCheckoutSession,
  cancelOrdersForListingCancellation,
  refundCancelledOrders,
  listOrdersForListing,
};

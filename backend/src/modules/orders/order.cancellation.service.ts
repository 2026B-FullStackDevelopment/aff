import { isValidObjectId } from 'mongoose';
import type { ClientSession } from 'mongoose';
// Contains order cancellation and refund paths and uses other modules through interfaces only.
import * as orderRepository from './order.repository.js';
import { deliveryInterface } from '../delivery/delivery.interface.js';
import { listingInterface } from '../listings/listing.interface.js';
import { paymentInterface } from '../payments/payment.interface.js';
import { createHttpError } from './order.service.errors.js';

/**
 * Cancels a Recipient's own Order while its Delivery is still `AWAITING_COURIER` (or absent),
 * restoring the Listing's stock and, for a Stripe-paid Order, starting a refund afterward (D4).
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
 * Cancels a batch of Orders inside the caller's transaction as part of a Listing being
 * cancelled out from under them, restoring stock and cancelling dangling Stripe payments (D4).
 * Returns which cancelled Orders are refundable; the caller refunds them via
 * `refundCancelledOrders` after the transaction commits.
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
 * Refunds a batch of Orders left `STRIPE` + `PAID` after a Listing-cancellation cascade commits (D4).
 * One Order's Stripe failure never stops the rest; each outcome is reported back individually.
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

export {
  cancelOrder,
  markOrderRefunded,
  cancelOrdersForListingCancellation,
  refundCancelledOrders,
};

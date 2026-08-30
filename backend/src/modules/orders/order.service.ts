// Check mongoDB object
import { isValidObjectId } from 'mongoose';
import type { ClientSession } from 'mongoose';
import type { CreateOrderInput } from './order.repository.js';
// Contains order rules and uses other modules through interfaces only.
import * as orderRepository from './order.repository.js';
import { deliveryInterface } from '../delivery/delivery.interface.js';
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

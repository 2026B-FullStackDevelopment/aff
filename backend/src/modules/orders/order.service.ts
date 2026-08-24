// Check mongoDB object
import { isValidObjectId } from 'mongoose';
import type { ClientSession } from 'mongoose';
import type { CreateOrderInput } from './order.repository.js';
// Contains order rules and uses other modules through interfaces only.
import * as orderRepository from './order.repository.js';

async function listOrdersForRecipient(recipientId: string) {
  return orderRepository.findOrdersByRecipient(recipientId);
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
  verifyOrderOwnership,
  findNonCancelledOrderIdsByListing,
  createOrder,
  markOrderPaid,
  cancelOrdersByIds,
  listOrdersForListing,
};

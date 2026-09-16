// Check mongoDB object
import { isValidObjectId } from 'mongoose';
import type { ClientSession } from 'mongoose';
// Contains order read paths and uses other modules through interfaces only.
import * as orderRepository from './order.repository.js';
import { deliveryInterface } from '../delivery/delivery.interface.js';
import { createHttpError } from './order.service.errors.js';

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
  verifyOrderOwnership,
  findNonCancelledOrderIdsByListing,
  hasNonCancelledOrderForListing,
  findOrdersByIds,
  findNonCancelledOrdersByListingIds,
  listOrdersForListing,
};

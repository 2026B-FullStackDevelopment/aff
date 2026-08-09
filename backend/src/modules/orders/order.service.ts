// Contains order rules and uses other modules through interfaces only.
import * as orderRepository from './order.repository.js';
import { listingInterface } from '../listings/listing.interface.js';

async function listOrdersForRecipient(recipientId) {
  return orderRepository.findOrdersByRecipient(recipientId);
}

async function createOrder(recipientId, listingId) {
  const listing = await listingInterface.getListingById(listingId);

  if (!listing || listing.status !== 'AVAILABLE') {
    const error = new Error('This listing is not available for an order.');
    error.statusCode = 400;
    throw error;
  }

  const order = await orderRepository.createOrder({
    recipientId,
    listingId,
    status: 'RESERVED',
  });

  await listingInterface.markListingReserved(listingId);
  return order;
}

export { listOrdersForRecipient, createOrder };

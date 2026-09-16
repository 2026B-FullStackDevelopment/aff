import type { ClientSession } from 'mongoose';
// Contains the delivery-driven Order fulfillment transition.
import * as orderRepository from './order.repository.js';

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

export { markOrderDelivered };

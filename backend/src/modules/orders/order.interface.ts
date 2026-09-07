// Exposes safe order operations for other modules without importing order.service directly.
import * as orderService from './order.service.js';

const orderInterface = {
  listOrdersForRecipient: orderService.listOrdersForRecipient,
  findOrderById: orderService.findOrderById,
  verifyOrderOwnership: orderService.verifyOrderOwnership,
  findNonCancelledOrderIdsByListing:
    orderService.findNonCancelledOrderIdsByListing,
  hasNonCancelledOrderForListing: orderService.hasNonCancelledOrderForListing,
  createOrder: orderService.createOrder,
  markOrderPaid: orderService.markOrderPaid,
  markOrderDelivered: orderService.markOrderDelivered,
  markOrderRefunded: orderService.markOrderRefunded,
  cancelOrdersByIds: orderService.cancelOrdersByIds,
  listOrdersForListing: orderService.listOrdersForListing,
};

export { orderInterface };

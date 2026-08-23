// Exposes safe order operations for other modules without importing order.service directly.
import * as orderService from './order.service.js';

const orderInterface = {
  listOrdersForRecipient: orderService.listOrdersForRecipient,
  verifyOrderOwnership: orderService.verifyOrderOwnership,
  findNonCancelledOrderIdsByListing:
    orderService.findNonCancelledOrderIdsByListing,
  cancelOrdersByIds: orderService.cancelOrdersByIds,
  listOrdersForListing: orderService.listOrdersForListing,
};

export { orderInterface };

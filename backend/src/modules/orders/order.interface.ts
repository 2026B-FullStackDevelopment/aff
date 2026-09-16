// Exposes safe order operations for other modules without importing order's split services directly.
import * as orderQueryService from './order.query.service.js';
import * as orderCheckoutService from './order.checkout.service.js';
import * as orderFulfillmentService from './order.fulfillment.service.js';
import * as orderCancellationService from './order.cancellation.service.js';

const orderInterface = {
  listOrdersForRecipient: orderQueryService.listOrdersForRecipient,
  findOrderById: orderQueryService.findOrderById,
  findOrdersByIds: orderQueryService.findOrdersByIds,
  findNonCancelledOrdersByListingIds:
    orderQueryService.findNonCancelledOrdersByListingIds,
  verifyOrderOwnership: orderQueryService.verifyOrderOwnership,
  findNonCancelledOrderIdsByListing:
    orderQueryService.findNonCancelledOrderIdsByListing,
  hasNonCancelledOrderForListing: orderQueryService.hasNonCancelledOrderForListing,
  createOrder: orderCheckoutService.createOrder,
  markOrderPaid: orderCheckoutService.markOrderPaid,
  markOrderDelivered: orderFulfillmentService.markOrderDelivered,
  markOrderRefunded: orderCancellationService.markOrderRefunded,
  cancelOrdersForListingCancellation:
    orderCancellationService.cancelOrdersForListingCancellation,
  refundCancelledOrders: orderCancellationService.refundCancelledOrders,
  listOrdersForListing: orderQueryService.listOrdersForListing,
};

export { orderInterface };

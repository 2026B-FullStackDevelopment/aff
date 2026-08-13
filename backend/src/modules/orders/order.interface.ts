// Exposes safe order operations for other modules without importing order.service directly.
import * as orderService from './order.service.js';

const orderInterface = {
  listOrdersForRecipient: orderService.listOrdersForRecipient,
  verifyOrderOwnership: orderService.verifyOrderOwnership
};

export { orderInterface };

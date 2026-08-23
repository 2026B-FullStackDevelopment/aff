// Exposes safe delivery operations for other modules without importing delivery.service directly.
import * as deliveryService from './delivery.service.js';

const deliveryInterface = {
  createForOrder: deliveryService.createForOrder,
  findProtectedOrderIds: deliveryService.findProtectedOrderIds,
  cancelAwaitingDeliveriesByOrderIds:
    deliveryService.cancelAwaitingDeliveriesByOrderIds,
};

export { deliveryInterface };

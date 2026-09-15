// Re-exports the delivery module's services so the module keeps one public entry point.
// The logic lives in delivery.orders.service (order-module integration),
// delivery.queue.service (Courier queue + Admin oversight reads), and
// delivery.courier.service (the claim/pickup/deliver state machine); each is
// small enough to read on its own.
export {
  createForOrder,
  findProtectedOrderIds,
  cancelAwaitingDeliveriesByOrderIds,
  findByOrderId,
  cancelAwaitingDeliveryForOrder,
} from './delivery.orders.service.js';
export { listForAdmin, listQueue, getActiveDelivery, getDeliveryById } from './delivery.queue.service.js';
export { claimDelivery, markPickedUp, recordCourierLocation, markDelivered } from './delivery.courier.service.js';
export type { QueueDeliveryPage, DeliveryViewerRole } from './delivery.types.js';

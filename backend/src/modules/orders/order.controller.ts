// Handles order HTTP requests and returns order DTOs.
import * as orderService from './order.service.js';
import { toOrderDto } from './order.dto.js';
import { ok, notImplemented } from '../../shared/http/response.js';

async function listMyOrders(req, res, next) {
  try {
    const orders = await orderService.listOrdersForRecipient(req.user.id);
    return ok(res, orders.map(toOrderDto));
  } catch (error) {
    return next(error);
  }
}

// The following need the order schema rebuild (paymentMethod/paymentStatus/orderStatus, intakePath, etc.),
// the Stripe integration, and the Delivery module — see docs/api_design.md §7 and docs/blockers.md.
async function cancelOrder(_req, res) {
  return notImplemented(res);
}

async function submitFeedback(_req, res) {
  return notImplemented(res);
}

async function createCheckoutSession(_req, res) {
  return notImplemented(res);
}

export { listMyOrders, cancelOrder, submitFeedback, createCheckoutSession };

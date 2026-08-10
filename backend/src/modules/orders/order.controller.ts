// Handles order HTTP requests and returns order DTOs.
import type { Request, Response, NextFunction } from 'express';
import * as orderService from './order.service.js';
import { toOrderResponseDto } from './order.dto.js';
import { ok, notImplemented } from '../../shared/http/response.js';

async function listMyOrders(req: Request, res: Response, next: NextFunction) {
  try {
    const orders = await orderService.listOrdersForRecipient(req.user!.id);
    return ok(res, orders.map(toOrderResponseDto));
  } catch (error) {
    return next(error);
  }
}

// The following need the Stripe integration and the Delivery module before they can be implemented
// — see docs/api_design.md §7 and docs/blockers.md.
async function cancelOrder(_req: Request, res: Response) {
  return notImplemented(res);
}

async function submitFeedback(_req: Request, res: Response) {
  return notImplemented(res);
}

async function createCheckoutSession(_req: Request, res: Response) {
  return notImplemented(res);
}

export { listMyOrders, cancelOrder, submitFeedback, createCheckoutSession };

// Handles order HTTP requests and returns order DTOs.
import type { Request, Response, NextFunction } from 'express';
import * as orderService from './order.service.js';
import { toOrderResponseDto } from './order.dto.js';
import { ok, notImplemented } from '../../shared/http/response.js';
import { parseBody } from '../../shared/validation/parse-body.js';
import {
  orderIdParamsSchema,
  choosePaymentMethodSchema,
} from './order.schemas.js';

async function listMyOrders(req: Request, res: Response, next: NextFunction) {
  try {
    const orders = await orderService.listOrdersForRecipient(req.user!.id);
    return ok(res, orders.map(toOrderResponseDto));
  } catch (error) {
    return next(error);
  }
}

async function getOrder(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = parseBody(orderIdParamsSchema, req.params);
    const order = await orderService.getOrderForRecipient(id, req.user!.id);
    return ok(res, toOrderResponseDto(order));
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

async function choosePaymentMethod(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const { id } = parseBody(orderIdParamsSchema, req.params);
    const { paymentMethod } = parseBody(
      choosePaymentMethodSchema,
      req.body,
    );

    const order = await orderService.choosePaymentMethod(
      id,
      req.user!.id,
      paymentMethod,
    );

    return ok(res, toOrderResponseDto(order));
  } catch (error) {
    return next(error);
  }
}

async function createCheckoutSession(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const { id } = parseBody(orderIdParamsSchema, req.params);
    const result = await orderService.createCheckoutSession(
      id,
      req.user!.id,
    );

    return ok(res, result);
  } catch (error) {
    return next(error);
  }
}

export {
  listMyOrders,
  getOrder,
  cancelOrder,
  submitFeedback,
  choosePaymentMethod,
  createCheckoutSession,
};

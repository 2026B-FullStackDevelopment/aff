// Handles order HTTP requests and returns order DTOs.
import type { Request, Response, NextFunction } from 'express';
import * as orderService from './order.service.js';
import { toOrderResponseDto, toCancelOrderResponseDto } from './order.dto.js';
import { ok, notImplemented } from '../../shared/http/response.js';
import { parseBody } from '../../shared/validation/parse-body.js';
import {
  orderIdParamsSchema,
  choosePaymentMethodSchema,
} from './order.schemas.js';

async function listMyOrders(req: Request, res: Response, next: NextFunction) {
  try {
    const orders = await orderService.listOrdersForRecipient(req.user!.id);
    return ok(res, orders.map((order) => toOrderResponseDto(order)));
  } catch (error) {
    return next(error);
  }
}

async function getOrder(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = parseBody(orderIdParamsSchema, req.params);
    const { order, deliveryStage } = await orderService.getOrderForRecipient(
      id,
      req.user!.id,
    );
    return ok(res, toOrderResponseDto(order, deliveryStage));
  } catch (error) {
    return next(error);
  }
}

async function cancelOrder(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = parseBody(orderIdParamsSchema, req.params);
    const { order, deliveryStage, refundStatus } = await orderService.cancelOrder(
      id,
      req.user!.id,
    );
    return ok(res, toCancelOrderResponseDto(order, refundStatus, deliveryStage));
  } catch (error) {
    return next(error);
  }
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

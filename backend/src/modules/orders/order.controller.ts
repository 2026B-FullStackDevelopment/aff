// Handles order HTTP requests and returns order DTOs.
import type { Request, Response, NextFunction } from 'express';
import * as orderQueryService from './order.query.service.js';
import * as orderCheckoutService from './order.checkout.service.js';
import * as orderCancellationService from './order.cancellation.service.js';
import * as orderFeedbackService from './order.feedback.service.js';
import {
  toOrderResponseDto,
  toCancelOrderResponseDto,
  toRecipientOrderResponseDto,
  toSubmitFeedbackResponseDto,
} from './order.dto.js';
import { ok, created, paginated } from '../../shared/http/response.js';
import { parseBody } from '../../shared/validation/parse-body.js';
import {
  orderIdParamsSchema,
  choosePaymentMethodSchema,
  mineOrdersQuerySchema,
  submitFeedbackSchema,
} from './order.schemas.js';

async function listMyOrders(req: Request, res: Response, next: NextFunction) {
  try {
    const { page, limit } = parseBody(mineOrdersQuerySchema, req.query);
    const result = await orderQueryService.listOrdersForRecipient(
      req.user!.id,
      page,
      limit,
    );

    return paginated(
      res,
      result.items.map(toRecipientOrderResponseDto),
      result.page,
      result.limit,
      result.total,
    );
  } catch (error) {
    return next(error);
  }
}

async function getOrder(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = parseBody(orderIdParamsSchema, req.params);
    const { order, deliveryStage, deliveryId } = await orderQueryService.getOrderForRecipient(
      id,
      req.user!.id,
    );
    return ok(res, toOrderResponseDto(order, deliveryStage, deliveryId));
  } catch (error) {
    return next(error);
  }
}

async function cancelOrder(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = parseBody(orderIdParamsSchema, req.params);
    const { order, deliveryStage, refundStatus } = await orderCancellationService.cancelOrder(
      id,
      req.user!.id,
    );
    return ok(res, toCancelOrderResponseDto(order, refundStatus, deliveryStage));
  } catch (error) {
    return next(error);
  }
}

async function submitFeedback(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = parseBody(orderIdParamsSchema, req.params);
    const { comment } = parseBody(submitFeedbackSchema, req.body);

    const feedback = await orderFeedbackService.submitFeedback(
      id,
      req.user!.id,
      comment,
    );

    return created(res, toSubmitFeedbackResponseDto(feedback));
  } catch (error) {
    return next(error);
  }
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

    const order = await orderCheckoutService.choosePaymentMethod(
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
    const result = await orderCheckoutService.createCheckoutSession(
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

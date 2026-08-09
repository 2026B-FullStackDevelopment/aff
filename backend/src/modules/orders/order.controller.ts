// Handles order HTTP requests and returns order DTOs.
import * as orderService from './order.service.js';
import { toOrderDto } from './order.dto.js';
import { created, ok } from '../../shared/http/response.js';

async function listMyOrders(req, res, next) {
  try {
    const orders = await orderService.listOrdersForRecipient(req.user.id);
    return ok(res, orders.map(toOrderDto));
  } catch (error) {
    return next(error);
  }
}

async function createOrder(req, res, next) {
  try {
    const order = await orderService.createOrder(req.user.id, req.body.listingId);
    return created(res, toOrderDto(order));
  } catch (error) {
    return next(error);
  }
}

export { listMyOrders, createOrder };

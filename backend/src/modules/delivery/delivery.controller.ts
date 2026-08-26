// Handles Courier delivery HTTP requests. See docs/api_design.md §9.
import type { Request, Response, NextFunction } from 'express';
import { ok, notImplemented } from '../../shared/http/response.js';
import { parseBody } from '../../shared/validation/parse-body.js';
import {
  deliveryIdParamsSchema,
  markDeliveredSchema,
} from './delivery.schemas.js';
import { toDeliveryResponseDto } from './delivery.dto.js';
import * as deliveryService from './delivery.service.js';


// None of these are wired to real logic yet — the atomic claim guarantee and the Socket.IO
// tracking layer don't exist yet. See docs/blockers.md.
async function listQueue(_req: Request, res: Response) {
  return notImplemented(res);
}

async function getActiveDelivery(_req: Request, res: Response) {
  return notImplemented(res);
}

async function claimDelivery(_req: Request, res: Response) {
  return notImplemented(res);
}

async function getDeliveryById(_req: Request, res: Response) {
  return notImplemented(res);
}

async function markPickedUp(_req: Request, res: Response) {
  return notImplemented(res);
}

async function markDelivered(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = parseBody(deliveryIdParamsSchema, req.params);

    // payload is the validated data, sent by the client in req.body
    const payload = parseBody(markDeliveredSchema, req.body);

    const { delivery, pickupAddressText, pickupAddressLocation } =
      await deliveryService.markDelivered(id, req.user!.id, payload);

    // HTTP 200 ok
    return ok(
      res,
      toDeliveryResponseDto(delivery, {
        pickupAddressText,
        pickupAddressLocation,
      }),
    );
  } catch (error) {
    return next(error);
  }
}

export { listQueue, getActiveDelivery, claimDelivery, getDeliveryById, markPickedUp, markDelivered };

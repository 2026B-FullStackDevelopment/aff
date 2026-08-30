// Handles Courier delivery HTTP requests. See docs/api_design.md §9.
import type { Request, Response, NextFunction } from 'express';
import { ok, paginated, notImplemented } from '../../shared/http/response.js';
import { parseBody } from '../../shared/validation/parse-body.js';
import {
  deliveryIdParamsSchema,
  markDeliveredSchema,
  deliveryQueueQuerySchema,
} from './delivery.schemas.js';
import { toDeliveryResponseDto } from './delivery.dto.js';
import * as deliveryService from './delivery.service.js';


/** `GET /deliveries/queue` — the shared, oldest-first Courier queue (E2). */
async function listQueue(req: Request, res: Response, next: NextFunction) {
  try {
    const query = parseBody(deliveryQueueQuerySchema, req.query);
    const result = await deliveryService.listQueue(query);

    return paginated(res, result.items, result.page, result.limit, result.total);
  } catch (error) {
    return next(error);
  }
}

/** `GET /deliveries/active` — the Courier's in-flight Delivery, if any (E4). */
async function getActiveDelivery(req: Request, res: Response, next: NextFunction) {
  try {
    const { delivery, pickupAddressText, pickupAddressLocation } =
      await deliveryService.getActiveDelivery(req.user!.id);

    return ok(
      res,
      toDeliveryResponseDto(delivery, { pickupAddressText, pickupAddressLocation }),
    );
  } catch (error) {
    return next(error);
  }
}

/** `PATCH /deliveries/:id/claim` — atomically claim an unclaimed Delivery (E3). */
async function claimDelivery(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = parseBody(deliveryIdParamsSchema, req.params);

    const { delivery, pickupAddressText, pickupAddressLocation } =
      await deliveryService.claimDelivery(id, req.user!.id);

    return ok(
      res,
      toDeliveryResponseDto(delivery, { pickupAddressText, pickupAddressLocation }),
    );
  } catch (error) {
    return next(error);
  }
}

// Still unwired: the Recipient's tracking view (E8) and live tracking (E6).
// A Courier never reaches a Delivery by arbitrary id — getDeliveryById is
// RECIPIENT/ADMIN-only by design (E5). See docs/api_design.md §9.
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

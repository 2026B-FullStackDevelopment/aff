// Handles Courier delivery HTTP requests. See docs/api_design.md §9.
import type { Request, Response, NextFunction } from 'express';
import { ok, paginated } from '../../shared/http/response.js';
import { parseBody } from '../../shared/validation/parse-body.js';
import {
  deliveryIdParamsSchema,
  markDeliveredSchema,
  deliveryQueueQuerySchema,
} from './delivery.schemas.js';
import { toDeliveryResponseDto } from './delivery.dto.js';
import * as deliveryService from './delivery.service.js';
import type { DeliveryViewerRole } from './delivery.service.js';


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
    const { delivery, pickupAddressText, pickupAddressLocation, order } =
      await deliveryService.getActiveDelivery(req.user!.id);

    return ok(
      res,
      toDeliveryResponseDto(delivery, { pickupAddressText, pickupAddressLocation, order }),
    );
  } catch (error) {
    return next(error);
  }
}

/** `PATCH /deliveries/:id/claim` — atomically claim an unclaimed Delivery (E3). */
async function claimDelivery(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = parseBody(deliveryIdParamsSchema, req.params);

    const { delivery, pickupAddressText, pickupAddressLocation, order } =
      await deliveryService.claimDelivery(id, req.user!.id);

    return ok(
      res,
      toDeliveryResponseDto(delivery, { pickupAddressText, pickupAddressLocation, order }),
    );
  } catch (error) {
    return next(error);
  }
}

/** `GET /deliveries/:id` — the Recipient's tracking view, or Admin oversight (E8). */
async function getDeliveryById(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = parseBody(deliveryIdParamsSchema, req.params);

    const { delivery, pickupAddressText, pickupAddressLocation, order } =
      await deliveryService.getDeliveryById(
        id,
        req.user!.id,
        req.user!.role as DeliveryViewerRole,
      );

    return ok(
      res,
      toDeliveryResponseDto(delivery, { pickupAddressText, pickupAddressLocation, order }),
    );
  } catch (error) {
    return next(error);
  }
}

/** `PATCH /deliveries/:id/pickup` — confirm collection and start live tracking (E6). */
async function markPickedUp(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = parseBody(deliveryIdParamsSchema, req.params);

    const { delivery, pickupAddressText, pickupAddressLocation, order } =
      await deliveryService.markPickedUp(id, req.user!.id);

    return ok(
      res,
      toDeliveryResponseDto(delivery, { pickupAddressText, pickupAddressLocation, order }),
    );
  } catch (error) {
    return next(error);
  }
}

async function markDelivered(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = parseBody(deliveryIdParamsSchema, req.params);

    // payload is the validated data, sent by the client in req.body
    const payload = parseBody(markDeliveredSchema, req.body);

    const { delivery, pickupAddressText, pickupAddressLocation, order } =
      await deliveryService.markDelivered(id, req.user!.id, payload);

    // HTTP 200 ok
    return ok(
      res,
      toDeliveryResponseDto(delivery, {
        pickupAddressText,
        pickupAddressLocation,
        order,
      }),
    );
  } catch (error) {
    return next(error);
  }
}

export { listQueue, getActiveDelivery, claimDelivery, getDeliveryById, markPickedUp, markDelivered };

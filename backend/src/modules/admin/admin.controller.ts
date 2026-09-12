// Handles admin HTTP requests and returns admin DTOs.
import type { Request, Response, NextFunction } from 'express';
import { created, paginated, notImplemented } from '../../shared/http/response.js';
import { parseBody } from '../../shared/validation/parse-body.js';
import {
  createCourierSchema,
  adminCouriersQuerySchema,
  adminDeliveriesQuerySchema,
} from './admin.schemas.js';
import * as adminService from './admin.service.js';

/** `POST /admin/couriers` — the only path by which a Courier account is ever created (E1). */
async function createCourier(req: Request, res: Response, next: NextFunction) {
  try {
    const payload = parseBody(createCourierSchema, req.body);
    const courier = await adminService.createCourier(payload);

    return created(res, courier);
  } catch (error) {
    return next(error);
  }
}

/** `GET /admin/couriers` — the Courier roster (E11). */
async function listCouriers(req: Request, res: Response, next: NextFunction) {
  try {
    const query = parseBody(adminCouriersQuerySchema, req.query);
    const result = await adminService.listCouriers(query);

    return paginated(res, result.items, result.page, result.limit, result.total);
  } catch (error) {
    return next(error);
  }
}

/** `GET /admin/deliveries` — the read-only Delivery oversight table (E11). */
async function listDeliveries(req: Request, res: Response, next: NextFunction) {
  try {
    const query = parseBody(adminDeliveriesQuerySchema, req.query);
    const result = await adminService.listDeliveries(query);

    return paginated(res, result.items, result.page, result.limit, result.total);
  } catch (error) {
    return next(error);
  }
}

// Still unwired: the general account directory (G1), account status changes
// (G2), and the Admin listing directory and cancellation (G3/G4).
// See docs/api_design.md §11.
async function listUsers(_req: Request, res: Response) {
  return notImplemented(res);
}

async function updateUserStatus(_req: Request, res: Response) {
  return notImplemented(res);
}

async function cancelListing(_req: Request, res: Response) {
  return notImplemented(res);
}

async function listAllListings(_req: Request, res: Response) {
  return notImplemented(res);
}

export {
  createCourier,
  listCouriers,
  listDeliveries,
  listUsers,
  updateUserStatus,
  cancelListing,
  listAllListings,
};

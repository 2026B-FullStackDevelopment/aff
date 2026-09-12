// Handles admin HTTP requests and returns admin DTOs.
import type { Request, Response, NextFunction } from 'express';
import { created, ok, paginated, notImplemented } from '../../shared/http/response.js';
import { parseBody } from '../../shared/validation/parse-body.js';
import {
  createCourierSchema,
  adminCouriersQuerySchema,
  adminDeliveriesQuerySchema,
  adminListingsQuerySchema,
  adminListingParamsSchema,
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

// Still unwired on Long's account-management branch: the general account
// directory (G1) and account status changes (G2). See docs/api_design.md §11.
async function listUsers(_req: Request, res: Response) {
  return notImplemented(res);
}

async function updateUserStatus(_req: Request, res: Response) {
  return notImplemented(res);
}

/** `PATCH /admin/listings/:id/cancel` — shared safe cancellation cascade (G3/G5). */
async function cancelListing(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = parseBody(adminListingParamsSchema, req.params);
    const result = await adminService.cancelListing(id, req.user!.id);
    return ok(res, result);
  } catch (error) {
    return next(error);
  }
}

/** `GET /admin/listings` — searchable directory across every Listing status (G4). */
async function listAllListings(req: Request, res: Response, next: NextFunction) {
  try {
    const query = parseBody(adminListingsQuerySchema, req.query);
    const result = await adminService.listListings(query);
    return paginated(res, result.items, result.page, result.limit, result.total);
  } catch (error) {
    return next(error);
  }
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

// Handles admin HTTP requests and returns admin DTOs.
import type { Request, Response, NextFunction } from 'express';
import { created, ok, paginated, notImplemented } from '../../shared/http/response.js';
import { parseBody } from '../../shared/validation/parse-body.js';
import {
  createCourierSchema,
  adminCouriersQuerySchema,
  adminDeliveriesQuerySchema,
  adminUsersQuerySchema,
  adminUserIdParamsSchema,
  updateUserStatusSchema,
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

/** `GET /admin/users` — the filterable, paginated account directory (G1). */
async function listUsers(req: Request, res: Response, next: NextFunction) {
  try {
    const query = parseBody(adminUsersQuerySchema, req.query);
    const result = await adminService.listUsers(query);

    return paginated(res, result.items, result.page, result.limit, result.total);
  } catch (error) {
    return next(error);
  }
}

/** `PATCH /admin/users/:id/status` — deactivate or reactivate an account (G2). */
async function updateUserStatus(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = parseBody(adminUserIdParamsSchema, req.params);
    const payload = parseBody(updateUserStatusSchema, req.body);
    const user = await adminService.updateUserStatus(id, payload);

    return ok(res, user);
  } catch (error) {
    return next(error);
  }
}

// Still unwired: the Admin listing directory and cancellation (G3/G4).
// See docs/api_design.md §11.
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

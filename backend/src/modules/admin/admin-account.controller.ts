// Handles Admin account-management HTTP requests and returns safe DTOs.
import type { NextFunction, Request, Response } from 'express';
import * as adminAccountService from './admin-account.service.js';
import { created, ok, paginated } from '../../shared/http/response.js';
import { parseBody } from '../../shared/validation/parse-body.js';
import {
  adminCouriersQuerySchema,
  adminUserIdParamsSchema,
  adminUsersQuerySchema,
  createCourierSchema,
  updateUserStatusSchema,
} from './admin-account.schemas.js';

async function createCourier(req: Request, res: Response, next: NextFunction) {
  try {
    const payload = parseBody(createCourierSchema, req.body);
    return created(res, await adminAccountService.createCourier(payload));
  } catch (error) {
    return next(error);
  }
}

async function listCouriers(req: Request, res: Response, next: NextFunction) {
  try {
    const query = parseBody(adminCouriersQuerySchema, req.query);
    const result = await adminAccountService.listCouriers(query);
    return paginated(res, result.items, query.page, query.limit, result.total);
  } catch (error) {
    return next(error);
  }
}

async function listUsers(req: Request, res: Response, next: NextFunction) {
  try {
    const query = parseBody(adminUsersQuerySchema, req.query);
    const result = await adminAccountService.listUsers(query);
    return paginated(res, result.items, query.page, query.limit, result.total);
  } catch (error) {
    return next(error);
  }
}

async function updateUserStatus(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = parseBody(adminUserIdParamsSchema, req.params);
    const input = parseBody(updateUserStatusSchema, req.body);
    return ok(res, await adminAccountService.updateUserStatus(id, input));
  } catch (error) {
    return next(error);
  }
}

export { createCourier, listCouriers, listUsers, updateUserStatus };

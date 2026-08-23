// Handles user HTTP requests and delegates profile rules to the user service.
import type { Request, Response, NextFunction } from 'express';
import * as userService from './user.service.js';
import { parseBody } from '../../shared/validation/parse-body.js';
import { updateUserSchema } from './user.schemas.js';
import { ok } from '../../shared/http/response.js';

async function getMyProfile(req: Request, res: Response, next: NextFunction) {
  try {
    const dto = await userService.getMyProfileDto(req.user!.id);
    return ok(res, dto);
  } catch (error) {
    return next(error);
  }
}

async function updateMyProfile(req: Request, res: Response, next: NextFunction) {
  try {
    const patch = parseBody(updateUserSchema, req.body);
    const dto = await userService.updateUserProfile(req.user!.id, req.user!.role, patch);
    return ok(res, dto);
  } catch (error) {
    return next(error);
  }
}

export { getMyProfile, updateMyProfile };

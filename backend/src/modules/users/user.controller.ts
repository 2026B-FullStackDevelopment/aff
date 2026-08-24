// Handles user HTTP requests and delegates profile rules to the user service.
import type { Request, Response, NextFunction } from 'express';
import * as userService from './user.service.js';
import { parseBody } from '../../shared/validation/parse-body.js';
import { updateUserSchema, changePasswordSchema, changeEmailSchema } from './user.schemas.js';
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

async function changePassword(req: Request, res: Response, next: NextFunction) {
  try {
    const { newPassword } = parseBody(changePasswordSchema, req.body);
    await userService.changePassword(req.user!.id, newPassword, req.auth!);
    return ok(res, null);
  } catch (error) {
    return next(error);
  }
}

async function changeEmail(req: Request, res: Response, next: NextFunction) {
  try {
    const { newEmail } = parseBody(changeEmailSchema, req.body);
    const dto = await userService.changeEmail(req.user!.id, newEmail);
    return ok(res, dto);
  } catch (error) {
    return next(error);
  }
}

export { getMyProfile, updateMyProfile, changePassword, changeEmail };

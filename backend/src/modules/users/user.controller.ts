// Handles user HTTP requests and delegates profile rules to the user service.
import type { Request, Response, NextFunction } from 'express';
import * as userService from './user.service.js';
import { toUserResponseDto } from './user.dto.js';
import { ok, notImplemented } from '../../shared/http/response.js';

async function getMyProfile(req: Request, res: Response, next: NextFunction) {
  try {
    const user = await userService.getUserById(req.user!.id);
    return ok(res, toUserResponseDto(user));
  } catch (error) {
    return next(error);
  }
}

// Field-level update rules (per-role editable fields) aren't built yet — see docs/api_design.md §5.
async function updateMyProfile(_req: Request, res: Response) {
  return notImplemented(res);
}

export { getMyProfile, updateMyProfile };

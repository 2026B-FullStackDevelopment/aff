// Handles user HTTP requests and delegates profile rules to the user service.
import * as userService from './user.service.js';
import { toUserDto } from './user.dto.js';
import { ok, notImplemented } from '../../shared/http/response.js';

async function getMyProfile(req, res, next) {
  try {
    const user = await userService.getUserById(req.user.id);
    return ok(res, toUserDto(user));
  } catch (error) {
    return next(error);
  }
}

// Field-level update rules (per-role editable fields) aren't built yet — see docs/api_design.md §5.
async function updateMyProfile(_req, res) {
  return notImplemented(res);
}

// Supabase Storage upload isn't wired up yet — see docs/api_design.md §5.
async function uploadAvatar(_req, res) {
  return notImplemented(res);
}

export { getMyProfile, updateMyProfile, uploadAvatar };

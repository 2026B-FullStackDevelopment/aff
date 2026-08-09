// Handles user HTTP requests and delegates profile rules to the user service.
import * as userService from './user.service.js';
import { toUserDto } from './user.dto.js';
import { ok } from '../../shared/http/response.js';

async function getMyProfile(req, res, next) {
  try {
    const user = await userService.getUserById(req.user.id);
    return ok(res, toUserDto(user));
  } catch (error) {
    return next(error);
  }
}

async function getUserById(req, res, next) {
  try {
    const user = await userService.getUserById(req.params.id);
    return ok(res, toUserDto(user));
  } catch (error) {
    return next(error);
  }
}

export { getMyProfile, getUserById };

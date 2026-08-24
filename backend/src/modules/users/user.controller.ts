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

async function searchRecipients(req: Request, res: Response, next: NextFunction, ) {
  try {
    // req.query is from the url, typeof is JS to check value type
    const email = typeof req.query.email === 'string' ? req.query.email : '';

    const recipients = await userService.searchRecipientsByEmail(email);

    // HTTP ok(res, data) 200 response
    return ok(
      res,
      recipients.map((recipient) => ({
        id: String(recipient._id),
        username: recipient.username,
        email: recipient.email,
      })), //map() loops thru & returns new array
    );
  } catch (error) {
    return next(error);
  }
}

export { 
  getMyProfile, 
  updateMyProfile,
  searchRecipients, 
};

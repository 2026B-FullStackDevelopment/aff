// Handles notification HTTP requests and returns Notification DTOs.
import type { Request, Response, NextFunction } from 'express';
import * as notificationService from './notification.service.js';
import { toNotificationResponseDto } from './notification.dto.js';
import { parseBody } from '../../shared/validation/parse-body.js';
import { notificationsQuerySchema } from './notification.schemas.js';
import { paginated } from '../../shared/http/response.js';

async function listMyNotifications(req: Request, res: Response, next: NextFunction) {
  try {
    const { page, limit } = parseBody(notificationsQuerySchema, req.query);
    const result = await notificationService.listMyNotifications(req.user!.id, page, limit);

    return paginated(res, result.items.map(toNotificationResponseDto), result.page, result.limit, result.total);
  } catch (error) {
    return next(error);
  }
}

export { listMyNotifications };

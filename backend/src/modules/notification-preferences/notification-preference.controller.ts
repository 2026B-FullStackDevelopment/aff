// Handles notification-preference HTTP requests and returns NotificationPreference DTOs.
import type { Request, Response, NextFunction } from 'express';
import * as notificationPreferenceService from './notification-preference.service.js';
import { toNotificationPreferenceResponseDto } from './notification-preference.dto.js';
import { parseBody } from '../../shared/validation/parse-body.js';
import {
  createNotificationPreferenceSchema,
  updateNotificationPreferenceSchema,
  notificationPreferenceIdParamsSchema,
} from './notification-preference.schemas.js';
import { ok, created } from '../../shared/http/response.js';

async function listMyPreferences(req: Request, res: Response, next: NextFunction) {
  try {
    const preferences = await notificationPreferenceService.listPreferences(req.user!.id);
    return ok(res, preferences.map(toNotificationPreferenceResponseDto));
  } catch (error) {
    return next(error);
  }
}

async function createMyPreference(req: Request, res: Response, next: NextFunction) {
  try {
    const input = parseBody(createNotificationPreferenceSchema, req.body);
    const preference = await notificationPreferenceService.createPreference(req.user!.id, input);
    return created(res, toNotificationPreferenceResponseDto(preference));
  } catch (error) {
    return next(error);
  }
}

async function updateMyPreference(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = parseBody(notificationPreferenceIdParamsSchema, req.params);
    const input = parseBody(updateNotificationPreferenceSchema, req.body);
    const preference = await notificationPreferenceService.updatePreference(req.user!.id, id, input);
    return ok(res, toNotificationPreferenceResponseDto(preference));
  } catch (error) {
    return next(error);
  }
}

async function deleteMyPreference(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = parseBody(notificationPreferenceIdParamsSchema, req.params);
    await notificationPreferenceService.deletePreference(req.user!.id, id);
    return ok(res, null);
  } catch (error) {
    return next(error);
  }
}

export { listMyPreferences, createMyPreference, updateMyPreference, deleteMyPreference };

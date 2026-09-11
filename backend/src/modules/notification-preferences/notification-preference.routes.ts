// Defines notification-preference API endpoints and connects them to notification-preference controller functions.
// Matches docs/api_design.md §10. Mounted at /recipients/me/preferences — base path is /recipients, not
// /notification-preferences, same reasoning subscription.routes.ts documented before this module existed.
import express from 'express';
import * as notificationPreferenceController from './notification-preference.controller.js';
import { requireAuth } from '../../middleware/auth.middleware.js';
import { requireRole } from '../../middleware/role.middleware.js';

const router = express.Router();

router.get('/me/preferences', requireAuth, requireRole('RECIPIENT'), notificationPreferenceController.listMyPreferences);
router.post('/me/preferences', requireAuth, requireRole('RECIPIENT'), notificationPreferenceController.createMyPreference);
router.patch('/me/preferences/:id', requireAuth, requireRole('RECIPIENT'), notificationPreferenceController.updateMyPreference);
router.delete('/me/preferences/:id', requireAuth, requireRole('RECIPIENT'), notificationPreferenceController.deleteMyPreference);

export default router;

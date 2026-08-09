// Defines premium subscription API endpoints and connects them to subscription controller functions.
// Matches docs/api_design.md §10. `PUT /recipients/me/preferences` is mounted separately (see
// recipientPreferencesRoutes below) since its base path is /recipients, not /subscriptions.
import express from 'express';
import * as subscriptionController from './subscription.controller.js';
import { requireAuth } from '../../middleware/auth.middleware.js';
import { requireRole } from '../../middleware/role.middleware.js';

const router = express.Router();

router.get('/me', requireAuth, requireRole('RECIPIENT'), subscriptionController.getMySubscription);
router.post(
  '/checkout-session',
  requireAuth,
  requireRole('RECIPIENT'),
  subscriptionController.createSubscriptionCheckoutSession
);

const recipientPreferencesRoutes = express.Router();
recipientPreferencesRoutes.put(
  '/me/preferences',
  requireAuth,
  requireRole('RECIPIENT'),
  subscriptionController.updateNotificationPreferences
);

export default router;
export { recipientPreferencesRoutes };

// Defines premium subscription API endpoints and connects them to subscription controller functions.
// Matches docs/api_design.md §10.
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
router.patch('/me', requireAuth, requireRole('RECIPIENT'), subscriptionController.updateMySubscription);

export default router;

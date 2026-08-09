// Defines premium subscription API endpoints and connects them to subscription controller functions.
import express from 'express';
import * as subscriptionController from './subscription.controller.js';
import { requireAuth } from '../../middleware/auth.middleware.js';
import { requireRole } from '../../middleware/role.middleware.js';

const router = express.Router();

router.post('/premium', requireAuth, requireRole('RECIPIENT'), subscriptionController.startPremiumSubscription);

export default router;

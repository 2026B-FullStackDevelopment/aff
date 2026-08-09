// Defines order API endpoints and connects them to order controller functions.
// Matches docs/api_design.md §7. Order creation lives under /listings (reserve/donations), not here.
import express from 'express';
import * as orderController from './order.controller.js';
import { requireAuth } from '../../middleware/auth.middleware.js';
import { requireRole } from '../../middleware/role.middleware.js';

const router = express.Router();

router.get('/mine', requireAuth, requireRole('RECIPIENT'), orderController.listMyOrders);
router.delete('/:id', requireAuth, requireRole('RECIPIENT'), orderController.cancelOrder);
router.post('/:id/feedback', requireAuth, requireRole('RECIPIENT'), orderController.submitFeedback);
router.post('/:id/checkout-session', requireAuth, requireRole('RECIPIENT'), orderController.createCheckoutSession);

export default router;

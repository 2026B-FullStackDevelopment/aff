// Defines order API endpoints and connects them to order controller functions.
import express from 'express';
import * as orderController from './order.controller.js';
import { requireAuth } from '../../middleware/auth.middleware.js';
import { requireRole } from '../../middleware/role.middleware.js';

const router = express.Router();

router.get('/me', requireAuth, requireRole('RECIPIENT'), orderController.listMyOrders);
router.post('/', requireAuth, requireRole('RECIPIENT'), orderController.createOrder);

export default router;

// Defines Courier delivery API endpoints and connects them to delivery controller functions.
// Matches docs/api_design.md §9.
import express from 'express';
import * as deliveryController from './delivery.controller.js';
import { requireAuth } from '../../middleware/auth.middleware.js';
import { requireRole } from '../../middleware/role.middleware.js';

const router = express.Router();

router.get('/queue', requireAuth, requireRole('COURIER'), deliveryController.listQueue);
router.get('/active', requireAuth, requireRole('COURIER'), deliveryController.getActiveDelivery);
router.patch('/:id/claim', requireAuth, requireRole('COURIER'), deliveryController.claimDelivery);
router.get('/:id', requireAuth, requireRole('RECIPIENT', 'ADMIN'), deliveryController.getDeliveryById);
router.patch('/:id/pickup', requireAuth, requireRole('COURIER'), deliveryController.markPickedUp);
router.patch('/:id/deliver', requireAuth, requireRole('COURIER'), deliveryController.markDelivered);

export default router;

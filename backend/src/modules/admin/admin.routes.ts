// Defines admin-only API endpoints and protects them with role middleware.
// Matches docs/api_design.md §11.
import express from 'express';
import * as adminController from './admin.controller.js';
import { requireAuth } from '../../middleware/auth.middleware.js';
import { requireRole } from '../../middleware/role.middleware.js';

const router = express.Router();

router.post('/couriers', requireAuth, requireRole('ADMIN'), adminController.createCourier);
router.get('/couriers', requireAuth, requireRole('ADMIN'),adminController.listCouriers);
router.get('/deliveries', requireAuth, requireRole('ADMIN'),adminController.listDeliveries);
router.get('/users', requireAuth, requireRole('ADMIN'),adminController.listUsers);
router.patch('/users/:id/status', requireAuth, requireRole('ADMIN'),adminController.updateUserStatus);
router.patch('/listings/:id/cancel', requireAuth, requireRole('ADMIN'),adminController.cancelListing);
router.get('/listings', requireAuth, requireRole('ADMIN'),adminController.listAllListings);

export default router;

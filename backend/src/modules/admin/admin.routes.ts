// Defines admin-only API endpoints and protects them with role middleware.
// Matches docs/api_design.md §11.
import express from 'express';
import * as adminController from './admin.controller.js';
import { requireAuth } from '../../middleware/auth.middleware.js';
import { requireRole } from '../../middleware/role.middleware.js';

const router = express.Router();

router.use(requireAuth, requireRole('ADMIN'));

router.post('/couriers', adminController.createCourier);
router.get('/couriers', adminController.listCouriers);
router.get('/deliveries', adminController.listDeliveries);
router.get('/users', adminController.listUsers);
router.patch('/users/:id/status', adminController.updateUserStatus);
router.patch('/listings/:id/cancel', adminController.cancelListing);
router.get('/listings', adminController.listAllListings);

export default router;

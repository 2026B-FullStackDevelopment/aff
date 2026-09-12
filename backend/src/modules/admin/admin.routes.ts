// Defines admin-only API endpoints and protects them with role middleware.
// Matches docs/api_design.md §11.
import express from 'express';
import * as adminController from './admin.controller.js';
import * as adminAccountController from './admin-account.controller.js';
import { requireAuth } from '../../middleware/auth.middleware.js';
import { requireRole } from '../../middleware/role.middleware.js';

const router = express.Router();

router.use(requireAuth, requireRole('ADMIN'));

router.post('/couriers', adminAccountController.createCourier);
router.get('/couriers', adminAccountController.listCouriers);
router.get('/deliveries', adminController.listDeliveries);
router.get('/users', adminAccountController.listUsers);
router.patch('/users/:id/status', adminAccountController.updateUserStatus);
router.patch('/listings/:id/cancel', adminController.cancelListing);
router.get('/listings', adminController.listAllListings);

export default router;

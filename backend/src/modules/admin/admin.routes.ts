// Defines admin-only API endpoints and protects them with role middleware.
import express from 'express';
import * as adminController from './admin.controller.js';
import { requireAuth } from '../../middleware/auth.middleware.js';
import { requireRole } from '../../middleware/role.middleware.js';

const router = express.Router();

router.get('/dashboard', requireAuth, requireRole('ADMIN'), adminController.getDashboardSummary);

export default router;

// Defines food listing API endpoints and connects them to food controller functions.
import express from 'express';
import * as foodController from './food.controller.js';
import { requireAuth } from '../../middleware/auth.middleware.js';
import { requireRole } from '../../middleware/role.middleware.js';

const router = express.Router();

router.get('/', foodController.listAvailableFood);
router.post('/', requireAuth, requireRole('DONOR'), foodController.createFoodListing);

export default router;

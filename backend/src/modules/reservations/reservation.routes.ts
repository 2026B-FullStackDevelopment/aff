// Defines reservation API endpoints and connects them to reservation controller functions.
import express from 'express';
import * as reservationController from './reservation.controller.js';
import { requireAuth } from '../../middleware/auth.middleware.js';
import { requireRole } from '../../middleware/role.middleware.js';

const router = express.Router();

router.get('/me', requireAuth, requireRole('RECIPIENT'), reservationController.listMyReservations);
router.post('/', requireAuth, requireRole('RECIPIENT'), reservationController.createReservation);

export default router;

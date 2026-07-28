// Defines reservation API endpoints and connects them to reservation controller functions.
const express = require('express');
const reservationController = require('./reservation.controller');
const { requireAuth } = require('../../middleware/auth.middleware');
const { requireRole } = require('../../middleware/role.middleware');

const router = express.Router();

router.get('/me', requireAuth, requireRole('RECIPIENT'), reservationController.listMyReservations);
router.post('/', requireAuth, requireRole('RECIPIENT'), reservationController.createReservation);

module.exports = router;

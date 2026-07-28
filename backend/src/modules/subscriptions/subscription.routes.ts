// Defines premium subscription API endpoints and connects them to subscription controller functions.
const express = require('express');
const subscriptionController = require('./subscription.controller');
const { requireAuth } = require('../../middleware/auth.middleware');
const { requireRole } = require('../../middleware/role.middleware');

const router = express.Router();

router.post('/premium', requireAuth, requireRole('RECIPIENT'), subscriptionController.startPremiumSubscription);

module.exports = router;

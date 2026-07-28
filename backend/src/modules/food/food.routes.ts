// Defines food listing API endpoints and connects them to food controller functions.
const express = require('express');
const foodController = require('./food.controller');
const { requireAuth } = require('../../middleware/auth.middleware');
const { requireRole } = require('../../middleware/role.middleware');

const router = express.Router();

router.get('/', foodController.listAvailableFood);
router.post('/', requireAuth, requireRole('DONOR'), foodController.createFoodListing);

module.exports = router;

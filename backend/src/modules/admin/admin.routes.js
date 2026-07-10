// Defines admin-only API endpoints and protects them with role middleware.
const express = require('express');
const adminController = require('./admin.controller');
const { requireAuth } = require('../../middleware/auth.middleware');
const { requireRole } = require('../../middleware/role.middleware');

const router = express.Router();

router.get('/dashboard', requireAuth, requireRole('ADMIN'), adminController.getDashboardSummary);

module.exports = router;

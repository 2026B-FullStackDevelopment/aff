// Defines user API endpoints and keeps routing separate from user business logic.
const express = require('express');
const userController = require('./user.controller');
const { requireAuth } = require('../../middleware/auth.middleware');

const router = express.Router();

router.get('/me', requireAuth, userController.getMyProfile);
router.get('/:id', requireAuth, userController.getUserById);

module.exports = router;

// Defines user API endpoints and keeps routing separate from user business logic.
import express from 'express';
import * as userController from './user.controller.js';
import { requireAuth } from '../../middleware/auth.middleware.js';

const router = express.Router();

router.get('/me', requireAuth, userController.getMyProfile);
router.get('/:id', requireAuth, userController.getUserById);

export default router;

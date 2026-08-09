// Defines user API endpoints and keeps routing separate from user business logic.
// Matches docs/api_design.md §5.
import express from 'express';
import * as userController from './user.controller.js';
import { requireAuth } from '../../middleware/auth.middleware.js';

const router = express.Router();

router.get('/me', requireAuth, userController.getMyProfile);
router.patch('/me', requireAuth, userController.updateMyProfile);
router.post('/me/avatar', requireAuth, userController.uploadAvatar);

export default router;

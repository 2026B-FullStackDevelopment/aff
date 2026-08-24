// Defines user API endpoints and keeps routing separate from user business logic.
// Matches docs/api_design.md §5.
import express from 'express';
import * as userController from './user.controller.js';
import { requireAuth } from '../../middleware/auth.middleware.js';
import { requireRole } from '../../middleware/role.middleware.js';

const router = express.Router();

// protected route, only for login donor to searc recipients to donate
router.get('/recipients/search', requireAuth, requireRole('DONOR'), userController.searchRecipients,);
router.get('/me', requireAuth, userController.getMyProfile);
router.patch('/me', requireAuth, userController.updateMyProfile);
router.patch('/me/password', requireAuth, userController.changePassword);
router.patch('/me/email', requireAuth, userController.changeEmail);

export default router;

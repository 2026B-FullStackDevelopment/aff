// Defines notification API endpoints and connects them to notification controller functions.
// Matches docs/api_design.md §14. Any authenticated role — ownership is implicit via req.user.id.
import express from 'express';
import * as notificationController from './notification.controller.js';
import { requireAuth } from '../../middleware/auth.middleware.js';

const router = express.Router();

router.get('/', requireAuth, notificationController.listMyNotifications);

export default router;

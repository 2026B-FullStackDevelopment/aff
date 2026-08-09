// Defines authentication API endpoints and connects them to auth controller functions.
// Matches docs/api_design.md §4.
import express from 'express';
import * as authController from './auth.controller.js';
import { requireAuth } from '../../middleware/auth.middleware.js';

const router = express.Router();

router.post('/register/recipient', authController.registerRecipient);
router.post('/register/donor', authController.registerDonor);
router.post('/login', authController.login);
router.post('/logout', requireAuth, authController.logout);

export default router;

// Defines authentication API endpoints and connects them to auth controller functions.
import express from 'express';
import * as authController from './auth.controller.js';

const router = express.Router();

router.post('/register', authController.register);
router.post('/login', authController.login);

export default router;

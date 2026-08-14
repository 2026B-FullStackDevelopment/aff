// Defines media API endpoints and connects them to media controller functions.
// Matches docs/api_design.md §5A.
import express from 'express';
import * as mediaController from './media.controller.js';
import { requireAuth } from '../../middleware/auth.middleware.js';

const router = express.Router();

router.post('/upload-url', requireAuth, mediaController.createUploadUrl);

export default router;

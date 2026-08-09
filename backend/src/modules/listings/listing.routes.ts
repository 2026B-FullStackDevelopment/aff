// Defines listing API endpoints and connects them to listing controller functions.
import express from 'express';
import * as listingController from './listing.controller.js';
import { requireAuth } from '../../middleware/auth.middleware.js';
import { requireRole } from '../../middleware/role.middleware.js';

const router = express.Router();

router.get('/', listingController.listAvailableListings);
router.post('/', requireAuth, requireRole('DONOR'), listingController.createListing);

export default router;

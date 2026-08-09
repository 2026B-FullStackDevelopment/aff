// Defines listing API endpoints and connects them to listing controller functions.
// Matches docs/api_design.md §6.
import express from 'express';
import * as listingController from './listing.controller.js';
import { requireAuth } from '../../middleware/auth.middleware.js';
import { requireRole } from '../../middleware/role.middleware.js';

const router = express.Router();

router.post('/', requireAuth, requireRole('DONOR'), listingController.createListing);
router.get('/mine', requireAuth, requireRole('DONOR'), listingController.listMyListings);
router.post('/:id/clone', requireAuth, requireRole('DONOR'), listingController.cloneListing);
router.patch('/:id/status', requireAuth, requireRole('DONOR'), listingController.updateListingStatus);
router.get('/:id/orders', requireAuth, requireRole('DONOR'), listingController.listListingOrders);
router.post('/:id/donations', requireAuth, requireRole('DONOR'), listingController.createDonorInitiatedDonation);
router.post('/:id/reserve', requireAuth, requireRole('RECIPIENT'), listingController.reserveListing);
router.get('/', listingController.listAvailableListings);
router.get('/:id', listingController.getListingById);

export default router;

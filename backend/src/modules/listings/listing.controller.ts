// Handles listing HTTP requests and returns listing DTOs.
import * as listingService from './listing.service.js';
import { toListingDto } from './listing.dto.js';
import { created, ok } from '../../shared/http/response.js';

async function listAvailableListings(req, res, next) {
  try {
    const listings = await listingService.listAvailableListings(req.query);
    return ok(res, listings.map(toListingDto));
  } catch (error) {
    return next(error);
  }
}

async function createListing(req, res, next) {
  try {
    const listing = await listingService.createListing(req.user.id, req.body);
    return created(res, toListingDto(listing));
  } catch (error) {
    return next(error);
  }
}

export { listAvailableListings, createListing };

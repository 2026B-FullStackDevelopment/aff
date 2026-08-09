// Handles listing HTTP requests and returns listing DTOs.
import * as listingService from './listing.service.js';
import { toListingDto } from './listing.dto.js';
import { created, ok, notImplemented } from '../../shared/http/response.js';

async function listAvailableListings(req, res, next) {
  try {
    const listings = await listingService.listAvailableListings(req.query);
    return ok(res, listings.map(toListingDto));
  } catch (error) {
    return next(error);
  }
}

async function getListingById(req, res, next) {
  try {
    const listing = await listingService.getListingById(req.params.id);
    return ok(res, toListingDto(listing));
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

// The following need the listing schema rebuild (category/unit/price rule, rationLimitPerPerson, etc.)
// and the Delivery module before they can be implemented — see docs/api_design.md §6 and docs/blockers.md.
async function listMyListings(_req, res) {
  return notImplemented(res);
}

async function cloneListing(_req, res) {
  return notImplemented(res);
}

async function updateListingStatus(_req, res) {
  return notImplemented(res);
}

async function listListingOrders(_req, res) {
  return notImplemented(res);
}

async function createDonorInitiatedDonation(_req, res) {
  return notImplemented(res);
}

async function reserveListing(_req, res) {
  return notImplemented(res);
}

export {
  listAvailableListings,
  getListingById,
  createListing,
  listMyListings,
  cloneListing,
  updateListingStatus,
  listListingOrders,
  createDonorInitiatedDonation,
  reserveListing,
};

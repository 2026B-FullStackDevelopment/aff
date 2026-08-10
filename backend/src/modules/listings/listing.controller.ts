// Handles listing HTTP requests and returns listing DTOs.
import type { Request, Response, NextFunction } from 'express';
import * as listingService from './listing.service.js';
import { toListingResponseDto } from './listing.dto.js';
import { created, ok, notImplemented } from '../../shared/http/response.js';

async function listAvailableListings(req: Request, res: Response, next: NextFunction) {
  try {
    const listings = await listingService.listAvailableListings(req.query);
    return ok(res, listings.map(toListingResponseDto));
  } catch (error) {
    return next(error);
  }
}

async function getListingById(req: Request, res: Response, next: NextFunction) {
  try {
    const listing = await listingService.getListingById(String(req.params.id));
    return ok(res, toListingResponseDto(listing));
  } catch (error) {
    return next(error);
  }
}

async function createListing(req: Request, res: Response, next: NextFunction) {
  try {
    const listing = await listingService.createListing(req.user!.id, req.body);
    return created(res, toListingResponseDto(listing));
  } catch (error) {
    return next(error);
  }
}

// The following need the Delivery module and Stripe integration before they can be implemented
// — see docs/api_design.md §6 and docs/blockers.md.
async function listMyListings(_req: Request, res: Response) {
  return notImplemented(res);
}

async function cloneListing(_req: Request, res: Response) {
  return notImplemented(res);
}

async function updateListingStatus(_req: Request, res: Response) {
  return notImplemented(res);
}

async function listListingOrders(_req: Request, res: Response) {
  return notImplemented(res);
}

async function createDonorInitiatedDonation(_req: Request, res: Response) {
  return notImplemented(res);
}

async function reserveListing(_req: Request, res: Response) {
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

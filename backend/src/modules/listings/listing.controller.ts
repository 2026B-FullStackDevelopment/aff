// Handles listing HTTP requests and returns listing DTOs.
import type { Request, Response, NextFunction } from 'express';
import * as listingQueryService from './listing.query.service.js';
import * as listingCommandService from './listing.command.service.js';
import * as listingDonationService from './listing.donation.service.js';
import * as listingReservationService from './listing.reservation.service.js';
import {
  toListingResponseDto,
  toListingDetailResponseDto,
  toListingWithStatsResponseDto,
  toListingOrderResponseDto,
} from './listing.dto.js';
import { created, ok, paginated } from '../../shared/http/response.js';
import { parseBody } from '../../shared/validation/parse-body.js'; // parseBody takes a zod schema describing valid data. Returns validated data or throw error
import { listingIdParamsSchema } from './listing.shared.schemas.js';
import {
  createListingSchema,
  updateListingStatusSchema,
} from './listing.command.schemas.js';
import {
  mineListingsQuerySchema,
  listingsQuerySchema,
  listingOrdersQuerySchema,
} from './listing.query.schemas.js';
import { donorInitiatedDonationSchema } from './listing.donation.schemas.js';
import { reserveListingSchema } from './listing.reservation.schemas.js';
import { toOrderResponseDto } from '../orders/order.dto.js';

async function listAvailableListings(req: Request, res: Response, next: NextFunction) {
  try {
    const query = parseBody(listingsQuerySchema, req.query);
    const result = await listingQueryService.listAvailableListings(query);

    return paginated(
      res,
      result.items.map(toListingResponseDto),
      result.page,
      result.limit,
      result.total,
    );
  } catch (error) {
    return next(error);
  }
}

async function getListingById(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = parseBody(listingIdParamsSchema, req.params);
    const listing = await listingQueryService.getListingById(id);
    return ok(res, toListingDetailResponseDto(listing));
  } catch (error) {
    return next(error);
  }
}

async function createListing(req: Request, res: Response, next: NextFunction) {
  try {
    // validate and sanitize client request body
    const payload = parseBody(createListingSchema, req.body);
    const listing = await listingCommandService.createListing(req.user!.id, payload);
    // created() is a shared response helper for sending successful HTTP
    // defined in backend/src/shared/http/response.ts
    return created(res, toListingResponseDto(listing));
  } catch (error) {
    return next(error);
  }
}

async function listMyListings(req: Request, res: Response, next: NextFunction) {
  try {
    const query = parseBody(mineListingsQuerySchema, req.query);
    const result = await listingQueryService.listMyListings(req.user!.id, query);

    return paginated(
      res,
      result.items.map(toListingWithStatsResponseDto),
      result.page,
      result.limit,
      result.total,
    );
  } catch (error) {
    return next(error);
  }
}

async function cloneListing(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = parseBody(listingIdParamsSchema, req.params);
    const listing = await listingCommandService.cloneListing(id, req.user!.id);
    return created(res, toListingResponseDto(listing));
  } catch (error) {
    return next(error);
  }
}

async function updateListingStatus(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = parseBody(listingIdParamsSchema, req.params);
    const { status } = parseBody(updateListingStatusSchema, req.body);
    const result = await listingCommandService.updateListingStatus(
      id,
      req.user!.id,
      status,
    );

    return ok(res, {
      listing: toListingResponseDto(result.listing),
      cancelledOrderCount: result.cancelledOrderCount,
      refundOutcomes: result.refundOutcomes,
    });
  } catch (error) {
    return next(error);
  }
}

async function listListingOrders(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = parseBody(listingIdParamsSchema, req.params);
    const query = parseBody(listingOrdersQuerySchema, req.query);
    const result = await listingDonationService.listListingOrders(
      id,
      req.user!.id,
      query,
    );

    return paginated(
      res,
      result.items.map(toListingOrderResponseDto),
      result.page,
      result.limit,
      result.total,
    );
  } catch (error) {
    return next(error);
  }
}

// Validate listing ID from the URL, validate the submitted donation data
// Convert the created order into a safe response DTO, returned HTTP 201 created
// req - from client to backend & res - backend to client express objects
// Express requests passed thru multiple functions. Next > this is done, to next function
// async, try, catch
async function createDonorInitiatedDonation(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const { id } = parseBody(listingIdParamsSchema, req.params); // validate listing :id of listing routes
    const payload = parseBody(donorInitiatedDonationSchema, req.body);
    if (!payload.recipientEmail) {
      const error = new Error('Recipient email is required.');
      error.statusCode = 400;
      throw error;
    }

    const order = await listingDonationService.createDonorInitiatedDonation(
      id,
      req.user!.id,
      { ...payload, recipientEmail: payload.recipientEmail },
    ); // user! is to get only non-null
    // created() HTTP 201 response
    // DTO mapping function, taking the order and returns only needed fields
    return created(res, toOrderResponseDto(order));
  } catch (error) {
    return next(error);
  }
}

async function reserveListing(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = parseBody(listingIdParamsSchema, req.params);
    const payload = parseBody(reserveListingSchema, req.body);
    const order = await listingReservationService.reserveListing(
      id,
      req.user!.id,
      payload,
    );
    return created(res, toOrderResponseDto(order));
  } catch (error) {
    return next(error);
  }
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

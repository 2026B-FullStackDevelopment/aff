// Contains listing business rules and calls the listing repository for database work.
import * as listingRepository from './listing.repository.js';
import { userInterface } from '../users/user.interface.js';
import { orderInterface } from '../orders/order.interface.js';
import { deliveryInterface } from '../delivery/delivery.interface.js';
import type { ClientSession } from 'mongoose';
import type {
  MeasurementUnit,
  FoodCategory,
  ListingDocument,
  ListingStatus,
} from './listing.model.js';
import type {
  ListingDonorData,
  ListingDtoSource,
  ListingWithStatsDtoSource,
  ListingOrderDtoSource,
  UpdateListingStatusRequestDto,
} from './listing.dto.js';

import type {
  MineListingsQuery,
  ListingOrdersQuery,
} from './listing.schemas.js';

interface CreateListingPayload {
  name: string;
  description?: string;
  imageUrl?: string;
  unit: MeasurementUnit;
  category: FoodCategory;
  isVegetarian: boolean;
  price: number;
  donationLimit: number;
  rationLimitPerPerson?: number;
}

// Paginated result from Listing service
interface MyListingsServiceResult {
  items: ListingWithStatsDtoSource[];
  page: number;
  limit: number;
  total: number;
}

interface UpdateListingStatusServiceResult {
  listing: ListingDtoSource;
  cancelledOrderCount: number;
}

interface ListingOrdersServiceResult {
  items: ListingOrderDtoSource[];
  page: number;
  limit: number;
  total: number;
}

type RequestedListingStatus = UpdateListingStatusRequestDto['status'];

function createHttpError(statusCode: number, message: string): Error {
  const error: Error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

function assertStatusUpdated(
  listing: ListingDocument | null,
): ListingDocument {
  if (!listing) {
    throw createHttpError(
      409,
      'The listing status changed before this request completed.',
    );
  }

  return listing;
}

async function getListingDonorData(
  donorId: string,
): Promise<ListingDonorData> {
  const [user, donorProfile] = await Promise.all([
    userInterface.getUserById(donorId),
    userInterface.getDonorByUserId(donorId),
  ]);

  if (!user.city) {
    const error: Error = new Error('Donor city is missing.');
    error.statusCode = 500;
    throw error;
  }

  return {
    id: String(user._id),
    companyName: donorProfile.companyName,
    city: user.city,
    addressText: donorProfile.addressText,
    location: donorProfile.location,
  };
}

async function enrichListing(
  listing: ListingDocument,
): Promise<ListingDtoSource> {
  return {
    listing,
    donor: await getListingDonorData(String(listing.donorId)),
  };
}

async function requireOwnedListing(
  listingId: string,
  donorId: string,
  session?: ClientSession,
): Promise<ListingDocument> {
  const listing = await listingRepository.findListingById(listingId, session);

  if (!listing) {
    throw createHttpError(404, 'Listing not found.');
  }

  if (String(listing.donorId) !== donorId) {
    throw createHttpError(403, 'You do not own this listing.');
  }

  return listing;
}

function assertValidStatusTransition(
  currentStatus: ListingStatus,
  nextStatus: RequestedListingStatus,
): void {
  const allowedTransitions: Record<
    ListingStatus,
    readonly RequestedListingStatus[]
  > = {
    ACTIVE: ['PAUSED', 'CANCELLED'],
    PAUSED: ['ACTIVE', 'CANCELLED'],
    CANCELLED: [],
    SOLD_OUT: [],
  };

  if (!allowedTransitions[currentStatus].includes(nextStatus)) {
    throw createHttpError(
      409,
      `Cannot change listing status from ${currentStatus} to ${nextStatus}.`,
    );
  }
}

async function listMyListings(
  donorId: string,
  query: MineListingsQuery,
): Promise<MyListingsServiceResult> {
  const result = await listingRepository.findMyListingsWithStats(donorId, query);

  if (result.items.length === 0) {
    return {
      items: [],
      page: result.page,
      limit: result.limit,
      total: result.total,
    };
  }

  // The repository has already scoped every item to this Donor, so their
  // profile only needs to be fetched once for the whole page.
  const donor = await getListingDonorData(donorId);

  return {
    items: result.items.map((item) => {
      const { donatedQuantity, revenue, ...listing } = item;

      return {
        listing: listing as ListingDocument,
        donor,
        donatedQuantity,
        revenue,
      };
    }),
    page: result.page,
    limit: result.limit,
    total: result.total,
  };
}

async function listAvailableListings(
  filters: Record<string, unknown> = {},
): Promise<ListingDtoSource[]> {
  const listings = await listingRepository.findAvailableListings(filters);
  return Promise.all(listings.map(enrichListing));
}

async function createListing(
  donorId: string,
  payload: CreateListingPayload,
): Promise<ListingDtoSource> {
  const donor = await getListingDonorData(donorId);

  const listing = await listingRepository.createListing({
    donorId,
    name: payload.name,
    description: payload.description,
    imageUrl: payload.imageUrl,
    unit: payload.unit,
    category: payload.category,
    isVegetarian: payload.isVegetarian,
    price: payload.price,
    city: donor.city,
    donationLimit: payload.donationLimit,
    rationLimitPerPerson: payload.rationLimitPerPerson,
    quantityRemaining: payload.donationLimit,
  });

  return { listing, donor };
}

async function getListingById(
  id: string,
): Promise<ListingDtoSource | null> {
  const listing = await listingRepository.findListingById(id);

  if (!listing) {
    return null;
  }

  return enrichListing(listing);
}

async function cloneListing(
  listingId: string,
  donorId: string,
): Promise<ListingDtoSource> {
  const source = await requireOwnedListing(listingId, donorId);
  const donor = await getListingDonorData(donorId);

  const cloned = await listingRepository.createListing({
    donorId,
    name: source.name,
    description: source.description,
    imageUrl: source.imageUrl,
    unit: source.unit,
    category: source.category,
    isVegetarian: source.isVegetarian,
    price: source.price,
    city: donor.city,
    status: 'ACTIVE',
    donationLimit: source.donationLimit,
    rationLimitPerPerson: source.rationLimitPerPerson,
    quantityRemaining: source.donationLimit,
  });

  return { listing: cloned, donor };
}

async function updateListingStatus(
  listingId: string,
  donorId: string,
  nextStatus: RequestedListingStatus,
): Promise<UpdateListingStatusServiceResult> {
  let updatedListing: ListingDocument;
  let cancelledOrderCount = 0;

  if (nextStatus === 'CANCELLED') {
    const transactionResult = await listingRepository.withTransaction(
      async (session) => {
        const current = await requireOwnedListing(listingId, donorId, session);
        assertValidStatusTransition(current.status, nextStatus);

        const candidateOrderIds =
          await orderInterface.findNonCancelledOrderIdsByListing(
            listingId,
            session,
          );
        const protectedOrderIds = await deliveryInterface.findProtectedOrderIds(
          candidateOrderIds,
          session,
        );
        const protectedOrderIdSet = new Set(protectedOrderIds);
        const cancellableOrderIds = candidateOrderIds.filter(
          (orderId) => !protectedOrderIdSet.has(orderId),
        );
        const cancelledAt = new Date();

        await deliveryInterface.cancelAwaitingDeliveriesByOrderIds(
          cancellableOrderIds,
          cancelledAt,
          session,
        );

        const cancelledCount = await orderInterface.cancelOrdersByIds(
          cancellableOrderIds,
          donorId,
          cancelledAt,
          session,
        );

        const listing = assertStatusUpdated(
          await listingRepository.updateListingStatusIfCurrent(
            listingId,
            donorId,
            current.status,
            nextStatus,
            { session, closedAt: cancelledAt },
          ),
        );

        return { listing, cancelledOrderCount: cancelledCount };
      },
    );

    updatedListing = transactionResult.listing;
    cancelledOrderCount = transactionResult.cancelledOrderCount;
  } else {
    const current = await requireOwnedListing(listingId, donorId);
    assertValidStatusTransition(current.status, nextStatus);

    updatedListing = assertStatusUpdated(
      await listingRepository.updateListingStatusIfCurrent(
        listingId,
        donorId,
        current.status,
        nextStatus,
      ),
    );
  }

  return {
    listing: {
      listing: updatedListing,
      donor: await getListingDonorData(donorId),
    },
    cancelledOrderCount,
  };
}

async function listListingOrders(
  listingId: string,
  donorId: string,
  query: ListingOrdersQuery,
): Promise<ListingOrdersServiceResult> {
  const listing = await requireOwnedListing(listingId, donorId);

  if (listing.unit === 'PER_REQUEST') {
    return {
      items: [],
      page: query.page,
      limit: query.limit,
      total: 0,
    };
  }

  const result = await orderInterface.listOrdersForListing(
    listingId,
    query.page,
    query.limit,
  );

  return {
    items: result.items.map((item) => ({
      order: item.order,
      recipient: item.recipient,
      listing: {
        id: String(listing._id),
        name: listing.name,
        imageUrl: listing.imageUrl,
        unit: listing.unit,
      },
    })),
    page: result.page,
    limit: result.limit,
    total: result.total,
  };
}

export {
  listMyListings,
  listAvailableListings,
  createListing,
  getListingById,
  cloneListing,
  updateListingStatus,
  listListingOrders,
};

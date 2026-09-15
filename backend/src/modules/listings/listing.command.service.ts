// Contains Listing creation, cloning, and lifecycle command workflows.
import { orderInterface } from '../orders/order.interface.js';
import { deliveryInterface } from '../delivery/delivery.interface.js';
import * as listingCommandRepository from './listing.command.repository.js';
import * as listingTransactionRepository from './listing.transaction.repository.js';
import { getListingDonorData, requireOwnedListing } from './listing.access.service.js';
import { createHttpError } from './listing.service.errors.js';
import type { ListingDocument, ListingStatus } from './listing.model.js';
import type { ListingDtoSource, UpdateListingStatusRequestDto } from './listing.dto.js';
import type { CreateListingPayload } from './listing.command.schemas.js';

interface UpdateListingStatusServiceResult {
  listing: ListingDtoSource;
  cancelledOrderCount: number;
}

type RequestedListingStatus = UpdateListingStatusRequestDto['status'];

function assertStatusUpdated(listing: ListingDocument | null): ListingDocument {
  if (!listing) {
    throw createHttpError(409, 'The listing status changed before this request completed.');
  }

  return listing;
}

function assertValidStatusTransition(
  currentStatus: ListingStatus,
  nextStatus: RequestedListingStatus,
): void {
  const allowedTransitions: Record<ListingStatus, readonly RequestedListingStatus[]> = {
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

async function createListing(
  donorId: string,
  payload: CreateListingPayload,
): Promise<ListingDtoSource> {
  const donor = await getListingDonorData(donorId);
  const listing = await listingCommandRepository.createListing({
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

async function cloneListing(
  listingId: string,
  donorId: string,
): Promise<ListingDtoSource> {
  const source = await requireOwnedListing(listingId, donorId);
  const donor = await getListingDonorData(donorId);
  const cloned = await listingCommandRepository.createListing({
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
    const transactionResult = await listingTransactionRepository.withTransaction(
      async (session) => {
        const current = await requireOwnedListing(listingId, donorId, session);
        assertValidStatusTransition(current.status, nextStatus);

        const candidateOrderIds = await orderInterface.findNonCancelledOrderIdsByListing(
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
          await listingCommandRepository.updateListingStatusIfCurrent(
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
      await listingCommandRepository.updateListingStatusIfCurrent(
        listingId,
        donorId,
        current.status,
        nextStatus,
      ),
    );
  }

  return {
    listing: { listing: updatedListing, donor: await getListingDonorData(donorId) },
    cancelledOrderCount,
  };
}

export { createListing, cloneListing, updateListingStatus };

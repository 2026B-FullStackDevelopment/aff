// Contains Listing creation, cloning, and lifecycle command workflows.
import { orderInterface } from '../orders/order.interface.js';
import { deliveryInterface } from '../delivery/delivery.interface.js';
import { notificationInterface } from '../notifications/notification.interface.js';
import * as listingCommandRepository from './listing.command.repository.js';
import * as listingQueryRepository from './listing.query.repository.js';
import * as listingTransactionRepository from './listing.transaction.repository.js';
import { getListingDonorData, requireOwnedListing } from './listing.access.service.js';
import { createHttpError } from './listing.service.errors.js';
import type { ListingDocument, ListingStatus } from './listing.types.js';
import type { ListingDtoSource } from './listing.response.dto.js';
import type { CreateListingPayload } from './listing.schemas.js';
import type { RequestedListingStatus, UpdateListingStatusServiceResult } from './listing.command.types.js';

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
  if (nextStatus === 'CANCELLED') {
    return cancelListingAndOrders(listingId, donorId, donorId);
  }

  const current = await requireOwnedListing(listingId, donorId);
  assertValidStatusTransition(current.status, nextStatus);
  const updatedListing = assertStatusUpdated(
    await listingCommandRepository.updateListingStatusIfCurrent(
      listingId,
      donorId,
      current.status,
      nextStatus,
    ),
  );

  return {
    listing: { listing: updatedListing, donor: await getListingDonorData(donorId) },
    cancelledOrderCount: 0,
    refundOutcomes: [],
  };
}

/**
 * Runs the shared Donor/Admin cancellation cascade. Protected orders remain
 * untouched; cancellable orders and awaiting deliveries are closed together.
 */
async function cancelListingAndOrders(
  listingId: string,
  actorId: string,
  ownerDonorId?: string,
): Promise<UpdateListingStatusServiceResult> {
  const transactionResult = await listingTransactionRepository.withTransaction(
    async (session) => {
      const current = ownerDonorId
        ? await requireOwnedListing(listingId, ownerDonorId, session)
        : await listingQueryRepository.findListingById(listingId, session);

      if (!current) throw createHttpError(404, 'Listing not found.');
      assertValidStatusTransition(current.status, 'CANCELLED');

      const candidateOrderIds = await orderInterface.findNonCancelledOrderIdsByListing(
        listingId,
        session,
      );
      const protectedOrderIds = new Set(
        await deliveryInterface.findProtectedOrderIds(candidateOrderIds, session),
      );
      const cancellableOrderIds = candidateOrderIds.filter(
        (orderId) => !protectedOrderIds.has(orderId),
      );
      const cancellableOrders = await orderInterface.findOrdersByIds(
        cancellableOrderIds,
        session,
      );
      const cancelledAt = new Date();

      await deliveryInterface.cancelAwaitingDeliveriesByOrderIds(
        cancellableOrderIds,
        cancelledAt,
        session,
      );
      const cancellation = await orderInterface.cancelOrdersForListingCancellation(
        cancellableOrderIds,
        actorId,
        cancelledAt,
        session,
      );
      const listing = assertStatusUpdated(
        await listingCommandRepository.updateListingStatusIfCurrent(
          listingId,
          current.donorId,
          current.status,
          'CANCELLED',
          { session, closedAt: cancelledAt },
        ),
      );

      return {
        listing,
        cancellableOrders,
        cancelledOrderCount: cancellation.cancelledCount,
        refundableOrderIds: cancellation.refundableOrderIds,
      };
    },
  );

  // Stripe is external, so refunds and notifications run only after the
  // MongoDB transaction commits. Notification failures never fail the action.
  const refundOutcomes = transactionResult.refundableOrderIds.length
    ? await orderInterface.refundCancelledOrders(transactionResult.refundableOrderIds)
    : [];

  for (const order of transactionResult.cancellableOrders) {
    void notificationInterface.sendNotification({
      userId: String(order.recipientId),
      type: 'ADMIN_CANCEL',
      orderId: String(order._id),
      listingId,
      payload: {
        orderId: String(order._id),
        listingName: transactionResult.listing.name,
      },
    });
  }

  return {
    listing: {
      listing: transactionResult.listing,
      donor: await getListingDonorData(String(transactionResult.listing.donorId)),
    },
    cancelledOrderCount: transactionResult.cancelledOrderCount,
    refundOutcomes,
  };
}

/** Cancels any active or paused Listing on behalf of an Admin. */
async function cancelListingAsAdmin(
  listingId: string,
  adminId: string,
): Promise<UpdateListingStatusServiceResult> {
  return cancelListingAndOrders(listingId, adminId);
}

export { createListing, cloneListing, updateListingStatus, cancelListingAsAdmin };

// Contains Donor-facing Listing order history and manual-donation workflows.
import { userInterface } from '../users/user.interface.js';
import { orderInterface } from '../orders/order.interface.js';
import { notificationInterface } from '../notifications/notification.interface.js';
import * as listingStockRepository from './listing.stock.repository.js';
import * as listingTransactionRepository from './listing.transaction.repository.js';
import { requireOwnedListing } from './listing.access.service.js';
import { createHttpError } from './listing.service.errors.js';
import type {
  CreateDonorInitiatedDonationRequestDto,
  ListingOrderDtoSource,
} from './listing.dto.js';
import type { ListingOrdersQuery } from './listing.query.schemas.js';

interface ListingOrdersServiceResult {
  items: ListingOrderDtoSource[];
  page: number;
  limit: number;
  total: number;
}

async function listListingOrders(
  listingId: string,
  donorId: string,
  query: ListingOrdersQuery,
): Promise<ListingOrdersServiceResult> {
  const listing = await requireOwnedListing(listingId, donorId);

  if (listing.unit === 'PER_REQUEST') {
    return { items: [], page: query.page, limit: query.limit, total: 0 };
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
        category: listing.category,
      },
    })),
    page: result.page,
    limit: result.limit,
    total: result.total,
  };
}

/** Records a completed in-person Order without creating a Delivery. */
async function createDonorInitiatedDonation(
  listingId: string,
  donorId: string,
  payload: CreateDonorInitiatedDonationRequestDto,
) {
  const recipient = await userInterface.findUserByEmail(payload.recipientEmail);

  if (!recipient) {
    throw createHttpError(404, 'Recipient email was not found.');
  }

  if (recipient.role !== 'RECIPIENT' || recipient.status !== 'ACTIVE') {
    throw createHttpError(422, 'The selected account is not an active Recipient.');
  }

  const result = await listingTransactionRepository.withTransaction(
    async (session) => {
      const listing = await requireOwnedListing(listingId, donorId, session);

      if (listing.status !== 'ACTIVE') {
        throw createHttpError(422, 'The listing is not active.');
      }

      if (listing.unit === 'PER_REQUEST') {
        throw createHttpError(422, 'PER_REQUEST listings do not create Orders.');
      }

      if (
        await orderInterface.hasNonCancelledOrderForListing(
          String(listing._id),
          String(recipient._id),
          session,
        )
      ) {
        throw createHttpError(
          422,
          'This Recipient already has an order for this listing.',
        );
      }

      if (
        listing.rationLimitPerPerson != null &&
        payload.quantity > listing.rationLimitPerPerson
      ) {
        throw createHttpError(422, 'Quantity exceeds the ration limit.');
      }

      if (payload.quantity > listing.quantityRemaining) {
        throw createHttpError(422, 'Quantity exceeds the remaining stock.');
      }

      const isFree = listing.price === 0;
      const updatedListing = await listingStockRepository.decrementStockAtomically(
        listingId,
        donorId,
        payload.quantity,
        session,
      );

      if (!updatedListing) {
        throw createHttpError(422, 'The requested stock is no longer available.');
      }

      const order = await orderInterface.createOrder(
        {
          recipientId: recipient._id,
          listingId: listing._id,
          intakePath: 'DONOR_INITIATED',
          quantity: payload.quantity,
          amount: listing.price * payload.quantity,
          paymentMethod: isFree ? undefined : 'CASH',
          paymentStatus: isFree ? 'FREE' : 'PAID',
          orderStatus: 'DELIVERED',
        },
        session,
      );

      return {
        order,
        listingName: listing.name,
        becameSoldOut: updatedListing.status === 'SOLD_OUT',
      };
    },
  );

  if (result.becameSoldOut) {
    void notificationInterface.sendNotification({
      userId: donorId,
      type: 'SOLD_OUT',
      listingId,
      payload: { listingId, name: result.listingName },
    });
  }

  return result.order;
}

export { listListingOrders, createDonorInitiatedDonation };

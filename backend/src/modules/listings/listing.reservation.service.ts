// Contains Recipient reservation workflows for Listings.
import { orderInterface } from '../orders/order.interface.js';
import { deliveryInterface } from '../delivery/delivery.interface.js';
import { notificationInterface } from '../notifications/notification.interface.js';
import { emitToUser } from '../../realtime/socket.js';
import * as listingQueryRepository from './listing.query.repository.js';
import * as listingStockRepository from './listing.stock.repository.js';
import * as listingTransactionRepository from './listing.transaction.repository.js';
import { createHttpError } from './listing.service.errors.js';
import type { ReserveListingRequestDto } from './listing.dto.js';

/** Creates a Recipient-initiated Order and its eligible Delivery atomically. */
async function reserveListing(
  listingId: string,
  recipientId: string,
  payload: ReserveListingRequestDto,
) {
  const listing = await listingQueryRepository.findListingById(listingId);

  if (!listing || listing.status !== 'ACTIVE' || listing.unit === 'PER_REQUEST') {
    throw createHttpError(422, 'This listing is not available to reserve.');
  }

  if (listing.price > 0 && !payload.paymentMethod) {
    throw createHttpError(400, 'A payment method is required for a priced listing.');
  }

  if (await orderInterface.hasNonCancelledOrderForListing(listingId, recipientId)) {
    throw createHttpError(422, 'You already have an order for this listing.');
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

  const result = await listingTransactionRepository.withTransaction(async (session) => {
    const updatedListing = await listingStockRepository.decrementStockForReserveAtomically(
      listingId,
      payload.quantity,
      session,
    );

    if (!updatedListing) {
      throw createHttpError(422, 'The requested stock is no longer available.');
    }

    const isFree = listing.price === 0;
    const paymentMethod = payload.paymentMethod;
    const paymentStatus = isFree ? 'FREE' : 'PAYMENT_PENDING';
    const orderStatus =
      !isFree && paymentMethod === 'STRIPE' ? 'PENDING_PAYMENT' : 'PREPARING';

    const order = await orderInterface.createOrder(
      {
        recipientId,
        listingId: listing._id,
        intakePath: 'RESERVATION',
        quantity: payload.quantity,
        amount: listing.price * payload.quantity,
        paymentMethod,
        paymentStatus,
        orderStatus,
        deliveryAddressText: payload.deliveryAddressText,
        deliveryLocation: { ...payload.deliveryLocation, updatedAt: new Date() },
      },
      session,
    );

    if (isFree || paymentMethod === 'CASH') {
      await deliveryInterface.createForOrder(String(order._id), session);
    }

    return {
      order,
      listingName: listing.name,
      donorId: String(listing.donorId),
      becameSoldOut: updatedListing.status === 'SOLD_OUT',
      isFree,
    };
  });

  if (result.becameSoldOut) {
    void notificationInterface.sendNotification({
      userId: result.donorId,
      type: 'SOLD_OUT',
      listingId,
      payload: { listingId, name: result.listingName },
    });
  }

  if (!result.isFree) {
    emitToUser(recipientId, 'notification:payment_requested', {
      orderId: String(result.order._id),
      listingName: result.listingName,
      amount: result.order.amount,
    });
  }

  return result.order;
}

export { reserveListing };

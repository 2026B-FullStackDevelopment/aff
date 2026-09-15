// Contains admin oversight business rules. See docs/api_design.md §11.
import { userInterface } from '../users/user.interface.js';
import { deliveryInterface } from '../delivery/delivery.interface.js';
import { orderInterface } from '../orders/order.interface.js';
import { listingInterface } from '../listings/listing.interface.js';
import { toListingResponseDto } from '../listings/listing.response.dto.js';
import {
  toCourierResponseDto,
  toAdminDeliveryResponseDto,
  toAdminListingResponseDto,
} from './admin.dto.js';
import type {
  CourierResponseDto,
  AdminCouriersResponseDto,
  AdminDeliveriesResponseDto,
  AdminUsersResponseDto,
  UpdateUserStatusRequestDto,
  AdminListingsResponseDto,
  CancelListingResponseDto,
} from './admin.dto.js';
import type {
  CreateCourierPayload,
  AdminCouriersQuery,
  AdminDeliveriesQuery,
  AdminUsersQuery,
  AdminListingsQuery,
} from './admin.schemas.js';

/** Collects the distinct, defined ids in `values`, preserving first-seen order. */
function distinctIds(values: Array<unknown>): string[] {
  const ids = new Set<string>();

  for (const value of values) {
    if (value) ids.add(String(value));
  }

  return [...ids];
}

/**
 * Creates a Courier account (E1). The `USER` and `COURIER` writes both happen
 * inside the users module, which owns those collections — this service only
 * translates the request into that call and shapes the response.
 *
 * @throws {Error} `409` if the email is already registered.
 */
async function createCourier(
  payload: CreateCourierPayload,
): Promise<CourierResponseDto> {
  const { user, courier } = await userInterface.createCourierAccount({
    username: payload.username,
    email: payload.email,
    // The Admin sets the Courier's first password by hand (E1); it is an
    // ordinary password from here on, with no forced-reset flow behind it.
    password: payload.tempPassword,
    fullName: payload.fullName,
  });

  return toCourierResponseDto(user, courier);
}

/** Reads one page of the Admin's Courier roster (E11). */
async function listCouriers(
  query: AdminCouriersQuery,
): Promise<AdminCouriersResponseDto> {
  const page = await userInterface.listCouriers(query);

  return {
    ...page,
    items: page.items.map((entry) => toCourierResponseDto(entry.user, entry.courier)),
  };
}

/**
 * Reads one filtered page of every account role for the Admin directory (G1).
 * Profile joins and role-specific DTO mapping stay inside the users module,
 * which owns the USER, RECIPIENT, DONOR, and COURIER collections.
 */
async function listUsers(query: AdminUsersQuery): Promise<AdminUsersResponseDto> {
  return userInterface.listUsersForAdmin(query);
}

/**
 * Applies the Admin's account-state decision through the users module, which
 * owns USER persistence and coordinates immediate revocation of the target
 * user's recorded sessions when the account is deactivated.
 */
async function updateUserStatus(userId: string, payload: UpdateUserStatusRequestDto) {
  return userInterface.updateAccountStatusForAdmin(userId, payload.status);
}

/**
 * Reads one page of the Admin's read-only Delivery table (E11).
 *
 * The Courier name and the Order's recipient live in other modules, so they
 * are fetched through those modules' interfaces rather than joined inside the
 * Delivery query — two bulk lookups per page, never one per row.
 *
 * There is deliberately no assign, reassign, or force-claim counterpart here:
 * Admin manual dispatch is an explicit scope boundary (E11).
 */
async function listDeliveries(
  query: AdminDeliveriesQuery,
): Promise<AdminDeliveriesResponseDto> {
  const page = await deliveryInterface.listForAdmin(query);

  if (page.items.length === 0) {
    return { ...page, items: [] };
  }

  const [courierProfiles, orders] = await Promise.all([
    userInterface.findCourierProfilesByUserIds(
      distinctIds(page.items.map((delivery) => delivery.courierId)),
    ),
    orderInterface.findOrdersByIds(
      distinctIds(page.items.map((delivery) => delivery.orderId)),
    ),
  ]);

  const courierByUserId = new Map(
    courierProfiles.map((profile) => [String(profile.userId), profile]),
  );
  const orderById = new Map(orders.map((order) => [String(order._id), order]));

  return {
    ...page,
    items: page.items.map((delivery) =>
      toAdminDeliveryResponseDto(delivery, {
        courier: delivery.courierId
          ? courierByUserId.get(String(delivery.courierId)) ?? null
          : null,
        order: orderById.get(String(delivery.orderId)) ?? null,
      }),
    ),
  };
}

/** Reads one page of Listings across every status for Admin oversight (G4). */
async function listListings(
  query: AdminListingsQuery,
): Promise<AdminListingsResponseDto> {
  const page = await listingInterface.listListingsForAdmin(query);

  return {
    ...page,
    items: page.items.map(toAdminListingResponseDto),
  };
}

/** Cancels a Listing through the Listings module's shared cascade (G3/G5). */
async function cancelListing(
  listingId: string,
  adminId: string,
): Promise<CancelListingResponseDto> {
  const result = await listingInterface.cancelListingAsAdmin(listingId, adminId);
  const listing = toListingResponseDto(result.listing);

  if (!listing) throw new Error('Cannot map a missing Listing.');

  return {
    listing,
    cancelledOrderCount: result.cancelledOrderCount,
    refundOutcomes: result.refundOutcomes,
  };
}

export {
  createCourier,
  listCouriers,
  listUsers,
  updateUserStatus,
  listDeliveries,
  listListings,
  cancelListing,
};

// Shapes admin data before sending it to the frontend. See docs/api_design.md §11.
import { toUserResponseDto } from '../users/user.dto.js';
import type { UserResponseDto } from '../users/user.dto.js';
import type { UserDocument } from '../users/user.model.js';
import type { CourierDocument } from '../users/courier.model.js';
import type { DeliveryDocument } from '../delivery/delivery.model.js';
import type { UpdateListingStatusResponseDto, ListingResponseDto } from '../listings/listing.dto.js';
import { toDeliveryResponseDto } from '../delivery/delivery.dto.js';
import type { DeliveryResponseDto } from '../delivery/delivery.dto.js';

/** A Courier account as the Admin sees it: the shared account fields plus the Courier's name. */
interface CourierResponseDto extends UserResponseDto {
  fullName: string;
}

interface AdminCouriersResponseDto {
  items: CourierResponseDto[];
  page: number;
  limit: number;
  total: number;
}

interface CreateCourierRequestDto {
  username: string;
  email: string;
  tempPassword: string;
  fullName: string;
}

interface AdminUsersResponseDto {
  items: UserResponseDto[];
  page: number;
  limit: number;
  total: number;
}

interface UpdateUserStatusRequestDto {
  status: 'ACTIVE' | 'DEACTIVATED';
}

interface AdminDeliveryResponseDto extends DeliveryResponseDto {
  courier: { id: string; fullName: string } | null;
  // `recipientId` is nullable only as a data-integrity fallback: every DELIVERY
  // is created from an ORDER, so it should never be null in practice. Degrading
  // one row beats failing the Admin's whole oversight table if an Order row
  // cannot be loaded.
  order: { id: string; recipientId: string | null };
}

/** The Order fields the Admin Delivery table needs, joined by the caller. */
interface AdminDeliveryOrderSummary {
  _id: unknown;
  recipientId: unknown;
}

interface AdminDeliveryRelations {
  courier: Pick<CourierDocument, 'fullName'> | null;
  order: AdminDeliveryOrderSummary | null;
}

/**
 * Maps a Courier's `USER` row plus its `COURIER` profile to the Admin roster
 * shape. Reuses `toUserResponseDto` so Couriers carry exactly the same
 * account-management fields as Recipients and Donors (E11).
 *
 * @param courier - The Courier profile, or `null` if the row is missing —
 *   the account is still listed, with an empty name, so a half-written
 *   account stays visible to the Admin.
 */
function toCourierResponseDto(
  user: UserDocument,
  courier: Pick<CourierDocument, 'fullName'> | null,
): CourierResponseDto {
  return {
    ...toUserResponseDto(user)!,
    fullName: courier?.fullName ?? '',
  };
}

/**
 * Maps a Delivery plus its joined Courier and Order to the Admin oversight
 * shape. `pickupAddressText`/`pickupAddressLocation` are left undefined: the
 * Admin table shows pipeline state, not navigation detail, so resolving each
 * row's Donor address would cost a lookup per row for data E11 never asks for.
 */
function toAdminDeliveryResponseDto(
  delivery: DeliveryDocument,
  relations: AdminDeliveryRelations,
): AdminDeliveryResponseDto {
  return {
    ...toDeliveryResponseDto(delivery, {
      pickupAddressText: undefined,
      pickupAddressLocation: undefined,
    })!,
    courier: delivery.courierId
      ? {
          id: String(delivery.courierId),
          fullName: relations.courier?.fullName ?? '',
        }
      : null,
    order: {
      id: String(delivery.orderId),
      recipientId: relations.order ? String(relations.order.recipientId) : null,
    },
  };
}

interface AdminDeliveriesResponseDto {
  items: AdminDeliveryResponseDto[];
  page: number;
  limit: number;
  total: number;
}

interface AdminListingsResponseDto {
  items: ListingResponseDto[];
  page: number;
  limit: number;
  total: number;
}

export { toCourierResponseDto, toAdminDeliveryResponseDto };
export type {
  CourierResponseDto,
  AdminCouriersResponseDto,
  AdminDeliveryRelations,
  CreateCourierRequestDto,
  AdminUsersResponseDto,
  UpdateUserStatusRequestDto,
  AdminDeliveryResponseDto,
  AdminDeliveriesResponseDto,
  AdminListingsResponseDto,
};
export type { UpdateListingStatusResponseDto as CancelListingResponseDto };

import type { UserResponseDto } from '../users/user.dto.js';
import type { UpdateListingStatusResponseDto, ListingResponseDto } from '../listings/listing.dto.js';
import type { DeliveryResponseDto } from '../delivery/delivery.dto.js';

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
  order: { id: string; recipientId: string };
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

export type {
  CreateCourierRequestDto,
  AdminUsersResponseDto,
  UpdateUserStatusRequestDto,
  AdminDeliveryResponseDto,
  AdminDeliveriesResponseDto,
  AdminListingsResponseDto,
};
export type { UpdateListingStatusResponseDto as CancelListingResponseDto };

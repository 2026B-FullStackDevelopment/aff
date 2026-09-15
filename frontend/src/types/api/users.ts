// User-related DTOs, role types, and profile update payloads.
// Corresponds to API Design §5 (Users Module) and §3 DTOs (UserDTO, RecipientDTO, DonorDTO, CourierDTO).

import type { GeoLocation } from './common';

export type UserRole = 'RECIPIENT' | 'DONOR' | 'ADMIN' | 'COURIER';

export interface UserDTO {
  id: string;
  role: UserRole;
  username: string;
  email: string;
  country: string;
  city: string;
  status: 'ACTIVE' | 'DEACTIVATED';
  avatarUrl: string | null;
  createdAt: string;
}

export interface RecipientDTO extends UserDTO {
  role: 'RECIPIENT';
  tier: 'STANDARD' | 'PREMIUM';
  hasStripeCard: boolean;
}

export interface DonorDTO extends UserDTO {
  role: 'DONOR';
  companyName: string;
  taxCode: string;
  addressText: string;
  location: GeoLocation;
}

export interface CourierDTO extends UserDTO {
  role: 'COURIER';
  fullName: string;
}

export interface AdminUserDTO extends UserDTO {
  role: 'ADMIN';
}

export type AnyUserDTO = RecipientDTO | DonorDTO | CourierDTO | AdminUserDTO;

/** Optional filters accepted by the Admin account directory. */
export interface AdminUsersQuery {
  page?: number;
  limit?: number;
  role?: UserRole;
  status?: UserDTO['status'];
  search?: string;
}

/** Body sent when an Admin creates a Courier account. */
export interface CreateCourierPayload {
  fullName: string;
  username: string;
  email: string;
  tempPassword: string;
}

/** Body accepted by the Admin account-status endpoint. */
export interface UpdateUserStatusPayload {
  status: UserDTO['status'];
}

export interface UpdateProfilePayload {
  username?: string;
  city?: string;
  country?: string;
  avatarUrl?: string | null;
  /** Donor only */
  companyName?: string;
  addressText?: string;
  location?: { latitude: number; longitude: number };
}

export interface UpdateEmailPayload {
  newEmail: string;
}

export interface UpdatePasswordPayload {
  newPassword: string;
}

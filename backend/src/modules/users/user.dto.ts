// Shapes user data before sending it to the frontend or another module.
import type { UserDocument, Role, AccountStatus } from './user.model.js';
import type { RecipientDocument } from './recipient.model.js';
import type { DonorDocument } from './donor.model.js';
import type { CourierDocument } from './courier.model.js';
import type { GeoLocation } from '../../shared/dtos/geo-location.dto.js';

interface UserResponseDto {
  id: string;
  username: string;
  email: string;
  role: Role;
  country: string | undefined;
  city: string | undefined;
  status: AccountStatus;
  avatarUrl: string | null;
  createdAt: Date;
}

/** The shape returned for a Recipient — base fields plus tier, notification preferences, and Stripe card status. */
interface RecipientResponseDto extends UserResponseDto {
  tier: string;
  hasStripeCard: boolean;
}

/** The shape returned for a Donor — base fields plus company profile and pickup location. */
interface DonorResponseDto extends UserResponseDto {
  companyName: string;
  taxCode: string;
  addressText: string;
  location: GeoLocation;
}

/** The shape returned for a Courier — base account fields plus their full name. */
interface CourierResponseDto extends UserResponseDto {
  fullName: string;
}

interface CreateUserRequestDto {
  username: string;
  email: string;
  password: string;
  role?: Role;
  country?: string;
  city?: string;
}

function toUserResponseDto(user: UserDocument | null): UserResponseDto | null {
  if (!user) return null;

  return {
    id: String(user._id),
    username: user.username,
    email: user.email,
    role: user.role,
    country: user.country,
    city: user.city,
    status: user.status,
    avatarUrl: user.avatarUrl,
    createdAt: user.createdAt,
  };
}

/**
 * Maps a User plus their Recipient profile to the Recipient response shape.
 * `hasStripeCard` is derived from `stripeCustomerId` — the raw Stripe ID is
 * never sent to the client (`docs/api_design.md` §3).
 */
function toRecipientResponseDto(
  user: UserDocument,
  recipient: Partial<RecipientDocument>
): RecipientResponseDto {
  return {
    ...toUserResponseDto(user),
    tier: recipient.tier,
    hasStripeCard: Boolean(recipient.stripeCustomerId),
  };
}

/** Maps a User plus their Donor profile to the Donor response shape. */
function toDonorResponseDto(user: UserDocument, donor: Partial<DonorDocument>): DonorResponseDto {
  return {
    ...toUserResponseDto(user),
    companyName: donor.companyName,
    taxCode: donor.taxCode,
    addressText: donor.addressText,
    location: donor.location,
  };
}

function toCourierResponseDto(
  user: UserDocument,
  courier: Partial<CourierDocument>,
): CourierResponseDto {
  return {
    ...toUserResponseDto(user),
    fullName: courier.fullName || user.username,
  };
}

export {
  toUserResponseDto,
  toRecipientResponseDto,
  toDonorResponseDto,
  toCourierResponseDto,
};
export type {
  UserResponseDto,
  CreateUserRequestDto,
  RecipientResponseDto,
  DonorResponseDto,
  CourierResponseDto,
};

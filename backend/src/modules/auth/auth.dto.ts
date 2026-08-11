// Shapes auth requests and responses; response shaping strips password hashes and internal user fields.
import { z } from 'zod';
import { toUserResponseDto } from '../users/user.dto.js';
import {
  registerRecipientSchema,
  registerDonorSchema,
  loginSchema,
} from './auth.schemas.js';
import type { UserResponseDto } from '../users/user.dto.js';
import type { AuthSession } from './auth.token.service.js';
import type { RecipientDocument } from '../users/recipient.model.js';
import type { DonorDocument } from '../users/donor.model.js';
import type { GeoLocation } from '../../shared/dtos/geo-location.dto.js';

// Derived from the schemas so the validated shape and the DTO can never drift.
type RegisterRecipientRequestDto = z.infer<typeof registerRecipientSchema>;
type RegisterDonorRequestDto = z.infer<typeof registerDonorSchema>;
type LoginRequestDto = z.infer<typeof loginSchema>;

interface RecipientResponseDto extends UserResponseDto {
  tier: string;
  notificationPreferences: unknown[];
  hasStripeCard: boolean;
}

interface DonorResponseDto extends UserResponseDto {
  companyName: string;
  taxCode: string;
  addressText: string;
  location: GeoLocation;
}

interface AuthResponseDto {
  user: UserResponseDto | null;
  token: string;
}

interface RecipientAuthResponseDto {
  user: RecipientResponseDto;
  token: string;
}

interface DonorAuthResponseDto {
  user: DonorResponseDto;
  token: string;
}

function toAuthDto(session: AuthSession): AuthResponseDto {
  return {
    user: toUserResponseDto(session.user),
    token: session.accessToken,
  };
}

function toRecipientAuthDto(
  session: AuthSession,
  recipient: Partial<RecipientDocument>
): RecipientAuthResponseDto {
  return {
    user: {
      ...toUserResponseDto(session.user),
      tier: recipient.tier,
      notificationPreferences: recipient.notificationPreferences || [],
      // docs/api_design.md §3: the raw Stripe customer id is never sent to a client.
      hasStripeCard: Boolean(recipient.stripeCustomerId),
    },
    token: session.accessToken,
  };
}

function toDonorAuthDto(session: AuthSession, donor: Partial<DonorDocument>): DonorAuthResponseDto {
  return {
    user: {
      ...toUserResponseDto(session.user),
      companyName: donor.companyName,
      taxCode: donor.taxCode,
      addressText: donor.addressText,
      location: donor.location,
    },
    token: session.accessToken,
  };
}

export { toAuthDto, toRecipientAuthDto, toDonorAuthDto };
export type {
  RegisterRecipientRequestDto,
  RegisterDonorRequestDto,
  LoginRequestDto,
  AuthResponseDto,
  RecipientAuthResponseDto,
  DonorAuthResponseDto,
};

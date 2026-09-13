// Shapes auth requests and responses; response shaping strips password hashes and internal user fields.
import { z } from 'zod';
import { toUserResponseDto, toRecipientResponseDto, toDonorResponseDto } from '../users/user.dto.js';
import {
  registerRecipientSchema,
  registerDonorSchema,
  loginSchema,
} from './auth.schemas.js';
import type { UserResponseDto, RecipientResponseDto, DonorResponseDto } from '../users/user.dto.js';
import type { AuthSession } from '../security/token.service.js';
import type { RecipientDocument } from '../users/recipient.model.js';
import type { DonorDocument } from '../users/donor.model.js';

// Derived from the schemas so the validated shape and the DTO can never drift.
/** Request body for `POST /auth/register/recipient`. */
type RegisterRecipientRequestDto = z.infer<typeof registerRecipientSchema>;
/** Request body for `POST /auth/register/donor`. */
type RegisterDonorRequestDto = z.infer<typeof registerDonorSchema>;
/** Request body for `POST /auth/login`. */
type LoginRequestDto = z.infer<typeof loginSchema>;

/** Response body for `POST /auth/login`. */
interface AuthResponseDto {
  user: UserResponseDto | null;
  token: string;
}

/** Response body for `POST /auth/register/recipient`. */
interface RecipientAuthResponseDto {
  user: RecipientResponseDto;
  token: string;
}

/** Response body for `POST /auth/register/donor`. */
interface DonorAuthResponseDto {
  user: DonorResponseDto;
  token: string;
}

/**
 * Maps a session to the base auth response, used by login — where the caller
 * could hold any role.
 */
function toAuthDto(session: AuthSession): AuthResponseDto {
  return {
    user: toUserResponseDto(session.user),
    token: session.accessToken,
  };
}

/**
 * Maps a session and a Recipient profile to the registration response.
 * `hasStripeCard` is derived from `stripeCustomerId` — the raw Stripe ID is
 * never sent to the client (`docs/api_design.md` §3). `tier` is always `'STANDARD'` here — a
 * brand-new Recipient can't have an active subscription before their own registration response
 * exists, so no subscription lookup is needed at this call site.
 *
 * @param session - The session just issued for the new user.
 * @param recipient - The newly created Recipient profile.
 */
function toRecipientAuthDto(
  session: AuthSession,
  recipient: Partial<RecipientDocument>
): RecipientAuthResponseDto {
  return {
    // hasStripeCard is derived from stripeCustomerId inside toRecipientResponseDto — the
    // raw Stripe ID is never sent to the client (docs/api_design.md §3).
    // tier is always 'STANDARD' here — a Recipient can't have an active subscription
    // before their account (and this response) even exists.
    user: toRecipientResponseDto(session.user, recipient, 'STANDARD'),
    token: session.accessToken,
  };
}

/**
 * Maps a session and a Donor profile to the registration response.
 *
 * @param session - The session just issued for the new user.
 * @param donor - The newly created Donor profile.
 */
function toDonorAuthDto(session: AuthSession, donor: Partial<DonorDocument>): DonorAuthResponseDto {
  return {
    user: toDonorResponseDto(session.user, donor),
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

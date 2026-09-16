// Contains self-service User profile business rules (get/update profile, change password/email).
import * as userAccountRepository from './user.account.repository.js';
import * as recipientRepository from './recipient.repository.js';
import * as donorRepository from './donor.repository.js';
import { getUserById, duplicateEmailError } from './user.account.service.js';
import { securityInterface } from '../security/security.interface.js';
import { subscriptionInterface } from '../subscriptions/subscription.interface.js';
import { toUserResponseDto, toRecipientResponseDto, toDonorResponseDto } from './user.dto.js';
import type { Role } from './user.types.js';
import type { UpdateUserRequestDto } from './user.schemas.js';
import type { RequestAuth } from './user.types.js';

function donorFieldsRejectedError(): Error {
  const error: Error = new Error('Only Donors can edit company profile fields.');
  error.statusCode = 400;
  return error;
}

/**
 * Fetches the authoritative, role-appropriate profile DTO for `userId` — used
 * by both `getMyProfile` and `updateMyProfile` so they always return the same
 * shape (`docs/api_design.md` §5). For a RECIPIENT, `tier` is derived via
 * `subscriptionInterface.getMySubscriptionStatus` rather than read off the stored
 * `recipient.tier` column (F1, `backend/SUBSCRIPTION.md`).
 */
async function getMyProfileDto(userId: string) {
  const user = await getUserById(userId);

  if (user.role === 'DONOR') {
    const donor = await donorRepository.findDonorByUserId(userId);
    return toDonorResponseDto(user, donor || {});
  }

  if (user.role === 'RECIPIENT') {
    const recipient = await recipientRepository.findRecipientByUserId(userId);
    const { tier } = await subscriptionInterface.getMySubscriptionStatus(userId);
    return toRecipientResponseDto(user, recipient || {}, tier);
  }

  return toUserResponseDto(user);
}

/**
 * Applies a `PATCH /users/me` patch. Donor-only fields (`companyName`,
 * `addressText`, `location`) are rejected with `400` for any other role —
 * the field-level authorization the AC's validation scenario implies.
 */
async function updateUserProfile(userId: string, role: Role, patch: UpdateUserRequestDto) {
  const { companyName, addressText, location, ...baseFields } = patch;
  const hasDonorFields = companyName !== undefined || addressText !== undefined || location !== undefined;

  if (hasDonorFields && role !== 'DONOR') {
    throw donorFieldsRejectedError();
  }

  if (Object.keys(baseFields).length > 0) {
    await userAccountRepository.updateUser(userId, baseFields);
  }

  if (role === 'DONOR' && hasDonorFields) {
    await donorRepository.updateDonor(userId, { companyName, addressText, location });
  }

  return getMyProfileDto(userId);
}

/**
 * Applies a `PATCH /users/me/password` change. No `currentPassword` check —
 * the caller's live session token is treated as sufficient proof of identity
 * (`docs/api_design.md` §5). Revokes the presented token immediately after
 * the hash is stored so a stolen-but-live session dies the moment the
 * credential it relies on changes; no new token is issued, mirroring `logout`.
 */
async function changePassword(userId: string, newPassword: string, auth: RequestAuth): Promise<void> {
  const passwordHash = await securityInterface.hashPassword(newPassword);
  await userAccountRepository.updateUser(userId, { passwordHash });
  await securityInterface.revokeToken({
    userId,
    jti: auth.jti,
    expiresAt: auth.expiresAt,
    reason: 'PASSWORD_CHANGE',
  });
}

/**
 * Applies a `PATCH /users/me/email` change. Uniqueness excludes the
 * requester's own row, so resubmitting the current email succeeds as a
 * no-op instead of a `409` — mirroring `createUser`'s check-then-write
 * pattern, including the `11000` race-condition backstop.
 */
async function changeEmail(userId: string, newEmail: string) {
  const existing = await userAccountRepository.findUserByEmail(newEmail);

  if (existing && String(existing._id) !== String(userId)) {
    throw duplicateEmailError();
  }

  try {
    await userAccountRepository.updateUser(userId, { email: newEmail });
  } catch (error) {
    if (error?.code === 11000) {
      throw duplicateEmailError();
    }

    throw error;
  }

  return getMyProfileDto(userId);
}

export { getMyProfileDto, updateUserProfile, changePassword, changeEmail };

// Contains user business rules and calls the user repositories for database work.
import * as userRepository from './user.repository.js';
import * as recipientRepository from './recipient.repository.js';
import * as donorRepository from './donor.repository.js';
import * as courierRepository from './courier.repository.js';
import { securityInterface } from '../security/security.interface.js';
import { subscriptionInterface } from '../subscriptions/subscription.interface.js';
import { toUserResponseDto, toRecipientResponseDto, toDonorResponseDto } from './user.dto.js';
import type { CreateUserRequestDto } from './user.dto.js';
import type { LoginStateUpdate, RolePageQuery } from './user.repository.js';
import type { UpdateUserRequestDto } from './user.schemas.js';
import type { Role, UserDocument } from './user.model.js';
import type { CourierDocument } from './courier.model.js';
import type { Types } from 'mongoose';

/** The presented token's claims, from `req.auth` (set by `requireAuth`). */
interface RequestAuth {
  jti: string;
  expiresAt: Date;
}

/** The fields an Admin supplies when creating a Courier account (E1). */
interface CreateCourierAccountInput {
  username: string;
  email: string;
  password: string;
  fullName: string;
}

/** A Courier account: the base `USER` row plus its `COURIER` profile. */
interface CourierAccount {
  user: UserDocument;
  courier: CourierDocument;
}

/** One Courier account in a listing; `courier` is null if the profile row is missing. */
interface CourierAccountSummary {
  user: UserDocument;
  courier: CourierDocument | null;
}

/** One page of Courier accounts for the Admin roster. */
interface CourierAccountPage {
  items: CourierAccountSummary[];
  page: number;
  limit: number;
  total: number;
}

interface CreateDonorProfileInput {
  userId: string | Types.ObjectId;
  companyName: string;
  taxCode: string;
  addressText: string;
  location: { latitude: number; longitude: number };
}

function duplicateEmailError(): Error {
  const error: Error = new Error('This email is already registered.');
  error.statusCode = 409;
  return error;
}

async function createUser(payload: CreateUserRequestDto) {
  const existing = await userRepository.findUserByEmail(payload.email);

  if (existing) {
    throw duplicateEmailError();
  }

  try {
    return await userRepository.createUser({
      username: payload.username,
      email: payload.email,
      passwordHash: await securityInterface.hashPassword(payload.password),
      role: payload.role || 'RECIPIENT',
      // AFF operates in Vietnam; the registration forms do not ask for a country.
      country: payload.country || 'Vietnam',
      city: payload.city,
    });
  } catch (error) {
    // Two simultaneous registrations can both pass the check above; the unique
    // index is the real guard, so translate its error into the same 409.
    if (error?.code === 11000) {
      throw duplicateEmailError();
    }

    throw error;
  }
}

async function findUserByEmail(email: string) {
  return userRepository.findUserByEmail(email);
}

async function getUserById(id: string) {
  const user = await userRepository.findUserById(id);

  if (!user) {
    const error: Error = new Error('User not found.');
    error.statusCode = 404;
    throw error;
  }

  return user;
}

async function deleteUser(id: string | Types.ObjectId) {
  await userRepository.deleteUser(id);
}

async function updateLoginState(id: string | Types.ObjectId, state: LoginStateUpdate) {
  await userRepository.updateLoginState(id, state);
}

async function recordFailedLogin(
  id: string | Types.ObjectId,
  windowStartedAfter: Date,
  now: Date,
): Promise<number> {
  const updated =
    (await userRepository.incrementFailedLoginInWindow(id, windowStartedAfter)) ||
    (await userRepository.startFailedLoginWindow(id, now));

  return updated.failedLoginCount;
}

async function lockAccount(id: string | Types.ObjectId, lockedUntil: Date) {
  await userRepository.lockAccount(id, lockedUntil);
}

async function createRecipientProfile(userId: string | Types.ObjectId) {
  return recipientRepository.createRecipient({ userId });
}

async function findRecipientByUserId(userId: string | Types.ObjectId) {
  return recipientRepository.findRecipientByUserId(userId);
}

async function searchRecipientsByEmail(email: string) {
  const normalizedEmail = email.trim().toLowerCase();

  // Avoid exposing a broad Recipient directory from a very short query.
  if (normalizedEmail.length < 3) {
    return [];
  }

  return userRepository.searchActiveRecipientsByEmail(normalizedEmail, 10);
}

async function setRecipientStripeCustomerId(userId: string | Types.ObjectId, stripeCustomerId: string) {
  return recipientRepository.setStripeCustomerId(userId, stripeCustomerId);
}

async function findRecipientByStripeCustomerId(stripeCustomerId: string) {
  return recipientRepository.findRecipientByStripeCustomerId(stripeCustomerId);
}

async function createDonorProfile(input: CreateDonorProfileInput) {
  return donorRepository.createDonor(input);
}

/**
 * Creates a Courier account: the `USER` row, then the `COURIER` profile.
 * Only an Admin reaches this (`POST /admin/couriers`, E1) — there is no
 * public registration path that accepts `role=COURIER`.
 *
 * Both writes live here because this module owns both collections. There is
 * no transaction across them, so a failed profile write deletes the
 * just-created user rather than leaving an orphan `USER` that would block
 * that email address forever. Like the equivalent guard in registration, this
 * is a compensating action, not a transaction: a process crash between the
 * two writes can still orphan a row.
 *
 * @param input - The Admin-supplied account fields; `password` is the
 *   temporary password the Admin sets at creation time.
 * @throws {Error} `409` if the email is already registered.
 */
async function createCourierAccount(
  input: CreateCourierAccountInput,
): Promise<CourierAccount> {
  const user = await createUser({
    username: input.username,
    email: input.email,
    password: input.password,
    role: 'COURIER',
  });

  const userId = String(user._id);

  try {
    const courier = await courierRepository.createCourier({
      userId,
      fullName: input.fullName,
    });

    return { user, courier };
  } catch (error) {
    await userRepository.deleteUser(userId);
    throw error;
  }
}

/**
 * Loads a set of Courier profiles by user id, for a caller joining against
 * Couriers — currently the Admin Delivery table (E11), which needs each
 * assigned Courier's name.
 */
async function findCourierProfilesByUserIds(userIds: string[]) {
  if (userIds.length === 0) return [];

  return courierRepository.findCouriersByUserIds(userIds);
}

/**
 * Loads a set of Donor profiles by user id, for a caller joining against
 * Donors — currently the Courier queue (E2), which needs each Donor's
 * company name and pickup address/location.
 */
async function findDonorsByUserIds(userIds: string[]) {
  if (userIds.length === 0) return [];

  return donorRepository.findDonorsByUserIds(userIds);
}

/**
 * Reads one page of Courier accounts for the Admin roster (E11), pairing each
 * `USER` with its `COURIER` profile in a single follow-up query rather than
 * one per row. An account whose profile row is missing is still listed, with
 * `courier: null`, so a half-written account stays visible to the Admin
 * instead of silently disappearing from oversight.
 */
async function listCouriers(query: RolePageQuery): Promise<CourierAccountPage> {
  const page = await userRepository.findUsersByRole('COURIER', query);

  if (page.items.length === 0) {
    return { ...page, items: [] };
  }

  const profiles = await courierRepository.findCouriersByUserIds(
    page.items.map((user) => String(user._id)),
  );

  const profileByUserId = new Map(
    profiles.map((profile) => [String(profile.userId), profile]),
  );

  return {
    ...page,
    items: page.items.map((user) => ({
      user,
      courier: profileByUserId.get(String(user._id)) ?? null,
    })),
  };
}

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
    await userRepository.updateUser(userId, baseFields);
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
  await userRepository.updateUser(userId, { passwordHash });
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
  const existing = await userRepository.findUserByEmail(newEmail);

  if (existing && String(existing._id) !== String(userId)) {
    throw duplicateEmailError();
  }

  try {
    await userRepository.updateUser(userId, { email: newEmail });
  } catch (error) {
    if (error?.code === 11000) {
      throw duplicateEmailError();
    }

    throw error;
  }

  return getMyProfileDto(userId);
}

async function getDonorByUserId(userId: string | Types.ObjectId) {
  const donor = await donorRepository.findDonorByUserId(userId);
  if (!donor) {
    const error: Error = new Error('Donor profile not found');
    error.statusCode = 404;
    throw error;
  }
  return donor;
}

export {
  createUser,
  findUserByEmail,
  getUserById,
  deleteUser,
  updateLoginState,
  recordFailedLogin,
  lockAccount,
  createRecipientProfile,
  createDonorProfile,
  createCourierAccount,
  listCouriers,
  findCourierProfilesByUserIds,
  findDonorsByUserIds,
  getDonorByUserId,
  findRecipientByUserId,
  searchRecipientsByEmail,
  setRecipientStripeCustomerId,
  findRecipientByStripeCustomerId,
  getMyProfileDto,
  updateUserProfile,
  changePassword,
  changeEmail,
};
export type {
  CreateDonorProfileInput,
  CreateCourierAccountInput,
  CourierAccount,
  CourierAccountSummary,
  CourierAccountPage,
};

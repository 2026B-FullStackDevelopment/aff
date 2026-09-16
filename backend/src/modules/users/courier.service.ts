// Contains Courier account business rules and calls the courier repository for database work.
import * as courierRepository from './courier.repository.js';
import * as userAccountRepository from './user.account.repository.js';
import * as userAccountService from './user.account.service.js';
import * as userDirectoryRepository from './user.directory.repository.js';
import type {
  CourierAccount, CourierAccountPage, CreateCourierAccountInput, RolePageQuery,
} from './user.types.js';

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
  const user = await userAccountService.createUser({
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
    await userAccountRepository.deleteUser(userId);
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
 * Reads one page of Courier accounts for the Admin roster (E11), pairing each
 * `USER` with its `COURIER` profile in a single follow-up query rather than
 * one per row. An account whose profile row is missing is still listed, with
 * `courier: null`, so a half-written account stays visible to the Admin
 * instead of silently disappearing from oversight.
 */
async function listCouriers(query: RolePageQuery): Promise<CourierAccountPage> {
  const page = await userDirectoryRepository.findUsersByRole('COURIER', query);

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

export { createCourierAccount, findCourierProfilesByUserIds, listCouriers };
export type {
  CreateCourierAccountInput, CourierAccount, CourierAccountSummary, CourierAccountPage,
} from './user.types.js';

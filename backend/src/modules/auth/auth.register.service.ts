// Contains the registration business rules for recipients and donors.
import { userInterface } from '../users/user.interface.js';
import { issueSession } from './auth.token.service.js';
import type { AuthSession } from './auth.token.service.js';
import type { RegisterRecipientRequestDto, RegisterDonorRequestDto } from './auth.dto.js';
import type { RecipientDocument } from '../users/recipient.model.js';
import type { DonorDocument } from '../users/donor.model.js';

/** The result of a successful Recipient registration: the new session plus the created profile. */
interface RecipientRegistration {
  session: AuthSession;
  recipient: RecipientDocument;
}

/** The result of a successful Donor registration: the new session plus the created profile. */
interface DonorRegistration {
  session: AuthSession;
  donor: DonorDocument;
}

// MongoDB gives no transaction here, so if the profile write fails the new user
// is deleted to avoid an orphan that would block the email forever.
/**
 * Runs `create`, and if it fails, deletes the just-created user before
 * rethrowing. Without this, a failed profile write would leave a `USER` row
 * with no matching `RECIPIENT`/`DONOR` row — an orphan that permanently
 * blocks that email address from ever registering again. This is a
 * compensating action, not a transaction: a process crash between the two
 * writes can still leave an orphan; that's a known, accepted gap.
 *
 * @param userId - The just-created user's ID, used only for the rollback delete.
 * @param create - The profile-creation call to attempt.
 */
async function createProfileOrRollback<T>(userId: string, create: () => Promise<T>): Promise<T> {
  try {
    return await create();
  } catch (error) {
    await userInterface.deleteUser(userId);
    throw error;
  }
}

/**
 * Registers a new Recipient: creates the `USER` row, then the `RECIPIENT`
 * profile, then issues a session. Story #47.
 *
 * @param payload - Validated registration fields.
 * @throws {Error} `409` if the email is already registered.
 */
async function registerRecipient(
  payload: RegisterRecipientRequestDto
): Promise<RecipientRegistration> {
  const user = await userInterface.createUser({
    username: payload.username,
    email: payload.email,
    password: payload.password,
    role: 'RECIPIENT',
    city: payload.city,
  });

  const userId = String(user._id);
  const recipient = await createProfileOrRollback(userId, () =>
    userInterface.createRecipientProfile(userId)
  );

  return { session: issueSession(user), recipient };
}

/**
 * Registers a new Donor: creates the `USER` row (using the company name as
 * the username, since `USER.username` is required but the donor form has no
 * separate username field), then the `DONOR` profile, then issues a session.
 * Story #48.
 *
 * @param payload - Validated registration fields, including the pickup
 *   coordinates the client resolved via OSM Nominatim.
 * @throws {Error} `409` if the email is already registered.
 */
async function registerDonor(payload: RegisterDonorRequestDto): Promise<DonorRegistration> {
  const user = await userInterface.createUser({
    // USER.username is required; the donor form collects a company name instead.
    username: payload.companyName,
    email: payload.email,
    password: payload.password,
    role: 'DONOR',
    city: payload.city,
  });

  const userId = String(user._id);
  const donor = await createProfileOrRollback(userId, () =>
    userInterface.createDonorProfile({
      userId,
      companyName: payload.companyName,
      taxCode: payload.taxCode,
      addressText: payload.addressText,
      location: payload.location,
    })
  );

  return { session: issueSession(user), donor };
}

export { registerRecipient, registerDonor };
export type { RecipientRegistration, DonorRegistration };

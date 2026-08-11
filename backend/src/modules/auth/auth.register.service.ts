// Contains the registration business rules for recipients and donors.
import { userInterface } from '../users/user.interface.js';
import { issueSession } from './auth.token.service.js';
import type { AuthSession } from './auth.token.service.js';
import type { RegisterRecipientRequestDto, RegisterDonorRequestDto } from './auth.dto.js';
import type { RecipientDocument } from '../users/recipient.model.js';
import type { DonorDocument } from '../users/donor.model.js';

interface RecipientRegistration {
  session: AuthSession;
  recipient: RecipientDocument;
}

interface DonorRegistration {
  session: AuthSession;
  donor: DonorDocument;
}

// MongoDB gives no transaction here, so if the profile write fails the new user
// is deleted to avoid an orphan that would block the email forever.
async function createProfileOrRollback<T>(userId: string, create: () => Promise<T>): Promise<T> {
  try {
    return await create();
  } catch (error) {
    await userInterface.deleteUser(userId);
    throw error;
  }
}

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

// Contains the registration business rules for recipients and donors.
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

async function registerRecipient(
  _payload: RegisterRecipientRequestDto
): Promise<RecipientRegistration> {
  throw new Error('registerRecipient is not implemented yet.');
}

async function registerDonor(_payload: RegisterDonorRequestDto): Promise<DonorRegistration> {
  throw new Error('registerDonor is not implemented yet.');
}

export { registerRecipient, registerDonor };
export type { RecipientRegistration, DonorRegistration };

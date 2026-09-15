// Defines internal result types for Recipient and Donor registration.
import type { AuthSession } from '../security/token.types.js';
import type { DonorDocument } from '../users/donor.types.js';
import type { RecipientDocument } from '../users/recipient.types.js';

interface RecipientRegistration { session: AuthSession; recipient: RecipientDocument }
interface DonorRegistration { session: AuthSession; donor: DonorDocument }

export type { RecipientRegistration, DonorRegistration };
